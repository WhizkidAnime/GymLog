import React, { KeyboardEvent, useLayoutEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useTabNavigation } from '../hooks/useTabNavigation';

type CssVars = React.CSSProperties & Record<string, string | number>;

const BottomNav = () => {
  const location = useLocation();
  const { navigateToTab } = useTabNavigation();
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const tabs = [
    { key: 'calendar' as const, label: 'Календарь', icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
    ) },
    { key: 'search' as const, label: 'Поиск', icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
    ) },
    { key: 'templates' as const, label: 'Шаблоны', icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
    ) },
    { key: 'profile' as const, label: 'Профиль', icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
    ) },
  ];

  const activeIndex = useMemo(() => {
    const p = location.pathname;
    if (p.startsWith('/calendar') || p.startsWith('/workout')) return 0;
    if (p.startsWith('/exercise-history')) return 1;
    if (p.startsWith('/templates')) return 2;
    if (p.startsWith('/profile')) return 3;
    return 0;
  }, [location.pathname]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const dir = e.key === 'ArrowRight' ? 1 : -1;
    const next = (activeIndex + dir + tabs.length) % tabs.length;
    navigateToTab(tabs[next].key as 'calendar' | 'search' | 'templates' | 'profile');
  };

  const cssVars: CssVars = { ['--tabs-count' as any]: tabs.length, ['--active-index' as any]: activeIndex };

  useLayoutEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const updateHeight = () => {
      const height = el.offsetHeight;
      document.documentElement.style.setProperty('--dock-total-h', `${height}px`);
    };

    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(el);

    window.addEventListener('resize', updateHeight);
    window.addEventListener('orientationchange', updateHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateHeight);
      window.removeEventListener('orientationchange', updateHeight);
    };
  }, []);

  return (
    <nav ref={wrapperRef} className="bottom-dock-wrapper" aria-label="Нижняя навигация">
      <div className="bottom-dock glass-dock" role="tablist" aria-orientation="horizontal" onKeyDown={onKeyDown} style={cssVars}>
        <div className="dock-track">
          <div className="dock-indicator" aria-hidden="true" />
          {tabs.map((t, i) => (
            <button
              key={t.key}
              onClick={() => navigateToTab(t.key as 'calendar' | 'search' | 'templates' | 'profile')}
              className={`dock-item ${activeIndex === i ? 'active' : ''}`}
              role="tab"
              aria-selected={activeIndex === i}
            >
              <span className="icon" aria-hidden="true">{t.icon}</span>
              <span className="label">{t.label}</span>
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;


