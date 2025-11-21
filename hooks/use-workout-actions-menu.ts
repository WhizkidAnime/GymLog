import { useEffect, useMemo, useRef, useState } from 'react';

interface MenuPosition {
  top: number;
  left: number;
}

interface UseWorkoutActionsMenuOptions {
  width?: number;
  offsetY?: number;
}

export function useWorkoutActionsMenu(options?: UseWorkoutActionsMenuOptions) {
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<MenuPosition | null>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const actionsBtnRef = useRef<HTMLButtonElement>(null);

  const { width, offsetY } = useMemo(() => ({
    width: options?.width ?? 192,
    offsetY: options?.offsetY ?? 8,
  }), [options?.width, options?.offsetY]);

  const updateMenuPosition = () => {
    if (!actionsBtnRef.current) return;
    const r = actionsBtnRef.current.getBoundingClientRect();
    setMenuPos({ top: r.bottom + offsetY, left: r.right - width });
  };

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
      if (!prev) updateMenuPosition();
      return next;
    });
  };

  const openActions = () => {
    updateMenuPosition();
    setIsActionsOpen(true);
  };

  const closeActions = () => setIsActionsOpen(false);

  return {
    isActionsOpen,
    menuPos,
    actionsRef,
    actionsBtnRef,
    openActions,
    toggleActions,
    closeActions,
  };
}
