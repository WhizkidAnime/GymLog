import { useEffect, useRef, useState } from 'react';

export function useHeaderScroll() {
  const [isScrolling, setIsScrolling] = useState(false);
  const isScrollingRef = useRef(false);

  useEffect(() => {
    const handleScroll = () => {
      const next = window.scrollY > 0;

      if (isScrollingRef.current !== next) {
        isScrollingRef.current = next;
        setIsScrolling(next);
      }
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return isScrolling;
}
