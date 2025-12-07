import React from 'react';
import { WORKOUT_ICONS, WorkoutIconType } from './workout-icons';

interface IconPickerProps {
  value: WorkoutIconType | null;
  onChange: (icon: WorkoutIconType | null) => void;
}

const IconPicker: React.FC<IconPickerProps> = ({ value, onChange }) => {
  const iconTypes = Object.keys(WORKOUT_ICONS) as WorkoutIconType[];

  return (
    <div>
      <label className="block text-xl font-semibold mb-2 template-label">
        Иконка дня
      </label>
      <div className="grid grid-cols-4 gap-2">
        {/* Кнопка "без иконки" */}
        <button
          type="button"
          onClick={() => onChange(null)}
          className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all icon-picker-btn ${
            value === null
              ? 'icon-picker-selected'
              : 'bg-white/5 hover:bg-white/10'
          }`}
        >
          <div className="w-8 h-8 flex items-center justify-center text-gray-500">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="9" strokeDasharray="4 2" />
            </svg>
          </div>
          <span className="text-[10px] mt-1 text-gray-400 font-bold">Нет</span>
        </button>

        {iconTypes.map((iconType) => {
          const { component: Icon, label, color } = WORKOUT_ICONS[iconType];
          const isSelected = value === iconType;

          return (
            <button
              key={iconType}
              type="button"
              onClick={() => onChange(iconType)}
              className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all icon-picker-btn ${
                isSelected
                  ? 'icon-picker-selected'
                  : 'bg-white/5 hover:bg-white/10'
              }`}
            >
              <div className="w-8 h-8 flex items-center justify-center" style={{ color }}>
                <Icon size={24} />
              </div>
              <span className="text-[10px] mt-1 text-gray-300 font-bold">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default IconPicker;
