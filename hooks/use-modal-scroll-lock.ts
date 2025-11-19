import { useEffect } from 'react';

let scrollLockCount = 0;
let savedScrollY = 0;
let savedBodyStyles: {
  overflow: string;
  position: string;
  top: string;
  width: string;
  overscrollBehaviorY: string | undefined;
} | null = null;

function lockBodyScroll() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  if (scrollLockCount === 0) {
    const bodyStyle = document.body.style;
    savedScrollY = window.scrollY || window.pageYOffset || 0;
    savedBodyStyles = {
      overflow: bodyStyle.overflow,
      position: bodyStyle.position,
      top: bodyStyle.top,
      width: bodyStyle.width,
      overscrollBehaviorY: (bodyStyle as any).overscrollBehaviorY,
    };

    bodyStyle.overflow = 'hidden';
    (bodyStyle as any).overscrollBehaviorY = 'contain';
    bodyStyle.position = 'fixed';
    bodyStyle.top = `-${savedScrollY}px`;
    bodyStyle.width = '100%';
  }

  scrollLockCount += 1;
}

function unlockBodyScroll() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (scrollLockCount === 0) return;

  scrollLockCount -= 1;

  if (scrollLockCount === 0 && savedBodyStyles) {
    const bodyStyle = document.body.style;

    bodyStyle.overflow = savedBodyStyles.overflow;
    (document.body.style as any).overscrollBehaviorY = savedBodyStyles.overscrollBehaviorY;
    bodyStyle.position = savedBodyStyles.position;
    bodyStyle.top = savedBodyStyles.top;
    bodyStyle.width = savedBodyStyles.width;

    window.scrollTo(0, savedScrollY);
    savedBodyStyles = null;
  }
}

export function useModalScrollLock(isOpen: boolean) {
  useEffect(() => {
    if (!isOpen) return;

    lockBodyScroll();
    return () => {
      unlockBodyScroll();
    };
  }, [isOpen]);
}
