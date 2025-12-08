import React, { useRef, useEffect, useState } from 'react';

export type ProfileMenuProps = {
  // Import actions
  isImportingWorkouts: boolean;
  isImportingTemplates: boolean;
  handleStartImportWorkouts: () => void;
  handleStartImportTemplates: () => void;

  // Export actions
  isExporting: boolean;
  isExportingTemplates: boolean;
  handleExportWorkouts: () => Promise<void>;
  handleExportTemplates: () => Promise<void>;

  // Account actions
  isDeleting: boolean;
  startCleanDataFlow: () => void;
  startDeleteAccountFlow: () => void;
};

export function ProfileMenu({
  isImportingWorkouts,
  isImportingTemplates,
  handleStartImportWorkouts,
  handleStartImportTemplates,
  isExporting,
  isExportingTemplates,
  handleExportWorkouts,
  handleExportTemplates,
  isDeleting,
  startCleanDataFlow,
  startDeleteAccountFlow,
}: ProfileMenuProps): React.ReactElement {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isMenuOpen]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="p-2 text-white hover:text-gray-300 transition-colors"
        aria-label="Меню"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 8c1.1 0 2-1 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 1-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 1-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
        </svg>
      </button>
      
      {isMenuOpen && (
        <div className="absolute right-0 mt-2 menu-popover space-y-0.5">
          <div className="px-4 pt-2 pb-0 text-[11px] font-semibold uppercase tracking-wide text-gray-400 text-center whitespace-nowrap">
            Импорт
          </div>
          <button
            onClick={() => {
              setIsMenuOpen(false);
              handleStartImportWorkouts();
            }}
            disabled={isImportingWorkouts}
            className="w-full text-left px-4 py-1.5 text-sm text-white hover:bg-white/5 disabled:opacity-50 transition-colors rounded-lg"
          >
            {isImportingWorkouts ? 'Импорт тренировок...' : 'Тренировки'}
          </button>
          <button
            onClick={() => {
              setIsMenuOpen(false);
              handleStartImportTemplates();
            }}
            disabled={isImportingTemplates}
            className="w-full text-left px-4 py-1.5 text-sm text-white hover:bg-white/5 disabled:opacity-50 transition-colors rounded-lg"
          >
            {isImportingTemplates ? 'Импорт шаблонов...' : 'Шаблоны'}
          </button>
          <div className="px-4 pt-1 pb-0 text-[11px] font-semibold uppercase tracking-wide text-gray-400 text-center whitespace-nowrap">
            Экспорт
          </div>
          <button
            onClick={async () => {
              setIsMenuOpen(false);
              await handleExportWorkouts();
            }}
            disabled={isExporting}
            className="w-full text-left px-4 py-1.5 text-sm text-white hover:bg-white/5 disabled:opacity-50 transition-colors rounded-lg"
          >
            {isExporting ? 'Экспорт тренировок...' : 'Тренировки'}
          </button>
          <button
            onClick={async () => {
              setIsMenuOpen(false);
              await handleExportTemplates();
            }}
            disabled={isExportingTemplates}
            className="w-full text-left px-4 py-1.5 text-sm text-white hover:bg-white/5 disabled:opacity-50 transition-colors rounded-lg"
          >
            {isExportingTemplates ? 'Экспорт шаблонов...' : 'Шаблоны'}
          </button>
          <div className="px-4 pt-1 pb-0 text-[11px] font-semibold uppercase tracking-wide text-gray-400 text-center whitespace-nowrap">
            Данные и аккаунт
          </div>
          <button
            onClick={() => {
              setIsMenuOpen(false);
              startCleanDataFlow();
            }}
            className="w-full text-left px-4 py-1.5 text-sm text-white hover:bg-white/5 transition-colors rounded-lg"
          >
            Очистить данные
          </button>
          <button
            onClick={() => {
              setIsMenuOpen(false);
              startDeleteAccountFlow();
            }}
            disabled={isDeleting}
            className="w-full text-left px-4 py-1.5 text-sm text-red-400 hover:bg-red-500/10 disabled:opacity-50 transition-colors rounded-lg"
          >
            {isDeleting ? 'Удаление...' : 'Удалить аккаунт'}
          </button>
        </div>
      )}
    </div>
  );
}
