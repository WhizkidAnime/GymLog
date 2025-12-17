import React from 'react';
import { useI18n } from '../hooks/use-i18n';

type WorkoutCardioToggleProps = {
  isCardio: boolean;
  isSaving: boolean;
  onToggle: () => void;
};

export function WorkoutCardioToggle({
  isCardio,
  isSaving,
  onToggle,
}: WorkoutCardioToggleProps) {
  const { t } = useI18n();
  return (
    <div className="glass card-dark p-4 rounded-md">
      <p className="text-white text-lg font-bold mb-3 text-center">{t.workoutCardio.question}</p>
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            if (isCardio) {
              onToggle();
            }
          }}
          disabled={isSaving}
          className={`flex-1 py-2.5 px-4 rounded-xl font-medium transition duration-200 ease-in-out ${
            !isCardio
              ? 'bg-red-500/80 text-white shadow-lg border border-red-400/60'
              : 'bg-red-500/30 text-white border border-red-400/40 supports-[hover:hover]:hover:bg-red-500/40 supports-[hover:hover]:hover:shadow-xs'
          } active:brightness-100 disabled:cursor-not-allowed disabled:pointer-events-none focus:outline-hidden focus-visible:outline-hidden [-webkit-tap-highlight-color:transparent]`}
        >
          {t.workoutCardio.no}
        </button>
        <button
          onClick={() => {
            if (!isCardio) {
              onToggle();
            }
          }}
          disabled={isSaving}
          className={`flex-1 py-2.5 px-4 rounded-xl font-medium transition duration-200 ease-in-out ${
            isCardio
              ? 'bg-green-500/80 text-white shadow-lg border border-green-400/60'
              : 'bg-green-500/30 text-white border border-green-400/40 supports-[hover:hover]:hover:bg-green-500/40 supports-[hover:hover]:hover:shadow-xs'
          } active:brightness-100 disabled:cursor-not-allowed disabled:pointer-events-none focus:outline-hidden focus-visible:outline-hidden [-webkit-tap-highlight-color:transparent]`}
        >
          {t.workoutCardio.yes}
        </button>
      </div>
    </div>
  );
}
