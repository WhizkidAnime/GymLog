import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { clearAllPageStates } from './usePageState';

const TAB_PATHS_KEY = 'tab_navigation_paths';
const NAVIGATION_TIMEOUT = 30 * 60 * 1000; // 30 минут

type TabPaths = {
  calendar: string;
  templates: string;
  profile: string;
  lastUpdated: number;
};

const DEFAULT_PATHS: TabPaths = {
  calendar: '/calendar',
  templates: '/templates',
  profile: '/profile',
  lastUpdated: Date.now(),
};

const getStoredPaths = (): TabPaths => {
  try {
    const stored = localStorage.getItem(TAB_PATHS_KEY);
    if (!stored) return DEFAULT_PATHS;

    const parsed = JSON.parse(stored) as TabPaths;

    // Проверяем, не устарели ли данные (более 30 минут)
    if (Date.now() - parsed.lastUpdated > NAVIGATION_TIMEOUT) {
      return DEFAULT_PATHS;
    }

    return parsed;
  } catch {
    return DEFAULT_PATHS;
  }
};

const saveTabPath = (tab: keyof Omit<TabPaths, 'lastUpdated'>, path: string) => {
  try {
    const current = getStoredPaths();
    const updated: TabPaths = {
      ...current,
      [tab]: path,
      lastUpdated: Date.now(),
    };
    localStorage.setItem(TAB_PATHS_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage errors
  }
};

const getTabFromPath = (path: string): keyof Omit<TabPaths, 'lastUpdated'> | null => {
  if (path.startsWith('/calendar') || path.startsWith('/workout')) return 'calendar';
  if (path.startsWith('/templates')) return 'templates';
  if (path.startsWith('/profile')) return 'profile';
  return null;
};

export const useTabNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Сохраняем текущий путь для активной вкладки
  useEffect(() => {
    const tab = getTabFromPath(location.pathname);
    if (tab) {
      saveTabPath(tab, location.pathname);
    }
  }, [location.pathname]);

  // Функция для навигации к вкладке с восстановлением последнего пути
  const navigateToTab = (targetTab: 'calendar' | 'templates' | 'profile') => {
    const storedPaths = getStoredPaths();
    const targetPath = storedPaths[targetTab];

    // Если мы уже на этой вкладке, не делаем ничего
    const currentTab = getTabFromPath(location.pathname);
    if (currentTab === targetTab) return;

    navigate(targetPath);
  };

  return { navigateToTab };
};

// Функция для очистки данных навигации (например, при выходе)
export const clearTabNavigation = () => {
  try {
    localStorage.removeItem(TAB_PATHS_KEY);
    clearAllPageStates();
  } catch {
    // Ignore
  }
};
