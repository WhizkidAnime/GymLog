import React from 'react';
import type { Theme } from '../../hooks/use-profile-settings';

export type SettingsSectionProps = {
  isOpen: boolean;
  timerStepInput: string;
  setTimerStepInput: (value: string) => void;
  saveStatus: 'idle' | 'saving' | 'success';
  saveTimerStep: () => void;
  theme: Theme;
  handleThemeChange: (newTheme: Theme) => void;
};

export function SettingsSection({
  isOpen,
  timerStepInput,
  setTimerStepInput,
  saveStatus,
  saveTimerStep,
  theme,
  handleThemeChange,
}: SettingsSectionProps): React.ReactElement | null {
  if (!isOpen) return null;

  return (
    <div className="glass card-dark rounded-lg p-4 space-y-4">
      <h2 className="text-lg font-semibold text-white">Настройки</h2>
      
      <div className="space-y-2">
        <label className="block text-sm text-gray-300">
          Шаг таймера отдыха (секунды)
        </label>
        <p className="text-xs text-gray-500">
          Значение, на которое изменяется таймер при нажатии +/-
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <input
            type="number"
            min="1"
            max="300"
            value={timerStepInput}
            onChange={(e) => setTimerStepInput(e.target.value)}
            className="w-24 px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="button"
            onClick={saveTimerStep}
            disabled={saveStatus === 'saving'}
            className="btn-glass btn-glass-primary flex items-center justify-center gap-2 !py-2 !px-4 min-w-[104px]"
          >
            {saveStatus === 'saving' && (
              <span
                aria-label="Сохранение..."
                className="h-5 w-5 inline-block border-2 border-white/70 border-t-transparent rounded-full animate-spin"
              />
            )}
            {saveStatus === 'success' && (
              <svg
                aria-label="Сохранено"
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
            {saveStatus === 'idle' && 'Сохранить'}
          </button>
        </div>
      </div>

      <div className="border-t border-white/10 pt-4 space-y-2">
        <label className="block text-sm text-gray-300">
          Тема оформления
        </label>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => handleThemeChange('dark')}
            className={`btn-glass ${
              theme === 'dark' ? 'btn-glass-primary' : 'btn-glass-secondary'
            } w-full !py-2 !px-3 font-medium transition-all duration-200 ease-out`}
          >
            <span className="flex items-center justify-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
              Тёмная
            </span>
          </button>
          <button
            type="button"
            onClick={() => handleThemeChange('light')}
            className={`btn-glass ${
              theme === 'light' ? 'btn-glass-primary' : 'btn-glass-secondary'
            } w-full !py-2 !px-3 font-medium transition-all duration-200 ease-out`}
          >
            <span className="flex items-center justify-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Светлая
            </span>
          </button>
          <button
            type="button"
            onClick={() => handleThemeChange('auto')}
            className={`btn-glass ${
              theme === 'auto' ? 'btn-glass-primary' : 'btn-glass-secondary'
            } w-full !py-2 !px-3 font-medium transition-all duration-200 ease-out`}
          >
            <span className="flex items-center justify-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Авто
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
