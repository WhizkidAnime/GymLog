import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useModalScrollLock } from '../hooks/use-modal-scroll-lock';
import { useI18n } from '../hooks/use-i18n';

type TemplateSavedDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean | null) => void;
  onClose?: () => void;
  templateName?: string;
  message?: string;
  durationMs?: number;
  variant?: 'success' | 'error';
};

export const TemplateSavedDialog: React.FC<TemplateSavedDialogProps> = ({
  open,
  onOpenChange,
  onClose,
  templateName,
  message,
  durationMs,
  variant = 'success',
}) => {
  const { t } = useI18n();
  const [isVisible, setIsVisible] = useState(false);

  useModalScrollLock(open);

  useEffect(() => {
    if (open) {
      setIsVisible(true);
      const duration = typeof durationMs === 'number' ? durationMs : 1000;
      const timer = setTimeout(() => {
        onOpenChange(null);
        onClose?.();
      }, duration);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [open, onOpenChange, onClose, durationMs]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === 'Escape') onOpenChange(null);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onOpenChange]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4" role="alert" aria-live="polite">
      <div className="absolute inset-0 bg-black/60" onClick={() => onOpenChange(null)} />
      <div className={`relative w-full max-w-md glass card-dark rounded-xl shadow-xl p-6 text-center transition-all duration-300 ${
        isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
      }`}>
        <div className="flex justify-center mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-12 w-12 ${variant === 'error' ? 'text-red-400' : 'text-green-400'}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            {variant === 'error' ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            )}
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-white">
          {message ?? (templateName ? t.templateSavedDialog.linkCopied.replace('{name}', templateName) : t.templateSavedDialog.templateSaved)}
        </h2>
      </div>
    </div>,
    document.body
  );
};

export default TemplateSavedDialog;
