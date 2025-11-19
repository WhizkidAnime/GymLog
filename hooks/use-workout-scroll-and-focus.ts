import { useEffect, useRef, useState } from 'react';
import type { Location } from 'react-router-dom';

interface UseWorkoutScrollAndFocusParams {
  normalizedDate: string | null;
  exercisesLength: number;
  scrollKey: string;
  location: Location;
}

export function useWorkoutScrollAndFocus({
  normalizedDate,
  exercisesLength,
  scrollKey,
  location,
}: UseWorkoutScrollAndFocusParams) {
  const [isScrolling, setIsScrolling] = useState(false);
  const isRestoringScroll = useRef(false);
  const lastScrollPosition = useRef(0);
  const focusAppliedRef = useRef(false);

  useEffect(() => {
    focusAppliedRef.current = false;
  }, [normalizedDate, location.key]);

  useEffect(() => {
    if (!normalizedDate || exercisesLength === 0) return;

    const tryFocusExercise = () => {
      const focusExerciseId = (location.state as any)?.focusExerciseId as string | undefined;
      if (!focusExerciseId || focusAppliedRef.current) return false;
      const el = document.getElementById(`exercise-${focusExerciseId}`);
      if (!el) return false;
      focusAppliedRef.current = true;
      isRestoringScroll.current = true;
      const header = document.querySelector('.header-container') as HTMLElement | null;
      const headerBottom = header ? header.getBoundingClientRect().bottom : 0;
      const spacing = 12;
      const rect = el.getBoundingClientRect();
      const targetTop = Math.max(0, window.scrollY + rect.top - headerBottom - spacing);
      window.scrollTo({ top: targetTop, behavior: 'smooth' });
      if ((el as any).animate) {
        (el as any).animate(
          [
            { boxShadow: '0 0 0 rgba(59,130,246,0)' },
            { boxShadow: '0 0 0 4px rgba(59,130,246,0.6)' },
            { boxShadow: '0 0 0 rgba(59,130,246,0)' },
          ],
          { duration: 1200, easing: 'ease-in-out' }
        );
      }
      setTimeout(() => {
        isRestoringScroll.current = false;
      }, 600);
      return true;
    };

    const restoreScroll = () => {
      try {
        const saved = localStorage.getItem(scrollKey);
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
      } catch (e) {
        console.error('Error restoring scroll:', e);
      }
    };

    if (!tryFocusExercise()) {
      restoreScroll();
    }
  }, [normalizedDate, exercisesLength, scrollKey, location.state]);

  useEffect(() => {
    if (!normalizedDate) return;

    let ticking = false;

    const handleScroll = () => {
      lastScrollPosition.current = window.scrollY;
      setIsScrolling(window.scrollY > 0);

      if (!ticking && !isRestoringScroll.current) {
        window.requestAnimationFrame(() => {
          try {
            localStorage.setItem(scrollKey, String(lastScrollPosition.current));
          } catch (e) {
            // Ignore quota errors
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [normalizedDate, scrollKey]);

  useEffect(() => {
    return () => {
      if (normalizedDate && lastScrollPosition.current > 0) {
        try {
          localStorage.setItem(scrollKey, String(lastScrollPosition.current));
        } catch (e) {
          // Ignore
        }
      }
    };
  }, [normalizedDate, scrollKey]);

  return { isScrolling };
}
