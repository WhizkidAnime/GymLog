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

  // Импортируем приватный ключ
  const privateKeyData = base64UrlDecode(VAPID_PRIVATE_KEY);
  const privateKey = await crypto.subtle.importKey(
    'raw',
    privateKeyData,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  // Подписываем
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    new TextEncoder().encode(unsignedToken)
  );

  // Преобразуем DER в raw формат (64 байта)
  const signatureArray = new Uint8Array(signature);
  let r: Uint8Array, s: Uint8Array;

  if (signatureArray.length === 64) {
    r = signatureArray.slice(0, 32);
    s = signatureArray.slice(32, 64);
  } else {
    // DER формат
    const rLen = signatureArray[3];
    const rStart = 4 + (rLen > 32 ? 1 : 0);
    r = signatureArray.slice(rStart, rStart + 32);
    const sStart = rStart + 32 + 2 + (signatureArray[rStart + 33] > 32 ? 1 : 0);
    s = signatureArray.slice(sStart, sStart + 32);
  }

  const rawSignature = new Uint8Array(64);
  rawSignature.set(r.length > 32 ? r.slice(-32) : r, 32 - Math.min(r.length, 32));
  rawSignature.set(s.length > 32 ? s.slice(-32) : s, 64 - Math.min(s.length, 32));

  return `${unsignedToken}.${base64UrlEncode(rawSignature)}`;
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

    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Encoding': 'aes128gcm',
        TTL: '86400',
        Authorization: `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`,
      },
      body: JSON.stringify(payload),
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
