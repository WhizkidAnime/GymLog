import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useI18n } from '../hooks/use-i18n';

interface RestTimerProps {
  restSeconds: number;
  exerciseId?: string;
  onAdjustRestSeconds?: (delta: number) => void;
  timerStep?: number;
}

interface TimerState {
  endAt: number | null;
  isActive: boolean;
  restSeconds: number;
  savedAt: number;
}

const getTimerStepFromStorage = (): number => {
  try {
    const saved = localStorage.getItem('settings:timerStep');
    return saved ? Number(saved) : 30;
  } catch {
    return 30;
  }
};

export const RestTimer: React.FC<RestTimerProps> = ({ restSeconds, exerciseId, onAdjustRestSeconds, timerStep: timerStepProp }) => {
  const { t } = useI18n();
  const storageKey = exerciseId ? `rest_timer:${exerciseId}` : undefined;
  const [timerStep, setTimerStep] = useState(() => timerStepProp ?? getTimerStepFromStorage());

  useEffect(() => {
    if (timerStepProp !== undefined) {
      setTimerStep(timerStepProp);
    } else {
      const handleStorage = () => {
        setTimerStep(getTimerStepFromStorage());
      };
      window.addEventListener('storage', handleStorage);
      // Также проверяем при фокусе окна
      const handleFocus = () => {
        setTimerStep(getTimerStepFromStorage());
      };
      window.addEventListener('focus', handleFocus);
      return () => {
        window.removeEventListener('storage', handleStorage);
        window.removeEventListener('focus', handleFocus);
      };
    }
  }, [timerStepProp]);
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
        setState(prev => ({ ...prev, isActive: false, endAt: null, time: restSeconds }));
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
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => adjustTime(-timerStep)}
          disabled={time <= 0 && !isActive}
          className="btn-glass btn-glass-icon-round btn-glass-secondary"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <line x1="3" y1="8" x2="13" y2="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
        <div className={`text-6xl font-mono font-semibold leading-none min-w-[4ch] text-center ${isActive ? 'text-white' : ''}`}>
          {formatTime(time)}
        </div>
        <button
          onClick={() => adjustTime(timerStep)}
          className="btn-glass btn-glass-icon-round btn-glass-secondary"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <line x1="8" y1="3" x2="8" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <line x1="3" y1="8" x2="13" y2="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
      <div className="mt-4 flex items-center justify-center gap-3">
        <button
          onClick={toggle}
          className={`btn-glass btn-glass-icon-lg ${isActive ? 'btn-glass-danger' : 'btn-glass-primary'}`}
        >
          {isActive ? t.timer.stop : t.timer.start}
        </button>
        <button
          onClick={reset}
          className="btn-glass btn-glass-icon-sm btn-glass-secondary"
        >
          {t.timer.reset}
        </button>
      </div>
    </div>
  );
};