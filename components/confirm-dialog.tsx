import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useModalScrollLock } from '../hooks/use-modal-scroll-lock';
import { useI18n } from '../hooks/use-i18n';

type ConfirmDialogProps = {
  open: boolean;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary';
  confirmDisabled?: boolean;
  onConfirm: () => Promise<void> | void;
  onOpenChange: (open: boolean) => void;
  children?: React.ReactNode;
};

export const ConfirmDialog: React.FC<ConfirmDialogProps> = (props) => {
  const { t } = useI18n();
  const {
    open,
    title = t.confirmDialog.title,
    description,
    confirmText = t.confirmDialog.confirm,
    cancelText = t.common.cancel,
    variant = 'primary',
    confirmDisabled,
    onConfirm,
    onOpenChange,
    children,
  } = props;
  const [isSubmitting, setIsSubmitting] = useState(false);

  useModalScrollLock(open);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onOpenChange]);

  if (!open) return null;

  const handleConfirm = async () => {
    try {
      setIsSubmitting(true);
      await onConfirm();
      onOpenChange(false);
    } catch {
      // Ошибка уже обработана вызывающей стороной при необходимости
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60" onClick={() => onOpenChange(false)} />
      <div className="relative w-full max-w-md glass card-dark rounded-xl shadow-xl p-5">
        <div className="mb-3">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          {description && (
            <p className="mt-1 text-sm dialog-description">{description}</p>
          )}
        </div>
        {children && (
          <div className="mt-3">
            {children}
          </div>
        )}
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            className="btn-glass btn-glass-sm btn-glass-secondary"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={`btn-glass btn-glass-sm ${variant === 'danger' ? 'btn-glass-danger' : 'btn-glass-primary'}`}
            onClick={handleConfirm}
            disabled={isSubmitting || Boolean(confirmDisabled)}
          >
            {isSubmitting ? t.confirmDialog.executing : confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ConfirmDialog;


