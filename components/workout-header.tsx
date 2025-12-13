import React from 'react';
import { BackButton } from './back-button';
import { formatDateForDisplay } from '../utils/date-helpers';
import { WORKOUT_ICONS, WorkoutIconType } from './workout-icons';
import { useI18n } from '../hooks/use-i18n';

interface WorkoutHeaderProps {
  normalizedDate: string;
  workoutName: string;
  isEditingName: boolean;
  editNameValue: string;
  isSavingWorkoutName: boolean;
  isScrolling: boolean;
  inputRef: React.RefObject<HTMLInputElement>;
  onStartEditName: () => void;
  onChangeEditName: (value: string) => void;
  onSaveEditName: () => void;
  onCancelEditName: () => void;
  actionsRef: React.RefObject<HTMLDivElement>;
  actionsBtnRef: React.RefObject<HTMLButtonElement>;
  onToggleActions: () => void;
  workoutIcon?: WorkoutIconType | null;
  editIconValue?: WorkoutIconType | null;
  onOpenIconPicker?: () => void;
}

export const WorkoutHeader: React.FC<WorkoutHeaderProps> = ({
  normalizedDate,
  workoutName,
  isEditingName,
  editNameValue,
  isSavingWorkoutName,
  isScrolling,
  inputRef,
  onStartEditName,
  onChangeEditName,
  onSaveEditName,
  onCancelEditName,
  actionsRef,
  actionsBtnRef,
  onToggleActions,
  workoutIcon,
  editIconValue,
  onOpenIconPicker,
}) => {
  const { t } = useI18n();
  const displayIcon = isEditingName ? editIconValue : workoutIcon;
  const iconData = displayIcon ? WORKOUT_ICONS[displayIcon] : null;
  return (
    <div className={`glass card-dark p-4 flex items-center gap-4 header-container ${isScrolling ? 'scrolling' : ''}`}>
      <BackButton normalizedDate={normalizedDate} className="shrink-0" />
      <div className="flex-1 text-center">
        {!isEditingName ? (
          <div className="flex items-center justify-center gap-2">
            {iconData && (
              <div className="shrink-0 w-10 h-10 flex items-center justify-center">
                <iconData.component size={32} />
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-white">{workoutName}</h1>
              <p className="text-md transition-all duration-300 workout-date-text">
                {t.workoutHeader.date}: {formatDateForDisplay(normalizedDate)}
              </p>
            </div>
            <button
              onClick={onStartEditName}
              className="shrink-0 p-1.5 rounded-full hover:bg-white/10 transition-colors"
              title={t.common.edit || 'Edit'}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 w-full">
            <div className="flex items-center gap-2">
              {/* Кнопка выбора иконки */}
              <button
                type="button"
                onClick={onOpenIconPicker}
                disabled={isSavingWorkoutName}
                className="shrink-0 w-12 h-12 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50"
                title={t.iconPicker.title}
              >
                {iconData ? (
                  <iconData.component size={28} />
                ) : (
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400">
                    <circle cx="12" cy="12" r="9" strokeDasharray="4 2" />
                    <path d="M12 8v8M8 12h8" />
                  </svg>
                )}
              </button>
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={editNameValue}
                  onChange={event => onChangeEditName(event.target.value)}
                  disabled={isSavingWorkoutName}
                  className="w-full bg-white/10 text-lg font-bold text-white placeholder:text-gray-500 focus:outline-none focus:bg-white/20 rounded-md px-3 pr-9 py-2 transition-colors disabled:opacity-70"
                  placeholder={t.workout.emptyState?.title || 'Workout name'}
                />
                {editNameValue && (
                  <button
                    type="button"
                    onClick={() => onChangeEditName('')}
                    aria-label={t.common.clear}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-white/10 text-gray-300"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      width="16"
                      height="16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={onSaveEditName}
                disabled={isSavingWorkoutName}
                className="shrink-0 p-1.5 rounded-full hover:bg-green-500/20 transition-colors disabled:opacity-50"
                title={t.common.save}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-green-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </button>
              <button
                onClick={onCancelEditName}
                disabled={isSavingWorkoutName}
                className="shrink-0 p-1.5 rounded-full hover:bg-red-500/20 transition-colors disabled:opacity-50"
                title={t.common.cancel}
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="relative" ref={actionsRef}>
        <button
          ref={actionsBtnRef}
          type="button"
          aria-label={t.profile.menu}
          className="inline-flex items-center justify-center p-2 rounded-full hover:bg-white/10"
          onClick={onToggleActions}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="12" cy="5" r="1" />
            <circle cx="12" cy="12" r="1" />
            <circle cx="12" cy="19" r="1" />
          </svg>
        </button>
      </div>
    </div>
  );
};
