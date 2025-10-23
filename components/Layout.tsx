import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';

const Layout = () => {
  const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center justify-center w-full text-sm transition-colors duration-200 ${
      isActive ? 'text-blue-500' : 'text-gray-500 hover:text-blue-500'
    }`;

  return (
    <div className="flex flex-col h-screen">
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>
      <nav className="fixed bottom-0 left-0 right-0 glass-nav border-gray-200 pb-[env(safe-area-inset-bottom)]">
        <div className="flex justify-around h-16">
          <NavLink to="/calendar" className={navLinkClasses}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            <span>Календарь</span>
          </NavLink>
          <NavLink to="/templates" className={navLinkClasses}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
            <span>Шаблоны</span>
          </NavLink>
          <NavLink to="/profile" className={navLinkClasses}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            <span>Профиль</span>
          </NavLink>
        </div>
      </nav>
    </div>
  );
};

export default Layout;
