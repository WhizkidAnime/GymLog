import React, { useState, useEffect, useRef, useCallback } from 'react';

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
        setState(prev => ({ ...prev, isActive: false, endAt: null, time: 0 }));
        if (intervalRef.current) {
          window.clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        if (storageKey) {
          localStorage.removeItem(storageKey);
        }
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
  }, [isActive, endAt, storageKey]);

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
        return { time: prev.time, isActive: false, endAt: null };
      }

      const nextEndAt = Date.now() + prev.time * 1000;
      persist({ endAt: nextEndAt, isActive: true }, prev.time);
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
        return { time: 0, isActive: false, endAt: null };
      }

      if (prev.isActive) {
        const nextEndAt = Date.now() + next * 1000;
        persist({ endAt: nextEndAt, isActive: true }, next);
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
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => adjustTime(-30)}
          disabled={time <= 0 && !isActive}
          className="w-7 h-7 flex items-center justify-center rounded border border-white/30 text-white hover:bg-white/10 disabled:opacity-50"
        >-</button>
        <div className={`text-2xl font-mono min-w-[4ch] text-center ${isActive ? 'text-blue-500' : ''}`}>
          {formatTime(time)}
        </div>
        <button
          onClick={() => adjustTime(30)}
          className="w-7 h-7 flex items-center justify-center rounded border border-white/30 text-white hover:bg-white/10"
        >+</button>
      </div>
      <div className="mt-1 flex items-center justify-center gap-2">
        <button onClick={toggle} className="text-xs px-2 py-1 rounded bg-blue-500 text-white">
          {isActive ? 'Пауза' : 'Старт'}
        </button>
        <button onClick={reset} className="text-xs px-2 py-1 rounded bg-gray-300">
          Сброс
        </button>
      </div>
    </div>
  );
};