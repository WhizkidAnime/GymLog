import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import BottomNav from './bottom-nav';

const Layout = () => {
  const location = useLocation();
  // Сохраняем последний путь для возврата
  useEffect(() => {
    localStorage.setItem('lastPath', location.pathname);
  }, [location.pathname]);
  // Календарь — всегда страница календаря. Последнюю тренировку открываем только при старте через DefaultRedirect
  const calendarLink = '/calendar';
  const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center justify-center w-full text-sm transition-colors duration-200 ${
      isActive ? 'text-white' : 'text-white/70 hover:text-white'
    }`;

  return (
    <div className="flex flex-col h-screen">
      <main className="flex-1 overflow-y-auto pb-28">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
};

export default Layout;
