import React from 'react';
import { WORKOUT_ICONS, WorkoutIconType } from './workout-icons';
import { useI18n } from '../hooks/use-i18n';

interface WorkoutIconPickerModalProps {
  open: boolean;
  value: WorkoutIconType | null;
  onClose: () => void;
  onChange: (icon: WorkoutIconType | null) => void;
}

const WorkoutIconPickerModal: React.FC<WorkoutIconPickerModalProps> = ({
  open,
  value,
  onClose,
  onChange,
}) => {
  const { t } = useI18n();
  
  if (!open) return null;

  const iconTypes = Object.keys(WORKOUT_ICONS) as WorkoutIconType[];

  const handleSelect = (icon: WorkoutIconType | null) => {
    onChange(icon);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="glass card-dark p-4 rounded-xl w-[90%] max-w-sm mx-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-white mb-4 text-center">
          {t.workoutIconPicker.title}
        </h2>
        <div className="grid grid-cols-4 gap-2">
          {/* Кнопка "без иконки" */}
          <button
            type="button"
            onClick={() => handleSelect(null)}
            className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all ${
              value === null
                ? 'bg-white/20 ring-2 ring-white/50'
                : 'bg-white/5 hover:bg-white/10'
            }`}
          >
            <div className="w-10 h-10 flex items-center justify-center text-gray-500">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="9" strokeDasharray="4 2" />
              </svg>
            </div>
            <span className="text-[10px] mt-1 text-gray-400">{t.workoutIconPicker.none}</span>
          </button>

          {iconTypes.map((iconType) => {
            const { component: Icon, label } = WORKOUT_ICONS[iconType];
            const isSelected = value === iconType;

            return (
              <button
                key={iconType}
                type="button"
                onClick={() => handleSelect(iconType)}
                className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all ${
                  isSelected
                    ? 'bg-white/20 ring-2 ring-white/50'
                    : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                <div className="w-10 h-10 flex items-center justify-center">
                  <Icon size={28} />
                </div>
                <span className="text-[10px] mt-1 text-gray-300">{label}</span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full py-2 text-gray-400 hover:text-white transition-colors"
        >
          {t.common.cancel}
        </button>
      </div>
    </div>
  );
};

export default WorkoutIconPickerModal;
