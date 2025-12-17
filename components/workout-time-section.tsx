import React, { useState } from 'react';

interface WorkoutTimeSectionProps {
  startTime: string | null;
  endTime: string | null;
  onUpdateStartTime: (time: string) => void;
  onUpdateEndTime: (time: string) => void;
  onClear: () => void;
}

const formatTime = (isoString: string | null): string => {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

const formatDuration = (start: string, end: string): string => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffMs = endDate.getTime() - startDate.getTime();
  
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
  
  if (hours > 0) {
    return `${hours}ч ${minutes}м ${seconds}с`;
  }
  if (minutes > 0) {
    return `${minutes}м ${seconds}с`;
  }
  return `${seconds}с`;
};

const toInputValue = (isoString: string | null): string => {
  if (!isoString) return '';
  const date = new Date(isoString);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const fromInputValue = (timeStr: string, baseDate: string | null): string => {
  const base = baseDate ? new Date(baseDate) : new Date();
  const [hours, minutes, seconds] = timeStr.split(':').map(Number);
  base.setHours(hours, minutes, seconds || 0, 0);
  return base.toISOString();
};

export const WorkoutTimeSection: React.FC<WorkoutTimeSectionProps> = ({
  startTime,
  endTime,
  onUpdateStartTime,
  onUpdateEndTime,
  onClear,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [startValue, setStartValue] = useState('');
  const [endValue, setEndValue] = useState('');

  if (!startTime && !endTime) return null;

  const handleStartEditing = () => {
    setStartValue(toInputValue(startTime));
    setEndValue(toInputValue(endTime));
    setIsEditing(true);
  };

  const handleSave = () => {
    if (startValue && startTime) {
      onUpdateStartTime(fromInputValue(startValue, startTime));
    }
    if (endValue && endTime) {
      onUpdateEndTime(fromInputValue(endValue, endTime));
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  return (
    <div className="glass card-dark p-4 space-y-2">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-white">Время тренировки</h2>
        <div className="flex items-center gap-1">
          {!isEditing && (
            <button
              type="button"
              onClick={handleStartEditing}
              className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
              title="Редактировать время"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-gray-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </button>
          )}
          <button
            type="button"
            onClick={onClear}
            className="p-1.5 rounded-full hover:bg-red-500/20 transition-colors"
            title="Удалить время"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>
      <div className="text-sm text-gray-300 space-y-2">
        {startTime && (
          <div className="flex justify-between items-center">
            <span>Начало:</span>
            {isEditing ? (
              <input
                type="time"
                step="1"
                value={startValue}
                onChange={(e) => setStartValue(e.target.value)}
                className="bg-white/10 text-green-400 font-mono text-sm rounded px-2 py-1 focus:outline-none focus:bg-white/20"
              />
            ) : (
              <span className="text-green-400 font-mono">{formatTime(startTime)}</span>
            )}
          </div>
        )}
        {endTime && (
          <div className="flex justify-between items-center">
            <span>Конец:</span>
            {isEditing ? (
              <input
                type="time"
                step="1"
                value={endValue}
                onChange={(e) => setEndValue(e.target.value)}
                className="bg-white/10 text-red-400 font-mono text-sm rounded px-2 py-1 focus:outline-none focus:bg-white/20"
              />
            ) : (
              <span className="text-red-400 font-mono">{formatTime(endTime)}</span>
            )}
          </div>
        )}
        {isEditing && (
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleCancel}
              className="px-3 py-1 rounded bg-white/10 hover:bg-white/20 text-gray-300 text-sm transition-colors"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-3 py-1 rounded bg-green-600 hover:bg-green-700 text-white text-sm transition-colors"
            >
              Сохранить
            </button>
          </div>
        )}
        {!isEditing && startTime && endTime && (
          <div className="flex justify-between pt-2 border-t border-white/10">
            <span>Длительность:</span>
            <span className="text-yellow-400 font-mono">{formatDuration(startTime, endTime)}</span>
          </div>
        )}
      </div>
    </div>
  );
};
