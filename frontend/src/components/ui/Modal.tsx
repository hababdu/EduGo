import React, { useEffect } from 'react';

interface ModalProps {
  open: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}

export function Modal({
  open,
  title,
  message,
  confirmText = 'Tasdiqlash',
  cancelText = 'Bekor qilish',
  variant = 'default',
  onConfirm,
  onCancel,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const confirmClass =
    variant === 'danger'
      ? 'bg-red-500 text-white'
      : 'bg-gold text-base';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-surface rounded-3xl border border-white/10 p-6 space-y-4 shadow-2xl"
      >
        {title && (
          <h3 className="font-display text-lg text-ink text-center">{title}</h3>
        )}
        <p className="text-sm text-ink-muted text-center whitespace-pre-wrap leading-relaxed">
          {message}
        </p>
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={onCancel}
            className="py-3 rounded-2xl bg-white/5 text-ink-muted text-sm font-semibold active:scale-[0.98] transition-transform"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`py-3 rounded-2xl text-sm font-semibold active:scale-[0.98] transition-transform ${confirmClass}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}