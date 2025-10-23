import React, { KeyboardEvent, useMemo } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';

type CssVars = React.CSSProperties & Record<string, string | number>;

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const tabs = [
    { to: '/calendar', label: 'Календарь', icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
    ) },
    { to: '/templates', label: 'Шаблоны', icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
    ) },
    { to: '/profile', label: 'Профиль', icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
    ) },
  ];

  const activeIndex = useMemo(() => {
    const p = location.pathname;
    if (p.startsWith('/calendar')) return 0;
    if (p.startsWith('/templates')) return 1;
    if (p.startsWith('/profile')) return 2;
    return 0;
  }, [location.pathname]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const dir = e.key === 'ArrowRight' ? 1 : -1;
    const next = (activeIndex + dir + tabs.length) % tabs.length;
    navigate(tabs[next].to);
  };

  const cssVars: CssVars = { ['--tabs-count' as any]: tabs.length, ['--active-index' as any]: activeIndex };

  return (
    <nav className="bottom-dock-wrapper" aria-label="Нижняя навигация">
      <div className="bottom-dock glass-dock" role="tablist" aria-orientation="horizontal" onKeyDown={onKeyDown} style={cssVars}>
        <div className="dock-track">
          <div className="dock-indicator" aria-hidden="true" />
          {tabs.map((t, i) => (
            <NavLink
              key={t.to}
              to={t.to}
              className={({ isActive }) => (
                `dock-item ${isActive ? 'active' : ''}`
              )}
              role="tab"
              aria-selected={activeIndex === i}
            >
              <span className="icon" aria-hidden="true">{t.icon}</span>
              <span className="label">{t.label}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;


