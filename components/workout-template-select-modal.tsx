import React from 'react';
import { createPortal } from 'react-dom';
import type { WorkoutTemplate } from '../types/database.types';
import { useI18n } from '../hooks/use-i18n';

type WorkoutTemplateSelectModalProps = {
  open: boolean;
  templates: WorkoutTemplate[];
  isCreating: boolean;
  onClose: () => void;
  onReplaceWithTemplate: (template: WorkoutTemplate) => void;
};

export const WorkoutTemplateSelectModal: React.FC<WorkoutTemplateSelectModalProps> = ({
  open,
  templates,
  isCreating,
  onClose,
  onReplaceWithTemplate,
}) => {
  const { t } = useI18n();
  
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 overscroll-contain">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-md glass card-dark rounded-xl shadow-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">{t.workoutTemplateSelect.title}</h2>
          <button
            onClick={onClose}
            className="px-2 py-1 text-sm text-gray-300 hover:text-white"
          >
            ✕
          </button>
        </div>
        {templates.length === 0 ? (
          <p className="text-gray-400">{t.workoutTemplateSelect.noTemplates}</p>
        ) : (
          <div className="space-y-2 max-h-[70vh] overflow-y-auto overscroll-contain pr-1">
            {templates.map(tmpl => (
              <button
                key={tmpl.id}
                onClick={() => onReplaceWithTemplate(tmpl)}
                disabled={isCreating}
                className="w-full text-left px-4 py-2 rounded-md border border-white/20 text-gray-100 hover:bg-white/5 disabled:opacity-50"
              >
                {isCreating ? t.workoutTemplateSelect.applying : tmpl.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
