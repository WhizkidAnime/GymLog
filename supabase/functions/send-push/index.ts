/// <reference path="./env.d.ts" />
// Supabase Edge Function для отправки push-уведомлений
// Запускается по cron каждую минуту или через webhook

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('PROJECT_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY')!;
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@gymlog.app';

interface ScheduledTimer {
  id: string;
  user_id: string;
  exercise_id: string | null;
  fire_at: string;
  title: string;
  body: string;
  sent: boolean;
}

interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

// Кодирование в Base64 URL-safe
function base64UrlEncode(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Декодирование из Base64 URL-safe
function base64UrlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const rawData = atob(base64 + padding);
  return new Uint8Array([...rawData].map((c) => c.charCodeAt(0)));
}

// Создание JWT для VAPID
async function createVapidJwt(audience: string): Promise<string> {
  const header = { alg: 'ES256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60, // 12 часов
    sub: VAPID_SUBJECT,
  };

  const headerB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Строим JWK из публичного и приватного VAPID-ключей.
  // VAPID_PUBLIC_KEY сгенерирован web-push и представляет собой
  // несжатый публичный ключ: 0x04 || X(32) || Y(32)
  const publicKeyBytes = base64UrlDecode(VAPID_PUBLIC_KEY);
  if (publicKeyBytes.length !== 65 || publicKeyBytes[0] !== 4) {
    throw new Error('Invalid VAPID_PUBLIC_KEY format');
  }

  const xBytes = publicKeyBytes.slice(1, 33);
  const yBytes = publicKeyBytes.slice(33, 65);

  const jwk: JsonWebKey = {
    kty: 'EC',
    crv: 'P-256',
    x: base64UrlEncode(xBytes),
    y: base64UrlEncode(yBytes),
    d: VAPID_PRIVATE_KEY,
  };

  const privateKey = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    new TextEncoder().encode(unsignedToken)
  );

  const signatureArray = new Uint8Array(signature);
  const rawSignature = base64UrlEncode(signatureArray);

  return `${unsignedToken}.${rawSignature}`;
}

// Отправка push-уведомления
async function sendPushNotification(
  subscription: PushSubscription,
  payload: { title: string; body: string; data?: Record<string, unknown> }
): Promise<boolean> {
  try {
    const url = new URL(subscription.endpoint);
    const audience = `${url.protocol}//${url.host}`;

    const jwt = await createVapidJwt(audience);

    // Отправляем push без payload (данные возьмёт Service Worker по умолчанию).
    // Это позволяет не реализовывать шифрование содержимого Web Push.
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        TTL: '86400',
        Authorization: `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`,
      },
    });

    if (!response.ok) {
      console.error(`Push failed: ${response.status} ${await response.text()}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending push:', error);
    return false;
  }
}

serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Получаем таймеры, которые должны сработать
    const now = new Date().toISOString();
    const { data: timers, error: timersError } = await supabase
      .from('scheduled_timers')
      .select('*')
      .eq('sent', false)
      .lte('fire_at', now)
      .limit(100);

    if (timersError) {
      console.error('Error fetching timers:', timersError);
      return new Response(JSON.stringify({ error: 'Failed to fetch timers' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!timers || timers.length === 0) {
      return new Response(JSON.stringify({ message: 'No timers to process' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const results: { timerId: string; success: boolean }[] = [];

    for (const timer of timers as ScheduledTimer[]) {
      // Получаем подписки пользователя
      const { data: subscriptions, error: subsError } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', timer.user_id);

      if (subsError || !subscriptions || subscriptions.length === 0) {
        console.log(`No subscriptions for user ${timer.user_id}`);
        // Помечаем как отправленное, чтобы не пытаться снова
        await supabase
          .from('scheduled_timers')
          .update({ sent: true })
          .eq('id', timer.id);
        results.push({ timerId: timer.id, success: false });
        continue;
      }

      // Отправляем уведомление на все устройства пользователя
      let anySent = false;
      for (const sub of subscriptions as PushSubscription[]) {
        const success = await sendPushNotification(sub, {
          title: timer.title,
          body: timer.body,
          data: {
            type: 'timer',
            exerciseId: timer.exercise_id,
          },
        });
        if (success) anySent = true;
      }

      // Помечаем таймер как отправленный
      await supabase
        .from('scheduled_timers')
        .update({ sent: true })
        .eq('id', timer.id);

      results.push({ timerId: timer.id, success: anySent });
    }

    return new Response(
      JSON.stringify({
        processed: results.length,
        results,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
