import { useEffect, useState } from 'react';

interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BIPEvent | null = null;
const subs = new Set<() => void>();

const isNative = () => !!(window as any).Capacitor?.isNativePlatform?.();
const inTelegram = () => !!(window as any).Telegram?.WebApp?.initData;

export function isStandalone(): boolean {
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone === true || isNative();
}

/** Service worker va o'rnatish tugmasi hodisasi. Telegram ichida va native ilovada ishlamaydi. */
export function initPwa() {
  if (inTelegram() || isNative()) return;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as BIPEvent;
    subs.forEach((f) => f());
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    subs.forEach((f) => f());
  });
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => { /* ixtiyoriy */ });
    });
  }
}

/** { canInstall, install, ios } — brauzer o'rnatishni taklif qilsa yoki iOS (qo'lda "Bosh ekranga qo'shish"). */
export function useInstall() {
  const [, tick] = useState(0);
  useEffect(() => {
    const f = () => tick((n) => n + 1);
    subs.add(f);
    return () => { subs.delete(f); };
  }, []);
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !isStandalone();
  return {
    canInstall: !!deferred && !isStandalone(),
    ios: ios && !inTelegram(),
    install: async () => {
      if (!deferred) return;
      await deferred.prompt();
      await deferred.userChoice;
      deferred = null;
      subs.forEach((f) => f());
    },
  };
}
