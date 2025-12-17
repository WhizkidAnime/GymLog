import React, { KeyboardEvent, useLayoutEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { CalendarDays, Search, FileText, User2, type LucideIcon } from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useTabNavigation } from '../hooks/useTabNavigation';
import { useI18n } from '../hooks/use-i18n';

type CssVars = React.CSSProperties & Record<string, string | number>;

type TabKey = 'calendar' | 'search' | 'templates' | 'profile';

type TabConfig = {
  key: TabKey;
  label: string;
  icon: LucideIcon;
};

const BottomNav = () => {
  const location = useLocation();
  const { navigateToTab } = useTabNavigation();
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const { t } = useI18n();

  const tabs: TabConfig[] = useMemo(() => [
    { key: 'calendar', label: t.nav.calendar, icon: CalendarDays },
    { key: 'search', label: t.nav.search, icon: Search },
    { key: 'templates', label: t.nav.templates, icon: FileText },
    { key: 'profile', label: t.nav.profile, icon: User2 },
  ], [t]);

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
    navigateToTab(tabs[next].key);
  };

  const cssVars: CssVars = { ['--tabs-count' as any]: tabs.length };

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
    <nav ref={wrapperRef} className="bottom-dock-wrapper" aria-label={t.nav.bottomNavLabel}>
      <div
        className="bottom-dock glass-dock"
        role="tablist"
        aria-orientation="horizontal"
        onKeyDown={onKeyDown}
        style={cssVars}
      >
        <div className="dock-track">
          {tabs.map((tab, i) => {
            const isActive = i === activeIndex;
            const Icon = tab.icon;

            const className = twMerge(
              'dock-item',
              clsx({ active: isActive })
            );

            return (
              <button
                key={tab.key}
                onClick={() => navigateToTab(tab.key)}
                className={className}
                role="tab"
                aria-selected={isActive}
              >
                {isActive && (
                  <motion.div
                    layoutId="liquid-lamp"
                    className="dock-indicator"
                    transition={{
                      type: 'spring',
                      stiffness: 350,
                      damping: 30,
                      mass: 0.5,
                    }}
                    aria-hidden="true"
                  />
                )}

                <span className="icon" aria-hidden="true">
                  <Icon
                    size={24}
                    strokeWidth={isActive ? 2.5 : 2}
                    className={twMerge(
                      'relative z-10 transition-all duration-300',
                      isActive
                        ? 'scale-110 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]'
                        : 'text-zinc-400'
                    )}
                  />
                </span>

                <span className="label">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;


