import { useState, useEffect, useRef, useCallback } from 'react';

export type Theme = 'dark' | 'light' | 'auto';

export type UseProfileSettingsReturn = {
  // Timer step
  timerStep: number;
  timerStepInput: string;
  setTimerStepInput: (value: string) => void;
  saveStatus: 'idle' | 'saving' | 'success';
  saveTimerStep: () => void;

  // Theme
  theme: Theme;
  handleThemeChange: (newTheme: Theme) => void;

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
      if (saved === 'light' || saved === 'dark' || saved === 'auto') {
        return saved;
      }
    } catch {
      // ignore
    }

    return 'auto';
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

  // Apply theme to document with support for system preference
  useEffect(() => {
    const root = document.documentElement;
    const meta = document.querySelector('meta[name="theme-color"]');

    const applyTheme = (mode: Theme, prefersLight: boolean) => {
      const resolvedTheme =
        mode === 'auto'
          ? prefersLight
            ? 'light'
            : 'dark'
          : mode;

      if (resolvedTheme === 'light') {
        root.classList.add('light-theme');
        if (meta) {
          meta.setAttribute('content', '#f5f5f7');
        }
      } else {
        root.classList.remove('light-theme');
        if (meta) {
          meta.setAttribute('content', '#0a0a0b');
        }
      }
    };

    const getPrefersLight = () => {
      if (typeof window === 'undefined' || !window.matchMedia) {
        return false;
      }

      try {
        return window.matchMedia('(prefers-color-scheme: light)').matches;
      } catch {
        return false;
      }
    };

    const prefersLight = getPrefersLight();
    applyTheme(theme, prefersLight);

    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
    const handleChange = (event: MediaQueryListEvent) => {
      applyTheme(theme, event.matches);
    };

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => {
        mediaQuery.removeEventListener('change', handleChange);
      };
    }

    if (typeof mediaQuery.addListener === 'function') {
      mediaQuery.addListener(handleChange);
      return () => {
        mediaQuery.removeListener(handleChange);
      };
    }

    return undefined;
  }, [theme]);

  const handleThemeChange = useCallback((newTheme: Theme) => {
    setTheme(newTheme);
    try {
      localStorage.setItem('settings:theme', newTheme);
    } catch {
      // ignore
    }
  }, []);

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
    handleThemeChange,
    isSettingsOpen,
    setIsSettingsOpen,
  };
}
