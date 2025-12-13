import React from 'react';
import type { TemplateForDeletion } from '../../hooks/use-data-cleanup';
import { useI18n } from '../../hooks/use-i18n';

export type DeleteTemplatesDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  templatesForDeletion: TemplateForDeletion[];
  selectedTemplateIds: string[];
  isDeletingTemplates: boolean;
  areAllTemplatesSelected: boolean;
  toggleTemplateSelection: (id: string) => void;
  selectAllTemplates: () => void;
  clearTemplateSelection: () => void;
  handleDeleteSelectedTemplates: () => Promise<void>;
};

export function DeleteTemplatesDialog({
  isOpen,
  onClose,
  templatesForDeletion,
  selectedTemplateIds,
  isDeletingTemplates,
  areAllTemplatesSelected,
  toggleTemplateSelection,
  selectAllTemplates,
  clearTemplateSelection,
  handleDeleteSelectedTemplates,
}: DeleteTemplatesDialogProps): React.ReactElement | null {
  const { t } = useI18n();
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={() => {
          if (isDeletingTemplates) return;
          onClose();
        }}
      />
      <div className="relative w-full max-w-md glass card-dark rounded-xl shadow-xl p-5 space-y-4">
        <h2 className="text-lg font-semibold text-white">{t.deleteTemplates.title}</h2>
        <p className="text-sm text-gray-300">
          {t.deleteTemplates.description}
        </p>
        <div className="mt-2 flex items-center justify-between text-xs text-gray-300">
          <button
            type="button"
            onClick={selectAllTemplates}
            disabled={templatesForDeletion.length === 0 || isDeletingTemplates}
            className="inline-flex items-center gap-2 disabled:opacity-40"
          >
            <div
              className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                areAllTemplatesSelected ? 'bg-green-500 border-green-400' : 'border-white/40'
              }`}
            >
              {areAllTemplatesSelected && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3 w-3 text-white"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-7.25 7.25a1 1 0 01-1.414 0l-3.25-3.25a1 1 0 111.414-1.414L8.5 11.836l6.543-6.543a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>
            <span>{t.deleteWorkouts.selectAll}</span>
          </button>
          <button
            type="button"
            onClick={clearTemplateSelection}
            disabled={selectedTemplateIds.length === 0 || isDeletingTemplates}
            className="text-xs text-gray-400 hover:text-gray-200 disabled:opacity-40"
          >
            {t.deleteWorkouts.clearSelection}
          </button>
        </div>
        <div className="max-h-64 overflow-y-auto rounded-md bg-black/20 p-3 space-y-2">
          {templatesForDeletion.map((template) => {
            const selected = selectedTemplateIds.includes(template.id);
            return (
              <button
                key={template.id}
                type="button"
                onClick={() => toggleTemplateSelection(template.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md border text-left transition-colors ${
                  selected
                    ? 'bg-white/10 border-green-400'
                    : 'bg-transparent border-white/10 hover:bg-white/5'
                }`}
              >
                <div className="text-sm font-medium text-white">{template.name}</div>
                <div
                  className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                    selected ? 'bg-green-500 border-green-400' : 'border-white/40'
                  }`}
                >
                  {selected && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-3 w-3 text-white"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-7.25 7.25a1 1 0 01-1.414 0l-3.25-3.25a1 1 0 111.414-1.414L8.5 11.836l6.543-6.543a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
              </button>
            );
          })}
          {templatesForDeletion.length === 0 && (
            <p className="text-sm text-gray-400">{t.deleteTemplates.noTemplates}</p>
          )}
        </div>
        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={handleDeleteSelectedTemplates}
            disabled={selectedTemplateIds.length === 0 || isDeletingTemplates}
            className="btn-glass btn-glass-full btn-glass-md btn-glass-primary disabled:opacity-50"
          >
            {isDeletingTemplates ? t.deleteTemplates.deleting : t.deleteTemplates.deleteSelected}
          </button>
          <button
            type="button"
            onClick={() => {
              if (isDeletingTemplates) return;
              onClose();
            }}
            className="btn-glass btn-glass-full btn-glass-md btn-glass-secondary"
          >
            {t.common.cancel}
          </button>
        </div>
      </div>
    </div>
  );
}
