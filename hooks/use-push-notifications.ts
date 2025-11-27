import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

// VAPID публичный ключ - нужно заменить на свой
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

if (import.meta.env.DEV) {
  console.log('[PUSH] VAPID_PUBLIC_KEY exists:', !!VAPID_PUBLIC_KEY);
}

interface PushSubscriptionState {
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  permission: NotificationPermission | 'default';
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const { user } = useAuth();
  const [state, setState] = useState<PushSubscriptionState>({
    isSupported: false,
    isSubscribed: false,
    isLoading: true,
    permission: 'default',
  });

  // Проверка поддержки и текущего статуса подписки
  useEffect(() => {
    const checkSupport = async () => {
      const isSupported =
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window;

      if (!isSupported) {
        setState({
          isSupported: false,
          isSubscribed: false,
          isLoading: false,
          permission: 'default',
        });
        return;
      }

      const permission = Notification.permission;

      if (!user) {
        setState({
          isSupported: true,
          isSubscribed: false,
          isLoading: false,
          permission,
        });
        return;
      }

      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        setState({
          isSupported: true,
          isSubscribed: !!subscription,
          isLoading: false,
          permission,
        });
      } catch (error) {
        console.error('Error checking push subscription:', error);
        setState({
          isSupported: true,
          isSubscribed: false,
          isLoading: false,
          permission,
        });
      }
    };

    checkSupport();
  }, [user]);

  // Подписка на push-уведомления
  const subscribe = useCallback(async (): Promise<boolean> => {
    console.log('[PUSH] subscribe called', { hasUser: !!user, hasKey: !!VAPID_PUBLIC_KEY });

    if (!user || !VAPID_PUBLIC_KEY) {
      console.error('User not authenticated or VAPID key missing');
      return false;
    }

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      // Запрашиваем разрешение
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState(prev => ({ ...prev, isLoading: false, permission }));
        return false;
      }

      const registration = await navigator.serviceWorker.ready;

      // Создаём подписку
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });

      const subscriptionJson = subscription.toJSON();

      const db = supabase as any;
      console.log('[PUSH] saving subscription to DB', {
        userId: user.id,
        endpoint: subscriptionJson.endpoint,
      });

      // Сохраняем подписку в Supabase
      const { error } = await db.from('push_subscriptions').upsert(
        {
          user_id: user.id,
          endpoint: subscriptionJson.endpoint!,
          p256dh: subscriptionJson.keys!.p256dh,
          auth: subscriptionJson.keys!.auth,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,endpoint',
        }
      );

      console.log('[PUSH] upsert push_subscriptions result', { hasError: !!error, error });

      if (error) {
        console.error('Error saving subscription:', error);
        setState(prev => ({ ...prev, isLoading: false }));
        return false;
      }

      setState({
        isSupported: true,
        isSubscribed: true,
        isLoading: false,
        permission: 'granted',
      });

      return true;
    } catch (error) {
      console.error('Error subscribing to push:', error);
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  }, [user]);

  // Отписка от push-уведомлений
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();

        // Удаляем подписку из Supabase
        const db = supabase as any;
        await db
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user.id)
          .eq('endpoint', endpoint);
      }

      setState(prev => ({
        ...prev,
        isSubscribed: false,
        isLoading: false,
      }));

      return true;
    } catch (error) {
      console.error('Error unsubscribing from push:', error);
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  }, [user]);

  // Планирование таймера
  const scheduleTimer = useCallback(
    async (
      fireAt: Date,
      exerciseId?: string,
      title = 'Таймер отдыха',
      body = 'Время отдыха закончилось!'
    ): Promise<string | null> => {
      if (!user) return null;

      try {
        const db = supabase as any;
        console.log('[PUSH] scheduleTimer insert', {
          userId: user.id,
          fireAtIso: fireAt.toISOString(),
          exerciseId,
        });

        const { data, error } = await db
          .from('scheduled_timers')
          .insert({
            user_id: user.id,
            exercise_id: exerciseId ?? null,
            fire_at: fireAt.toISOString(),
            title,
            body,
          })
          .select('id')
          .single();

        console.log('[PUSH] scheduleTimer result', { hasError: !!error, data, error });

        if (error) {
          console.error('Error scheduling timer:', error);
          return null;
        }

        return (data as { id: string } | null)?.id ?? null;
      } catch (error) {
        console.error('Error scheduling timer:', error);
        return null;
      }
    },
    [user]
  );

  // Отмена таймера
  const cancelTimer = useCallback(
    async (timerId: string): Promise<boolean> => {
      if (!user) return false;

      try {
        const db = supabase as any;
        const { error } = await db
          .from('scheduled_timers')
          .delete()
          .eq('id', timerId)
          .eq('user_id', user.id);

        if (error) {
          console.error('Error canceling timer:', error);
          return false;
        }

        return true;
      } catch (error) {
        console.error('Error canceling timer:', error);
        return false;
      }
    },
    [user]
  );

  // Отмена таймеров по exercise_id
  const cancelTimersByExercise = useCallback(
    async (exerciseId: string): Promise<boolean> => {
      if (!user) return false;

      try {
        const db = supabase as any;
        const { error } = await db
          .from('scheduled_timers')
          .delete()
          .eq('exercise_id', exerciseId)
          .eq('user_id', user.id)
          .eq('sent', false);

        if (error) {
          console.error('Error canceling timers:', error);
          return false;
        }

        return true;
      } catch (error) {
        console.error('Error canceling timers:', error);
        return false;
      }
    },
    [user]
  );

  return {
    ...state,
    subscribe,
    unsubscribe,
    scheduleTimer,
    cancelTimer,
    cancelTimersByExercise,
  };
}
