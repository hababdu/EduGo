import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { getIslandOrigin } from './mascot-context';

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
  /** Sarlavha ostida, scroll bo'lmaydigan qator (masalan, bo'limlar almashtirgich) */
  headerSlot?: React.ReactNode;
  /** 'island' — tepa markazdan (iPhone oroli ostidan) ochiladigan oyna; 'sheet' — pastdan chiqadigan */
  variant?: 'sheet' | 'island';
  /** Emoji o'rniga ko'rsatiladigan element (masalan, jonli robot yuzi) */
  iconNode?: React.ReactNode;
}

export function AIGenerateModal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon = '🤖',
  children,
  footer,
  headerSlot,
  variant = 'sheet',
  iconNode,
}: AIGenerateModalProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);
  const island = variant === 'island';
  // Yopilish animatsiyasi tugaguncha oyna DOM'da qoladi
  const [rendered, setRendered] = useState(isOpen);
  const running = useRef<Animation[]>([]);

  const stopRunning = () => {
    running.current.forEach((a) => a.cancel());
    running.current = [];
  };
  const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Kapsula to'rtburchagidan oynaning to'liq to'rtburchagigacha clip-path (deformatsiyasiz, aniq)
  const clipFor = (panel: DOMRect) => {
    const o = getIslandOrigin() ?? {
      top: panel.top,
      left: panel.left + panel.width / 2 - 70,
      width: 140,
      height: 36,
    };
    const t = Math.max(0, o.top - panel.top);
    const l = Math.max(0, o.left - panel.left);
    const r = Math.max(0, panel.right - (o.left + o.width));
    const b = Math.max(0, panel.bottom - (o.top + o.height));
    return `inset(${t}px ${r}px ${b}px ${l}px round ${Math.min(o.height / 2, 30)}px)`;
  };

  // Ochilish bilan bir xil renderda (paintdan oldin) DOM'da bo'lishi shart: aks holda panel bir kadr to'liq ko'rinib qoladi
  useLayoutEffect(() => {
    if (isOpen) setRendered(true);
  }, [isOpen]);

  // OCHILISH: panel birinchi chizilishdan oldin kapsula shakliga keltiriladi (layout effect = paintdan oldin)
  useLayoutEffect(() => {
    if (!isOpen || !island) return;
    const panel = panelRef.current;
    if (!panel || reduced() || typeof panel.animate !== 'function') return;
    stopRunning();
    const rect = panel.getBoundingClientRect();
    const from = clipFor(rect);
    const to = 'inset(0px 0px 0px 0px round 30px)';
    const ease = 'cubic-bezier(0.22, 1, 0.36, 1)';
    const main = panel.animate([{ clipPath: from }, { clipPath: to }], { duration: 520, easing: ease, fill: 'backwards' });
    const anims: Animation[] = [
      main,
      // Kapsula (pastda turgan) bilan oyna silliq aralashadi
      panel.animate([{ opacity: 0.0 }, { opacity: 1 }], { duration: 160, easing: 'linear', fill: 'backwards' }),
    ];
    if (backdropRef.current) {
      anims.push(backdropRef.current.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 320, easing: 'ease-out', fill: 'backwards' }));
    }
    if (shadowRef.current) {
      anims.push(shadowRef.current.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 420, delay: 120, easing: 'ease-out', fill: 'backwards' }));
    }
    // Ichki qismlar kapsula ochilgach birin-ketin ko'tariladi
    panel.querySelectorAll<HTMLElement>('[data-island-part]').forEach((el, i) => {
      anims.push(
        el.animate(
          [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }],
          { duration: 380, delay: 150 + i * 70, easing: ease, fill: 'backwards' },
        ),
      );
    });
    running.current = anims;
    return () => stopRunning();
    // faqat ochilish paytida
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // YOPILISH
  useEffect(() => {
    if (isOpen || !rendered) return;
    const panel = panelRef.current;
    if (!island || !panel || reduced() || typeof panel.animate !== 'function') {
      setRendered(false);
      return;
    }
    stopRunning();
    const rect = panel.getBoundingClientRect();
    const ease = 'cubic-bezier(0.5, 0, 0.2, 1)';
    const dur = 300;
    const main = panel.animate(
      [{ clipPath: 'inset(0px 0px 0px 0px round 30px)' }, { clipPath: clipFor(rect) }],
      { duration: dur, easing: ease, fill: 'forwards' },
    );
    const anims = [
      main,
      panel.animate([{ opacity: 1 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }], { duration: dur, fill: 'forwards' }),
    ];
    if (backdropRef.current) anims.push(backdropRef.current.animate([{ opacity: 1 }, { opacity: 0 }], { duration: dur, easing: 'ease-in', fill: 'forwards' }));
    if (shadowRef.current) anims.push(shadowRef.current.animate([{ opacity: 1 }, { opacity: 0 }], { duration: dur * 0.6, fill: 'forwards' }));
    running.current = anims;
    let alive = true;
    main.finished.then(() => alive && setRendered(false)).catch(() => undefined);
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Orqa fonni scroll qilishni bloklash
  useEffect(() => {
    if (!isOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [isOpen]);

  // Esc bilan yopish
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // Ochilganda tepaga scroll qilish
  useEffect(() => {
    if (isOpen && sheetRef.current) {
      sheetRef.current.scrollTop = 0;
    }
  }, [isOpen]);

  // Qayta ochilganda ham panel DOM'da: yopilish animatsiyasi paytida isOpen true bo'lsa, rendered hali true
  if (!isOpen && !rendered) return null;

  const part = island ? { 'data-island-part': '' } : {};

  const inner = (
    <>
      {/* Drag handle (mobil hissi uchun) */}
      {!island && (
        <div className="sm:hidden flex justify-center pt-2.5 pb-1 shrink-0">
          <div className="w-9 h-1 rounded-full bg-tint/15" />
        </div>
      )}

      {/* HEADER */}
      <div
        {...part}
        className={`flex items-start justify-between gap-3 px-5 pb-4 border-b border-tint/5 shrink-0 ${island ? 'pt-3' : 'pt-2'}`}
      >
        <div className={`flex gap-3 min-w-0 ${iconNode ? 'items-center' : 'items-start'}`}>
          {iconNode ?? <span className="text-2xl leading-none shrink-0 mt-0.5">{icon}</span>}
          <div className="min-w-0">
            <h2 className="font-display text-base text-ink truncate">{title}</h2>
            {subtitle && <p className="text-xs text-ink-muted mt-0.5">{subtitle}</p>}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Yopish"
          className="shrink-0 w-9 h-9 rounded-full bg-tint/5 hover:bg-tint/10 flex items-center justify-center text-ink-muted active:scale-90 transition-transform"
        >
          ✕
        </button>
      </div>

      {headerSlot && <div {...part} className="px-5 pt-3 shrink-0">{headerSlot}</div>}

      {/* BODY */}
      <div ref={sheetRef} {...part} className="flex-1 overflow-y-auto px-5 py-4">
        {children}
      </div>

      {/* FOOTER */}
      {footer && (
        <div {...part} className="shrink-0 px-5 py-4 border-t border-tint/5 bg-base/95 backdrop-blur-md">
          {footer}
        </div>
      )}
    </>
  );

  return (
    <div
      className={island ? 'fixed inset-0 z-[110]' : 'fixed inset-0 z-50 flex flex-col justify-end sm:items-center sm:justify-center'}
      style={!isOpen ? { pointerEvents: 'none' } : undefined}
    >
      {/* BACKDROP */}
      <div
        ref={backdropRef}
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm ${island ? '' : 'animate-[aiFadeIn_0.2s_ease-out]'}`}
        onClick={onClose}
      />

      {island ? (
        <div
          className="absolute inset-x-0 mx-auto w-[calc(100%-16px)] max-w-[440px]"
          style={{ top: 'var(--island-top)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Soya alohida: clip-path uni kesib tashlamasligi uchun */}
          <div ref={shadowRef} className="pointer-events-none absolute inset-0 rounded-[30px] shadow-2xl shadow-black/60" />
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="relative bg-base/95 backdrop-blur-xl rounded-[30px] border border-tint/10 flex flex-col overflow-hidden will-change-[clip-path]"
            style={{ maxHeight: 'calc(100dvh - var(--island-top) - 12px)' }}
          >
            {inner}
          </div>
        </div>
      ) : (
        <div
          className="relative w-full sm:max-w-lg sm:mx-4 max-h-[92dvh] sm:max-h-[85vh] bg-base rounded-t-[28px] sm:rounded-[28px] border border-tint/10 shadow-2xl flex flex-col overflow-hidden animate-[aiSlideUp_0.28s_cubic-bezier(0.32,0.72,0,1)]"
          onClick={(e) => e.stopPropagation()}
        >
          {inner}
        </div>
      )}

      <style>{`
        @keyframes aiFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes aiSlideUp { from { transform: translateY(100%); opacity: 0.6; } to { transform: translateY(0); opacity: 1; } }
        @media (min-width: 640px) {
          @keyframes aiSlideUp { from { transform: translateY(16px) scale(0.97); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
        }
      `}</style>
    </div>
  );
}

export default AIGenerateModal;
