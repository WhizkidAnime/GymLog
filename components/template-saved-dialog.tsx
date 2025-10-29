import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

type TemplateSavedDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClose?: () => void;
};

export const TemplateSavedDialog: React.FC<TemplateSavedDialogProps> = ({
  open,
  onOpenChange,
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        onOpenChange(false);
        onClose?.();
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [open, onOpenChange, onClose]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onOpenChange]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="alert" aria-live="polite">
      <div className="absolute inset-0 bg-black/60" onClick={() => onOpenChange(false)} />
      <div className={`relative w-full max-w-md glass card-dark rounded-xl shadow-xl p-6 text-center transition-all duration-300 ${
        isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
      }`}>
        <div className="flex justify-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-white">Шаблон сохранен!</h2>
      </div>
    </div>,
    document.body
  );
};

export default TemplateSavedDialog;
