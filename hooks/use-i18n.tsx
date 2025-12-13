import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { ru } from '../i18n/ru';
import { en } from '../i18n/en';

export type Language = 'ru' | 'en';

export type TranslationKeys = typeof ru;

const translations: Record<Language, TranslationKeys> = { ru, en };

type I18nContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TranslationKeys;
};

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('settings:language');
      if (saved === 'ru' || saved === 'en') {
        return saved;
      }
      const browserLang = navigator.language.slice(0, 2);
      if (browserLang === 'ru') return 'ru';
      return 'en';
    } catch {
      return 'ru';
    }
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('settings:language', lang);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const t = useMemo(() => translations[language], [language]);

  const value = useMemo(() => ({
    language,
    setLanguage,
    t,
  }), [language, setLanguage, t]);

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
}

export function getLanguage(): Language {
  try {
    const saved = localStorage.getItem('settings:language');
    if (saved === 'ru' || saved === 'en') {
      return saved;
    }
    const browserLang = navigator.language.slice(0, 2);
    if (browserLang === 'ru') return 'ru';
    return 'en';
  } catch {
    return 'ru';
  }
}

export function getTranslations(): TranslationKeys {
  return translations[getLanguage()];
}
