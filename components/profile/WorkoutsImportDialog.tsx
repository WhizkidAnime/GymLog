import React from 'react';
import type { ImportAction } from '../../hooks/use-workouts-import-export';

export type WorkoutsImportDialogProps = {
  isOpen: boolean;
  pendingWorkoutsImport: any | null;
  pendingWorkoutsFileName: string | null;
  pendingWorkoutsNewDatesSummary: Array<{ date: string; count: number }>;
  isImportingWorkouts: boolean;
  importAction: ImportAction;
  onClose: () => void;
  handleConfirmImportWorkoutsOnly: () => Promise<void>;
  handleImportOnlyNewWorkouts: () => Promise<void>;
  handleExportThenImportWorkouts: () => Promise<void>;
};

function formatDateDDMMYYYY(iso: string): string {
  if (!iso || typeof iso !== 'string') return iso;
  const parts = iso.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    if (year && month && day) {
      return `${day}.${month}.${year}`;
    }
  }
  return iso;
}

export function WorkoutsImportDialog({
  isOpen,
  pendingWorkoutsImport,
  pendingWorkoutsFileName,
  pendingWorkoutsNewDatesSummary,
  isImportingWorkouts,
  importAction,
  onClose,
  handleConfirmImportWorkoutsOnly,
  handleImportOnlyNewWorkouts,
  handleExportThenImportWorkouts,
}: WorkoutsImportDialogProps): React.ReactElement | null {
  if (!isOpen || !pendingWorkoutsImport) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={() => {
          if (isImportingWorkouts) return;
          onClose();
        }}
      />
      <div className="relative w-full max-w-md glass card-dark rounded-xl shadow-xl p-5 space-y-4">
        <h2 className="text-lg font-semibold text-white">Импорт тренировок</h2>
        <p className="text-sm text-gray-300">
          {`Будут импортированы тренировки из файла "${pendingWorkoutsFileName || 'выбранный файл'}".`}
        </p>
        <div className="text-sm text-gray-400 space-y-1">
          <p>
            Тренировки на даты, которые уже есть в календаре и присутствуют в файле, будут
            удалены и перезаписаны данными из файла. На другие даты тренировки останутся без
            изменений.
          </p>
          <ul className="list-disc list-inside text-xs text-gray-500 space-y-0.5">
            <li>
              «Импортировать только новые тренировки» — добавит тренировки только на новые даты,
              без изменения существующих.
            </li>
            <li>
              «Импортировать с перезаписью дат» — заменит тренировки на совпадающие даты и
              добавит новые.
            </li>
            <li>
              «Экспортировать текущие тренировки и импортировать с перезаписью» — сначала
              сохранит текущие тренировки в файл, затем выполнит импорт с перезаписью дат.
            </li>
          </ul>
        </div>
        {pendingWorkoutsNewDatesSummary.length > 0 && (
          <div className="mt-2 rounded-md bg-black/20 p-3">
            <p className="text-xs text-gray-300">
              Новые тренировки из файла (даты, которых ещё нет в календаре):
            </p>
            <div className="mt-1 space-y-1 max-h-32 overflow-y-auto text-center">
              {pendingWorkoutsNewDatesSummary.map((item) => (
                <div
                  key={item.date}
                  className="text-xs text-gray-200"
                >
                  <span>{formatDateDDMMYYYY(item.date)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {isImportingWorkouts ? (
          <div className="mt-4 flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <p className="text-sm text-gray-300">
              {importAction === 'exportThenImport'
                ? 'Экспортируем текущие тренировки и импортируем новые...'
                : importAction === 'onlyNew'
                  ? 'Импортируем только новые тренировки...'
                  : 'Импортируем тренировки...'}
            </p>
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-2">
            {pendingWorkoutsNewDatesSummary.length > 0 && (
              <button
                type="button"
                onClick={handleImportOnlyNewWorkouts}
                className="btn-glass btn-glass-full btn-glass-md btn-glass-secondary"
              >
                Импортировать только новые тренировки (без изменения существующих)
              </button>
            )}
            <button
              type="button"
              onClick={handleConfirmImportWorkoutsOnly}
              className="btn-glass btn-glass-full btn-glass-md btn-glass-secondary"
            >
              Импортировать с перезаписью дат из файла
            </button>
            <button
              type="button"
              onClick={handleExportThenImportWorkouts}
              className="btn-glass btn-glass-full btn-glass-md btn-glass-secondary"
            >
              Экспортировать текущие тренировки и импортировать с перезаписью дат
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn-glass btn-glass-full btn-glass-md btn-glass-secondary bg-white/10 hover:bg-white/5"
            >
              Отмена
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
