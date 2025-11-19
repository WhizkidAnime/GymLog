import { useEffect, useRef } from 'react';

interface UseScrollRestorationOptions {
  key: string;
  enabled: boolean;
}

export function useScrollRestoration({ key, enabled }: UseScrollRestorationOptions) {
  const isRestoringScroll = useRef(false);
  const lastScrollPosition = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const y = parseInt(saved, 10);
        if (!Number.isNaN(y)) {
          isRestoringScroll.current = true;
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              window.scrollTo({ top: y, behavior: 'auto' });
              lastScrollPosition.current = y;
              setTimeout(() => {
                isRestoringScroll.current = false;
              }, 100);
            });
          });
        }
      }
    } catch {}
  }, [enabled, key]);

  useEffect(() => {
    if (!enabled) return;

    let ticking = false;
    const handleScroll = () => {
      lastScrollPosition.current = window.scrollY;
      if (!ticking && !isRestoringScroll.current) {
        window.requestAnimationFrame(() => {
          try {
            localStorage.setItem(key, String(lastScrollPosition.current));
          } catch {}
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [enabled, key]);

  useEffect(() => {
    if (!enabled) return;

    return () => {
      if (lastScrollPosition.current > 0) {
        try {
          localStorage.setItem(key, String(lastScrollPosition.current));
        } catch {}
      }
    };
  }, [enabled, key]);
}
