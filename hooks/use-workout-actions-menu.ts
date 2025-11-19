import { useEffect, useRef, useState } from 'react';

interface MenuPosition {
  top: number;
  left: number;
}

export function useWorkoutActionsMenu() {
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<MenuPosition | null>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const actionsBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (!actionsRef.current && !actionsBtnRef.current) return;
      const target = e.target as Node;
      const isClickOnButton = actionsBtnRef.current?.contains(target);
      const isClickOnRef = actionsRef.current?.contains(target);
      if (!isClickOnButton && !isClickOnRef) setIsActionsOpen(false);
    };
    document.addEventListener('click', fn);
    return () => document.removeEventListener('click', fn);
  }, []);

  const toggleActions = () => {
    setIsActionsOpen(prev => {
      const next = !prev;
      if (!prev && actionsBtnRef.current) {
        const r = actionsBtnRef.current.getBoundingClientRect();
        setMenuPos({ top: r.bottom + 8, left: r.right - 192 });
      }
      return next;
    });
  };

  const closeActions = () => setIsActionsOpen(false);

  return {
    isActionsOpen,
    menuPos,
    actionsRef,
    actionsBtnRef,
    toggleActions,
    closeActions,
  };
}
