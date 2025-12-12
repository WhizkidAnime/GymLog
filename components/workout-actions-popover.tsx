import React from 'react';
import { createPortal } from 'react-dom';

type WorkoutActionsPopoverProps = {
  isOpen: boolean;
  menuPos: { top: number; left: number } | null;
  onReorder: () => void;
  onChangeTemplate: () => void;
  onDelete: () => void;
  onClose: () => void;
};

export function WorkoutActionsPopover({
  isOpen,
  menuPos,
  onReorder,
  onChangeTemplate,
  onDelete,
  onClose,
}: WorkoutActionsPopoverProps) {
  if (!isOpen || !menuPos) return null;

  return createPortal(
    <div
      className="fixed menu-popover"
      style={{ top: menuPos.top, left: menuPos.left, width: 192 }}
      role="menu"
    >
      <button
        onClick={() => {
          onClose();
          onReorder();
        }}
        className="w-full text-left px-4 py-2 hover:bg-white/10 text-gray-100 transition-colors rounded-lg"
      >
        Поменять порядок упражнений
      </button>
      <button
        onClick={() => {
          onClose();
          onChangeTemplate();
        }}
        className="w-full text-left px-4 py-2 hover:bg-white/10 text-gray-100 transition-colors rounded-lg"
      >
        Изменить тренировку
      </button>
      <button
        onClick={() => {
          onClose();
          onDelete();
        }}
        className="w-full text-left px-4 py-2 text-red-400 hover:bg-red-500/10 transition-colors rounded-lg"
      >
        Удалить
      </button>
    </div>,
    document.body
  );
}
