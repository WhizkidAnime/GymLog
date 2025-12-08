import React from 'react';

export type CleanDataDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  isLoadingWorkoutsForDeletion: boolean;
  isLoadingTemplatesForDeletion: boolean;
  openDeleteWorkoutsDialog: () => Promise<void>;
  openDeleteTemplatesDialog: () => Promise<void>;
};

export function CleanDataDialog({
  isOpen,
  onClose,
  isLoadingWorkoutsForDeletion,
  isLoadingTemplatesForDeletion,
  openDeleteWorkoutsDialog,
  openDeleteTemplatesDialog,
}: CleanDataDialogProps): React.ReactElement | null {
  if (!isOpen) return null;

  const isLoading = isLoadingWorkoutsForDeletion || isLoadingTemplatesForDeletion;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={() => {
          if (isLoading) return;
          onClose();
        }}
      />
      <div className="relative w-full max-w-md glass card-dark rounded-xl shadow-xl p-5 space-y-4">
        <h2 className="text-lg font-semibold text-white">Очистить данные</h2>
        <p className="text-sm text-gray-300">
          Выберите, какие данные вы хотите удалить.
        </p>
        {isLoading && (
          <p className="text-xs text-gray-400">Загружаем данные...</p>
        )}
        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={openDeleteWorkoutsDialog}
            disabled={isLoading}
            className="btn-glass btn-glass-full btn-glass-md btn-glass-secondary disabled:opacity-50"
          >
            Удалить тренировки
          </button>
          <button
            type="button"
            onClick={openDeleteTemplatesDialog}
            disabled={isLoading}
            className="btn-glass btn-glass-full btn-glass-md btn-glass-secondary disabled:opacity-50"
          >
            Удалить шаблоны тренировок
          </button>
          <button
            type="button"
            onClick={() => {
              if (isLoading) return;
              onClose();
            }}
            className="btn-glass btn-glass-full btn-glass-md btn-glass-secondary bg-white/10 hover:bg-white/5"
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}
