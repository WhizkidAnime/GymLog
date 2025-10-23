import React, { useState, useEffect, useRef } from 'react';

interface RestTimerProps {
  restSeconds: number;
}

export const RestTimer: React.FC<RestTimerProps> = ({ restSeconds }) => {
  const [time, setTime] = useState(restSeconds);
  const [isActive, setIsActive] = useState(false);
  // FIX: Changed type from NodeJS.Timeout to number for browser compatibility
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (isActive && time > 0) {
      intervalRef.current = window.setInterval(() => {
        setTime((prevTime) => prevTime - 1);
      }, 1000);
    } else if (time === 0) {
      setIsActive(false);
      if(intervalRef.current) clearInterval(intervalRef.current);
      // Optional: Add a sound or vibration notification here
    }
    return () => {
      if(intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive, time]);
  
  // Reset timer if restSeconds prop changes
  useEffect(() => {
    setTime(restSeconds);
    setIsActive(false);
  }, [restSeconds]);

  const toggle = () => {
    setIsActive(!isActive);
  };

  const reset = () => {
    setIsActive(false);
    setTime(restSeconds);
    if(intervalRef.current) clearInterval(intervalRef.current);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  return (
    <div className="text-center">
      <div className={`text-2xl font-mono ${isActive ? 'text-blue-500' : ''}`}>
        {formatTime(time)}
      </div>
      <div className="space-x-2 mt-1">
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