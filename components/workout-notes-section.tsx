import React from 'react';
import { useI18n } from '../hooks/use-i18n';

type WorkoutNotesSectionProps = {
  notes: string;
  isSaving: boolean;
  onChange: (value: string) => void;
};

export function WorkoutNotesSection({
  notes,
  isSaving,
  onChange,
}: WorkoutNotesSectionProps) {
  const { t } = useI18n();
  return (
    <div className="glass card-dark p-4 rounded-md">
      <div className="flex items-center justify-between mb-2">
        <p className="text-white text-lg font-bold">{t.workoutNotes.title}</p>
        {isSaving && (
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
            {t.workoutNotes.saving}
          </span>
        )}
      </div>
      <textarea
        value={notes}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t.workoutNotes.placeholder}
        rows={5}
        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-400 text-sm resize-none focus:outline-hidden focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 transition-colors"
      />
    </div>
  );
}
