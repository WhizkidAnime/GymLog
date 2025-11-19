import { useEffect } from 'react';

export function useModalScrollLock(isOpen: boolean) {
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    const prevOverscrollY = (document.body.style as any).overscrollBehaviorY;
    document.body.style.overflow = 'hidden';
    (document.body.style as any).overscrollBehaviorY = 'contain';
    return () => {
      document.body.style.overflow = prevOverflow;
      (document.body.style as any).overscrollBehaviorY = prevOverscrollY;
    };
  }, [isOpen]);
}
