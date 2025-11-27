import React, { useState, useEffect, useRef, useCallback } from 'react';
import { usePushNotifications } from '../hooks/use-push-notifications';

interface RestTimerProps {
  restSeconds: number;
  exerciseId?: string;
  onAdjustRestSeconds?: (delta: number) => void;
}

interface TimerState {
  endAt: number | null;
  isActive: boolean;
  restSeconds: number;
  savedAt: number;
}

export const RestTimer: React.FC<RestTimerProps> = ({ restSeconds, exerciseId, onAdjustRestSeconds }) => {
  const storageKey = exerciseId ? `rest_timer:${exerciseId}` : undefined;
  const intervalRef = useRef<number | null>(null);
  const scheduledTimerIdRef = useRef<string | null>(null);
  const { isSubscribed, scheduleTimer, cancelTimersByExercise } = usePushNotifications();
  const prevRestSecondsRef = useRef(restSeconds);
  const latestStateRef = useRef<{ time: number; isActive: boolean; endAt: number | null }>({
    time: restSeconds,
    isActive: false,
    endAt: null,
  });

  const [state, setState] = useState<{ time: number; isActive: boolean; endAt: number | null }>(() => {
    if (!storageKey) {
      return { time: restSeconds, isActive: false, endAt: null };
    }

    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        return { time: restSeconds, isActive: false, endAt: null };
      }

      const parsed = JSON.parse(raw) as TimerState;

      const TTL = 6 * 60 * 60 * 1000;
      if (Date.now() - parsed.savedAt > TTL) {
        localStorage.removeItem(storageKey);
        return { time: restSeconds, isActive: false, endAt: null };
      }

      if (parsed.isActive && parsed.endAt) {
        const remaining = Math.max(0, Math.floor((parsed.endAt - Date.now()) / 1000));
        if (remaining > 0) {
          return { time: remaining, isActive: true, endAt: parsed.endAt };
        } else {
          localStorage.removeItem(storageKey);
          return { time: parsed.restSeconds, isActive: false, endAt: null };
        }
      }

      return { time: parsed.restSeconds, isActive: false, endAt: null };
    } catch (e) {
      console.error('Error restoring timer state:', e);
      return { time: restSeconds, isActive: false, endAt: null };
    }
  });

  const { time, isActive, endAt } = state;

  const persist = useCallback((nextState: { endAt: number | null; isActive: boolean }, nextTime?: number) => {
    if (!storageKey) return;
    try {
      const toSave: TimerState = {
        endAt: nextState.endAt,
        isActive: nextState.isActive,
        restSeconds: nextTime ?? latestStateRef.current.time ?? restSeconds,
        savedAt: Date.now(),
      };
      localStorage.setItem(storageKey, JSON.stringify(toSave));
    } catch (e) {
      console.error('Error persisting timer:', e);
    }
  }, [storageKey, restSeconds]);

  const persistRef = useRef(persist);

  useEffect(() => {
    persistRef.current = persist;
  }, [persist]);

  useEffect(() => {
    latestStateRef.current = { time, isActive, endAt };
  }, [time, isActive, endAt]);

  useEffect(() => {
    if (!isActive || !endAt) {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    let cancelled = false;

    const tick = () => {
      if (cancelled) return;

      const now = Date.now();
      const remainingMs = Math.max(0, endAt - now);
      const remaining = Math.floor(remainingMs / 1000);

      setState(prev => ({ ...prev, time: remaining }));

      if (remaining <= 0) {
        cancelled = true;
        setState(prev => ({ ...prev, isActive: false, endAt: null, time: restSeconds }));
        if (intervalRef.current) {
          window.clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        if (storageKey) {
          localStorage.removeItem(storageKey);
        }
        scheduledTimerIdRef.current = null;
      }
    };

    tick();
    const id = window.setInterval(tick, 1000);
    intervalRef.current = id;

    return () => {
      cancelled = true;
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, endAt, storageKey, restSeconds]);

  useEffect(() => {
    if (!isActive && restSeconds !== prevRestSecondsRef.current) {
      setState(prev => ({ ...prev, time: restSeconds }));
    }
    prevRestSecondsRef.current = restSeconds;
  }, [restSeconds, isActive]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      const { isActive: wasActive, endAt: lastEndAt } = latestStateRef.current;
      if (wasActive && lastEndAt) {
        persistRef.current({ endAt: lastEndAt, isActive: true });
      }
    };
  }, []);

  const toggle = () => {
    setState(prev => {
      if (prev.isActive) {
        persist({ endAt: null, isActive: false }, prev.time);
        if (intervalRef.current) {
          window.clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        // Отменяем запланированное уведомление
        if (exerciseId && isSubscribed) {
          cancelTimersByExercise(exerciseId);
        }
        scheduledTimerIdRef.current = null;
        return { time: prev.time, isActive: false, endAt: null };
      }

      const nextEndAt = Date.now() + prev.time * 1000;
      persist({ endAt: nextEndAt, isActive: true }, prev.time);
      
      // Планируем push-уведомление
      if (exerciseId && isSubscribed) {
        const fireAt = new Date(nextEndAt);
        scheduleTimer(fireAt, exerciseId).then(id => {
          scheduledTimerIdRef.current = id;
        });
      }
      
      return { time: prev.time, isActive: true, endAt: nextEndAt };
    });
  };

  const reset = () => {
    setState({ time: restSeconds, isActive: false, endAt: null });
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (storageKey) {
      localStorage.removeItem(storageKey);
    }
    // Отменяем запланированное уведомление
    if (exerciseId && isSubscribed) {
      cancelTimersByExercise(exerciseId);
    }
    scheduledTimerIdRef.current = null;
  };

  const adjustTime = (delta: number) => {
    setState(prev => {
      const next = Math.max(0, prev.time + delta);

      if (next === 0) {
        persist({ endAt: null, isActive: false }, 0);
        if (intervalRef.current) {
          window.clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        // Отменяем запланированное уведомление
        if (exerciseId && isSubscribed) {
          cancelTimersByExercise(exerciseId);
        }
        scheduledTimerIdRef.current = null;
        return { time: 0, isActive: false, endAt: null };
      }

      if (prev.isActive) {
        const nextEndAt = Date.now() + next * 1000;
        persist({ endAt: nextEndAt, isActive: true }, next);
        
        // Обновляем push-уведомление с новым временем
        if (exerciseId && isSubscribed) {
          cancelTimersByExercise(exerciseId);
          const fireAt = new Date(nextEndAt);
          scheduleTimer(fireAt, exerciseId).then(id => {
            scheduledTimerIdRef.current = id;
          });
        }
        
        return { time: next, isActive: true, endAt: nextEndAt };
      }

      persist({ endAt: null, isActive: false }, next);
      return { time: next, isActive: false, endAt: null };
    });

    onAdjustRestSeconds?.(delta);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => adjustTime(-30)}
          disabled={time <= 0 && !isActive}
          className="btn-glass btn-glass-icon-round btn-glass-secondary"
        >-</button>
        <div className={`text-6xl font-mono font-semibold leading-none min-w-[4ch] text-center ${isActive ? 'text-white' : ''}`}>
          {formatTime(time)}
        </div>
        <button
          onClick={() => adjustTime(30)}
          className="btn-glass btn-glass-icon-round btn-glass-secondary"
        >+</button>
      </div>
      <div className="mt-4 flex items-center justify-center gap-3">
        <button
          onClick={toggle}
          className={`btn-glass btn-glass-icon-lg ${isActive ? 'btn-glass-danger' : 'btn-glass-primary'}`}
        >
          {isActive ? 'Стоп' : 'Старт'}
        </button>
        <button
          onClick={reset}
          className="btn-glass btn-glass-icon-sm btn-glass-secondary"
        >
          Сброс
        </button>
      </div>
    </div>
  );
};