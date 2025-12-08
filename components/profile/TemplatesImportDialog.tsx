import React from 'react';
import type { TemplateDuplicate, TemplatesImportAction } from '../../hooks/use-templates-import-export';

export type TemplatesImportDialogProps = {
  isOpen: boolean;
  pendingTemplatesDuplicates: TemplateDuplicate[];
  isImportingTemplates: boolean;
  templatesImportAction: TemplatesImportAction;
  onClose: () => void;
  handleImportTemplatesOnlyNew: () => Promise<void>;
  handleImportTemplatesOverwrite: () => Promise<void>;
};

export function TemplatesImportDialog({
  isOpen,
  pendingTemplatesDuplicates,
  isImportingTemplates,
  templatesImportAction,
  onClose,
  handleImportTemplatesOnlyNew,
  handleImportTemplatesOverwrite,
}: TemplatesImportDialogProps): React.ReactElement | null {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={() => {
          if (isImportingTemplates) return;
          onClose();
        }}
      />
      <div className="relative w-full max-w-md glass card-dark rounded-xl shadow-xl p-5 space-y-4">
        <h2 className="text-lg font-semibold text-white">Импорт шаблонов</h2>
        <div className="text-sm text-gray-300 space-y-1">
          <p>В файле найдены шаблоны с именами, которые уже есть в вашем аккаунте.</p>
          <ul className="list-disc list-inside text-xs text-gray-400 space-y-0.5">
            <li>«Импортировать только новые шаблоны» — добавит только те, которых ещё нет.</li>
            <li>«Перезаписать существующие шаблоны» — удалит совпадающие и создаст их заново из файла.</li>
          </ul>
        </div>
        <div className="max-h-48 overflow-y-auto rounded-md bg-black/20 p-3 space-y-2">
          {pendingTemplatesDuplicates.map((item, index) => (
            <div key={item.existingId + '-' + index} className="text-sm text-gray-200 border-b border-white/5 pb-1 last:border-0">
              <div className="font-semibold">{item.template?.name || 'Без названия'}</div>
              <div className="text-xs text-gray-400">
                Уже есть как: «{item.existingName || 'Без названия'}»
              </div>
            </div>
          ))}
          {pendingTemplatesDuplicates.length === 0 && (
            <p className="text-sm text-gray-400">Совпадающих шаблонов не найдено.</p>
          )}
        </div>
        {isImportingTemplates ? (
          <div className="mt-4 flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <p className="text-sm text-gray-300">
              {templatesImportAction === 'overwrite'
                ? 'Перезаписываем существующие шаблоны и импортируем данные...'
                : 'Импортируем только новые шаблоны...'}
            </p>
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
              onClick={handleImportTemplatesOnlyNew}
              className="btn-glass btn-glass-full btn-glass-md btn-glass-secondary"
            >
              Импортировать только новые шаблоны (без изменения существующих)
            </button>
            <button
              type="button"
              onClick={handleImportTemplatesOverwrite}
              className="btn-glass btn-glass-full btn-glass-md btn-glass-secondary"
            >
              Перезаписать существующие шаблоны и добавить новые
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn-glass btn-glass-full btn-glass-md btn-glass-secondary"
            >
              Отмена
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
