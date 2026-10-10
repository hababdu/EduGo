import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Volume2, VolumeX } from '../../design/icons';
import { useNotifications } from '../../hooks/useNotifications';
import { isSoundEnabled, playSound, setSoundEnabled, subscribeSound } from '../../lib/sound';
import { toast } from '../ui/Toast';

const CLICKABLE = 'button, a[href], [role="button"], summary, select, input[type="checkbox"], input[type="radio"]';

/** Barcha tugmalar uchun bosish ovozi + sahifa almashganda yengil "o'tish" ovozi. */
export function SoundEffects() {
  const { pathname } = useLocation();
  const first = useRef(true);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest?.(CLICKABLE) as HTMLElement | null;
      if (!el || (el as HTMLButtonElement).disabled || el.getAttribute('aria-disabled') === 'true' || el.dataset.silent !== undefined) return;
      playSound('tap');
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    playSound('nav');
  }, [pathname]);

  return null;
}

/** Yangi bildirishnoma kelganda ovoz + xabar (har 60 soniyada tekshiriladi). */
export function NotificationSound() {
  const { data } = useNotifications();
  const seen = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!data) return;
    const unread = data.filter((n) => !n.isRead);
    if (seen.current === null) {
      seen.current = new Set(data.map((n) => n.id)); // birinchi yuklash — ovozsiz
      return;
    }
    const fresh = unread.filter((n) => !seen.current!.has(n.id));
    data.forEach((n) => seen.current!.add(n.id));
    if (fresh.length) {
      playSound('notify');
      toast('info', fresh.length === 1 ? fresh[0].title : `${fresh.length} ta yangi xabar`);
    }
  }, [data]);

  return null;
}

/** Sahifa almashganda yumshoq paydo bo'lish animatsiyasi. */
export function PageTransition({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return <div key={pathname} className="page-in">{children}</div>;
}

/** Ovozni yoqish/o'chirish tugmasi. */
export function SoundToggle({ floating = false }: { floating?: boolean }) {
  const on = useSyncExternalStore(subscribeSound, isSoundEnabled, () => true);
  const [, force] = useState(0);
  void force;
  const Icon = on ? Volume2 : VolumeX;
  return (
    <button
      type="button"
      data-silent
      onClick={() => setSoundEnabled(!on)}
      aria-label={on ? "Ovozni o'chirish" : 'Ovozni yoqish'}
      aria-pressed={on}
      className={
        floating
          ? 'fixed left-3 bottom-[92px] z-40 h-9 w-9 rounded-full bg-surface/70 backdrop-blur border border-white/10 text-ink-muted flex items-center justify-center active:scale-95 transition'
          : 'flex items-center gap-2 rounded-2xl bg-surface/50 border border-white/10 px-4 py-3 text-sm text-ink w-full'
      }
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {!floating && <span>{on ? 'Ovoz effektlari: yoqilgan' : "Ovoz effektlari: o'chirilgan"}</span>}
    </button>
  );
}
