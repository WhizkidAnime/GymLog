import { useState, useEffect, useRef, useCallback } from 'react';

export type Theme = 'dark' | 'light';

export type UseProfileSettingsReturn = {
  // Timer step
  timerStep: number;
  timerStepInput: string;
  setTimerStepInput: (value: string) => void;
  saveStatus: 'idle' | 'saving' | 'success';
  saveTimerStep: () => void;

  // Theme
  theme: Theme;
  handleThemeToggle: () => void;

  // Settings panel
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
};

export function useProfileSettings(): UseProfileSettingsReturn {
  const [timerStep, setTimerStep] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('settings:timerStep');
      return saved ? Number(saved) : 30;
    } catch {
      return 30;
    }
  });

  const [timerStepInput, setTimerStepInput] = useState<string>(() => String(timerStep));
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success'>('idle');
  const saveStatusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem('settings:theme');
      return saved === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveStatusTimeoutRef.current) {
        clearTimeout(saveStatusTimeoutRef.current);
      }
    };
  }, []);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (theme === 'light') {
      root.classList.add('light-theme');
      if (meta) meta.setAttribute('content', '#f5f5f7');
    } else {
      root.classList.remove('light-theme');
      if (meta) meta.setAttribute('content', '#0a0a0b');
    }
  }, [theme]);

  const handleThemeToggle = useCallback(() => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    try {
      localStorage.setItem('settings:theme', newTheme);
    } catch {
      // ignore
    }
  }, [theme]);

  const saveTimerStep = useCallback(() => {
    if (saveStatusTimeoutRef.current) {
      clearTimeout(saveStatusTimeoutRef.current);
    }
    const value = parseInt(timerStepInput, 10);
    if (!isNaN(value) && value >= 1 && value <= 300) {
      setSaveStatus('saving');
      setTimerStep(value);
      try {
        localStorage.setItem('settings:timerStep', String(value));
      } catch {
        // ignore
      }
      saveStatusTimeoutRef.current = setTimeout(() => {
        setSaveStatus('success');
        saveStatusTimeoutRef.current = setTimeout(() => {
          setSaveStatus('idle');
        }, 500);
      }, 350);
    } else {
      setTimerStepInput(String(timerStep));
      setSaveStatus('idle');
    }
  }, [timerStepInput, timerStep]);

  return {
    timerStep,
    timerStepInput,
    setTimerStepInput,
    saveStatus,
    saveTimerStep,
    theme,
    handleThemeToggle,
    isSettingsOpen,
    setIsSettingsOpen,
  };
}
