import React from 'react';
import { Link } from 'react-router-dom';
import { BackButton } from './back-button';
import { WorkoutLoadingOverlay } from './workout-loading-overlay';
import { formatDateForDisplay } from '../utils/date-helpers';
import type { WorkoutTemplate } from '../types/database.types';
import { useI18n } from '../hooks/use-i18n';
import { WORKOUT_ICONS, WorkoutIconType } from './workout-icons';

type WorkoutEmptyStateProps = {
  normalizedDate: string;
  templates: WorkoutTemplate[];
  isCreating: boolean;
  onCreateWorkout: (template: WorkoutTemplate) => void;
  onCreateCustomWorkout: () => void;
};

export function WorkoutEmptyState({
  normalizedDate,
  templates,
  isCreating,
  onCreateWorkout,
  onCreateCustomWorkout,
}: WorkoutEmptyStateProps) {
  const { t } = useI18n();
  
  if (isCreating) {
    return (
      <div className="px-4 pt-4">
        <WorkoutLoadingOverlay message={t.workoutEmptyState.creating} />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-4">
      <div className="flex items-center gap-3 mb-6">
        <BackButton normalizedDate={normalizedDate} />
        <h1 className="flex-1 text-xl font-bold text-center">
          {t.workoutEmptyState.workoutOn.replace('{date}', formatDateForDisplay(normalizedDate))}
        </h1>
      </div>
      <div className="mt-4 p-6 text-center">
        {templates.length > 0 ? (
          <>
            <h2 className="text-lg font-semibold mb-3">{t.workoutEmptyState.selectTemplate}</h2>
            <div className="space-y-3">
              {templates.map(template => (
                <button
                  key={template.id}
                  onClick={() => onCreateWorkout(template)}
                  disabled={isCreating}
                  className="relative p-4 glass card-dark flex items-center gap-3 w-full text-left hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {template.icon && WORKOUT_ICONS[template.icon as WorkoutIconType] && (
                    <div style={{ color: WORKOUT_ICONS[template.icon as WorkoutIconType].color }}>
                      {React.createElement(WORKOUT_ICONS[template.icon as WorkoutIconType].component, { size: 24 })}
                    </div>
                  )}
                  <span className="font-semibold text-lg text-gray-100">{template.name}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center space-y-3">
            <p className="text-gray-400">{t.workoutEmptyState.createTemplateFirst}</p>
            <Link 
              to="/templates/new"
              className="btn-glass btn-glass-primary btn-glass-full btn-glass-md"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t.workoutEmptyState.createTemplate}
            </Link>
          </div>
        )}
        <div className="mt-4">
          <button
            type="button"
            onClick={onCreateCustomWorkout}
            disabled={isCreating}
            className="btn-dashed"
          >
            {t.workoutEmptyState.createCustomDay}
          </button>
        </div>
      </div>
    </div>
  );
}
