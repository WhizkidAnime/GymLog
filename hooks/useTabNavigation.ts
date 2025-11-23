import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { clearAllPageStates } from './usePageState';

const TAB_PATHS_KEY = 'tab_navigation_paths';
const NAVIGATION_TIMEOUT = 30 * 60 * 1000; // 30 минут

type TabPaths = {
  calendar: string;
  search: string;
  templates: string;
  profile: string;
  lastUpdated: number;
};

const DEFAULT_PATHS: TabPaths = {
  calendar: '/calendar',
  search: '/exercise-history',
  templates: '/templates',
  profile: '/profile',
  lastUpdated: Date.now(),
};

const getStoredPaths = (): TabPaths => {
  try {
    const stored = localStorage.getItem(TAB_PATHS_KEY);
    if (!stored) return DEFAULT_PATHS;

    const parsed = JSON.parse(stored) as Partial<TabPaths>;

    // Проверяем, не устарели ли данные (более 30 минут)
    if (typeof parsed.lastUpdated !== 'number' || Date.now() - parsed.lastUpdated > NAVIGATION_TIMEOUT) {
      return DEFAULT_PATHS;
    }

    // Гарантируем наличие всех ключей (в т.ч. нового search)
    const merged: TabPaths = {
      calendar: parsed.calendar ?? DEFAULT_PATHS.calendar,
      search: (parsed as any).search ?? DEFAULT_PATHS.search,
      templates: parsed.templates ?? DEFAULT_PATHS.templates,
      profile: parsed.profile ?? DEFAULT_PATHS.profile,
      lastUpdated: parsed.lastUpdated ?? Date.now(),
    };

    return merged;
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
  if (path.startsWith('/exercise-history')) return 'search';
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
  const navigateToTab = (targetTab: 'calendar' | 'search' | 'templates' | 'profile') => {
    const currentPath = location.pathname;

    // Если мы на странице конкретной тренировки, клик по вкладке календаря
    // всегда возвращает в корень календаря
    if (targetTab === 'calendar' && currentPath.startsWith('/workout')) {
      navigate(DEFAULT_PATHS.calendar);
      return;
    }

    // Если уже на нужной вкладке (и это не workout-страница для календаря), ничего не делаем
    const currentTab = getTabFromPath(currentPath);
    if (currentTab === targetTab) return;

    const storedPaths = getStoredPaths();
    const fallback = DEFAULT_PATHS[targetTab];
    const targetPath = storedPaths[targetTab] || fallback;

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
