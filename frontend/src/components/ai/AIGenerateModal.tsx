import React, { useEffect, useRef } from 'react';

/* ============================================================
   AI GENERATE MODAL — umumiy bottom-sheet qobiq
   Barcha AI generatsiya oynalari (savol, material, dars rejasi,
   ota-ona xabari va h.k.) shu qobiq ichida ochiladi.
   ============================================================ */

interface AIGenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: string;
  children: React.ReactNode;
  /** Pastda doim ko'rinib turadigan tugma(lar) qatori, masalan "Generatsiya qilish" */
  footer?: React.ReactNode;
}

export function AIGenerateModal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon = '🤖',
  children,
  footer,
}: AIGenerateModalProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  // Orqa fonni scroll qilishni bloklash
  useEffect(() => {
    if (!isOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [isOpen]);

  // Ochilganda tepaga scroll qilish
  useEffect(() => {
    if (isOpen && sheetRef.current) {
      sheetRef.current.scrollTop = 0;
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:items-center sm:justify-center">
      {/* BACKDROP */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-[aiFadeIn_0.2s_ease-out]"
        onClick={onClose}
      />

      {/* SHEET */}
      <div
        className="relative w-full sm:max-w-lg sm:mx-4 max-h-[92dvh] sm:max-h-[85vh] bg-base rounded-t-[28px] sm:rounded-[28px] border border-white/10 shadow-2xl flex flex-col overflow-hidden animate-[aiSlideUp_0.28s_cubic-bezier(0.32,0.72,0,1)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle (mobil hissi uchun) */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1 shrink-0">
          <div className="w-9 h-1 rounded-full bg-white/15" />
        </div>

        {/* HEADER */}
        <div className="flex items-start justify-between gap-3 px-5 pt-2 pb-4 border-b border-white/5 shrink-0">
          <div className="flex items-start gap-3 min-w-0">
            <span className="text-2xl leading-none shrink-0 mt-0.5">
              {icon}
            </span>
            <div className="min-w-0">
              <h2 className="font-display text-base text-ink truncate">
                {title}
              </h2>
              {subtitle && (
                <p className="text-xs text-ink-muted mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Yopish"
            className="shrink-0 w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-ink-muted active:scale-90 transition-transform"
          >
            ✕
          </button>
        </div>

        {/* BODY */}
        <div ref={sheetRef} className="flex-1 overflow-y-auto px-5 py-4">
          {children}
        </div>

        {/* FOOTER */}
        {footer && (
          <div className="shrink-0 px-5 py-4 border-t border-white/5 bg-base/95 backdrop-blur-md">
            {footer}
          </div>
        )}
      </div>

      {/* Keyframe'lar — global CSS'ga qo'shish shart emas, inline style orqali */}
      <style>{`
        @keyframes aiFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes aiSlideUp {
          from { transform: translateY(100%); opacity: 0.6; }
          to { transform: translateY(0); opacity: 1; }
        }
        @media (min-width: 640px) {
          @keyframes aiSlideUp {
            from { transform: translateY(16px) scale(0.97); opacity: 0; }
            to { transform: translateY(0) scale(1); opacity: 1; }
          }
        }
      `}</style>
    </div>
  );
}

export default AIGenerateModal;