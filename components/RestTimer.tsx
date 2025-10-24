import React, { useState, useEffect, useRef } from 'react';

interface RestTimerProps {
  restSeconds: number;
  // Используем уникальный идентификатор упражнения, чтобы сохранять состояние таймера
  exerciseId?: string;
  onAdjustRestSeconds?: (delta: number) => void;
}

export const RestTimer: React.FC<RestTimerProps> = ({ restSeconds, exerciseId, onAdjustRestSeconds }) => {
  const storageKey = exerciseId ? `rest_timer:${exerciseId}` : undefined;

  const [time, setTime] = useState(restSeconds);
  const [isActive, setIsActive] = useState(false);
  const [endAt, setEndAt] = useState<number | null>(null);
  // FIX: Changed type from NodeJS.Timeout to number for browser compatibility
  const intervalRef = useRef<number | null>(null);
  const prevRestSecondsRef = useRef(restSeconds);

  useEffect(() => {
    if (isActive && endAt) {
      // Тикаем от целевого времени, чтобы не зависеть от фонового состояния вкладки
      const tick = () => {
        const now = Date.now();
        const remainingMs = Math.max(0, endAt - now);
        const remaining = Math.floor(remainingMs / 1000);
        setTime(remaining);
        if (remaining <= 0) {
          setIsActive(false);
          setEndAt(null);
          if (intervalRef.current) window.clearInterval(intervalRef.current);
        }
      };
      tick();
      intervalRef.current = window.setInterval(tick, 1000);
    }
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [isActive, endAt]);
  
  // Восстановление состояния из localStorage при маунте/смене упражнения
  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { endAt: number | null; isActive: boolean; restSeconds: number; savedAt: number };
      // TTL 6 часов
      if (Date.now() - parsed.savedAt > 6 * 60 * 60 * 1000) {
        localStorage.removeItem(storageKey);
        return;
      }
      const baseRest = parsed.restSeconds ?? restSeconds;
      if (parsed.isActive && parsed.endAt) {
        const remaining = Math.max(0, Math.floor((parsed.endAt - Date.now()) / 1000));
        setIsActive(remaining > 0);
        setEndAt(remaining > 0 ? parsed.endAt : null);
        setTime(remaining > 0 ? remaining : baseRest);
      } else {
        setIsActive(false);
        setEndAt(null);
        setTime(baseRest);
      }
    } catch {
      // ignore
    }
  }, [storageKey, restSeconds]);

  // Обновляем базовое время только при изменении restSeconds извне
  useEffect(() => {
    if (!isActive && restSeconds !== prevRestSecondsRef.current) {
      setTime(restSeconds);
    }
    prevRestSecondsRef.current = restSeconds;
  }, [restSeconds, isActive]);

  const persist = (next: { endAt: number | null; isActive: boolean }) => {
    if (!storageKey) return;
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ endAt: next.endAt, isActive: next.isActive, restSeconds, savedAt: Date.now() })
      );
    } catch {
      // ignore quota errors
    }
  };

  const toggle = () => {
    if (isActive) {
      setIsActive(false);
      setEndAt(null);
      persist({ endAt: null, isActive: false });
      return;
    }
    const nextEndAt = Date.now() + time * 1000;
    setIsActive(true);
    setEndAt(nextEndAt);
    persist({ endAt: nextEndAt, isActive: true });
  };

  const reset = () => {
    setIsActive(false);
    setEndAt(null);
    setTime(restSeconds);
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (storageKey) localStorage.removeItem(storageKey);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  const adjustTime = (delta: number) => {
    const next = Math.max(0, time + delta);
    if (next === time) {
      onAdjustRestSeconds?.(delta);
      return;
    }

    setTime(next);

    if (next === 0) {
      setIsActive(false);
      setEndAt(null);
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      persist({ endAt: null, isActive: false });
    } else if (isActive) {
      const nextEndAt = Date.now() + next * 1000;
      setEndAt(nextEndAt);
      persist({ endAt: nextEndAt, isActive: true });
    }

    onAdjustRestSeconds?.(delta);
  };

  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => adjustTime(-30)}
          disabled={time <= 0 && !isActive}
          className="w-10 h-10 text-lg flex items-center justify-center rounded border border-white/30 text-white hover:bg-white/10 disabled:opacity-50"
        >-</button>
        <div className={`text-4xl sm:text-5xl font-mono min-w-[5ch] text-center ${isActive ? 'text-blue-500' : ''}`}>
          {formatTime(time)}
        </div>
        <button
          onClick={() => adjustTime(30)}
          className="w-10 h-10 text-lg flex items-center justify-center rounded border border-white/30 text-white hover:bg-white/10"
        >+</button>
      </div>
      <div className="mt-1 flex items-center justify-center gap-2">
        <button onClick={toggle} className="text-xs px-2 py-1 rounded bg-blue-500 text-black">
          {isActive ? 'Пауза' : 'Старт'}
        </button>
        <button onClick={reset} className="text-xs px-2 py-1 rounded bg-red-500 text-black hover:bg-red-600">
          Сброс
        </button>
      </div>
    </div>
  );
};