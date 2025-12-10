import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import BottomNav from './bottom-nav';

const Layout = () => {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const root = document.documentElement;
    let rafId = 0;

    const applyOffset = () => {
      rafId = 0;
      const viewport = window.visualViewport;
      const layoutHeight = window.innerHeight;

      if (!viewport) {
        root.style.setProperty('--keyboard-offset', '0px');
        return;
      }

      const offset = Math.max(0, layoutHeight - (viewport.height + viewport.offsetTop));
      root.style.setProperty('--keyboard-offset', `${offset}px`);
    };

    const requestApply = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(applyOffset);
    };

    applyOffset();

    window.visualViewport?.addEventListener('resize', requestApply);
    window.visualViewport?.addEventListener('scroll', requestApply);
    window.addEventListener('resize', requestApply);
    window.addEventListener('orientationchange', requestApply);

    return () => {
      window.visualViewport?.removeEventListener('resize', requestApply);
      window.visualViewport?.removeEventListener('scroll', requestApply);
      window.removeEventListener('resize', requestApply);
      window.removeEventListener('orientationchange', requestApply);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div className="flex flex-col h-[100svh]">
      <main
        className="flex-1"
        style={{
          // Верхний safe-area уже учтён в #root, здесь не дублируем
          paddingBottom: 'var(--dock-total-h, 96px)',
        }}
      >
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
};

export default Layout;
