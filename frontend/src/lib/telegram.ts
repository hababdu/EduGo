// Telegram tomonidan window.Telegram.WebApp orqali beriladi (index.html'dagi script)
interface TelegramWebApp {
  initData: string;
  initDataUnsafe: Record<string, unknown>;
  ready: () => void;
  expand: () => void;
  colorScheme: 'light' | 'dark';
  themeParams: Record<string, string>;
  setHeaderColor: (color: string) => void;
  HapticFeedback?: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy') => void;
    notificationOccurred: (type: 'success' | 'error' | 'warning') => void;
  };
}

declare global {
  interface Window {
    Telegram?: { WebApp: TelegramWebApp };
  }
}

/**
 * Mini App tashqarisida (oddiy brauzerda, dev paytida) ishlab ketishi uchun
 * xavfsiz fallback bilan — window.Telegram bo'lmasa null qaytaradi,
 * ilova qulamaydi.
 */
export function getTelegramWebApp(): TelegramWebApp | null {
  return typeof window !== 'undefined' && window.Telegram?.WebApp
    ? window.Telegram.WebApp
    : null;
}

export function initTelegramApp() {
  const tg = getTelegramWebApp();
  if (!tg) return;
  tg.ready();
  tg.expand();
  tg.setHeaderColor('#14162B'); // dizayn tokenidagi `base` rang bilan bir xil
}

export function getInitData(): string | null {
  return getTelegramWebApp()?.initData || null;
}


// src/lib/telegram.ts
/**
 * Telegram WebApp uchun yordamchi funksiyalar.
 * Hook emas — sof funksiyalar, istalgan joyda chaqirish mumkin.
 */

type HapticStyle = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft';

interface TgWebApp {
  ready: () => void;
  expand: () => void;
  close: () => void;
  setHeaderColor: (c: string) => void;
  setBackgroundColor: (c: string) => void;
  disableVerticalSwipes: () => void;
  initData: string;
  initDataUnsafe: {
    user?: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
      photo_url?: string;
    };
  };
  colorScheme: 'light' | 'dark';
  HapticFeedback: {
    impactOccurred: (s: HapticStyle) => void;
    notificationOccurred: (t: 'error' | 'success' | 'warning') => void;
    selectionChanged: () => void;
  };
  MainButton: {
    setText: (t: string) => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
    show: () => void;
    hide: () => void;
    enable: () => void;
    disable: () => void;
    showProgress: (leaveActive?: boolean) => void;
    hideProgress: () => void;
  };
  BackButton: {
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
    show: () => void;
    hide: () => void;
  };
}

function getTg(): TgWebApp | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as any).Telegram?.WebApp;
}

/* ============================================================
   HAPTIC
   ============================================================ */
export function haptic(style: HapticStyle = 'light') {
  try {
    getTg()?.HapticFeedback?.impactOccurred(style);
  } catch {
    /* noop */
  }
}

export function hapticNotify(type: 'error' | 'success' | 'warning' = 'success') {
  try {
    getTg()?.HapticFeedback?.notificationOccurred(type);
  } catch {
    /* noop */
  }
}

export function hapticSelection() {
  try {
    getTg()?.HapticFeedback?.selectionChanged();
  } catch {
    /* noop */
  }
}

/* ============================================================
   INIT
   ============================================================ */
export function initTelegram() {
  const tg = getTg();
  if (!tg) return;
  try {
    tg.ready();
    tg.expand();
    tg.setHeaderColor('#0f0f0f');
    tg.setBackgroundColor('#0f0f0f');
    tg.disableVerticalSwipes?.();
  } catch (e) {
    console.warn('[telegram] init error:', e);
  }
}

export function getTelegramUser() {
  return getTg()?.initDataUnsafe?.user;
}

export function getColorScheme(): 'light' | 'dark' {
  return getTg()?.colorScheme ?? 'dark';
}

/* ============================================================
   MAIN BUTTON
   ============================================================ */
export function showMainButton(
  text: string,
  onClick: () => void,
  opts?: { loading?: boolean; disabled?: boolean },
): (() => void) | undefined {
  const mb = getTg()?.MainButton;
  if (!mb) return undefined;
  try {
    mb.setText(text);
    mb.show();
    if (opts?.loading) mb.showProgress(false);
    else mb.hideProgress();
    if (opts?.disabled) mb.disable();
    else mb.enable();
    mb.onClick(onClick);
    return () => {
      try {
        mb.offClick(onClick);
      } catch {
        /* noop */
      }
    };
  } catch {
    return undefined;
  }
}

export function hideMainButton() {
  try {
    getTg()?.MainButton?.hide();
  } catch {
    /* noop */
  }
}

/* ============================================================
   BACK BUTTON
   ============================================================ */
export function showBackButton(onClick: () => void): (() => void) | undefined {
  const bb = getTg()?.BackButton;
  if (!bb) return undefined;
  try {
    bb.show();
    bb.onClick(onClick);
    return () => {
      try {
        bb.offClick(onClick);
      } catch {
        /* noop */
      }
    };
  } catch {
    return undefined;
  }
}

export function hideBackButton() {
  try {
    getTg()?.BackButton?.hide();
  } catch {
    /* noop */
  }
}

/* ============================================================
   CONFIRM
   ============================================================ */
export function showConfirm(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    const tg = getTg() as any;
    if (tg?.showConfirm) {
      tg.showConfirm(message, (ok: boolean) => resolve(ok));
    } else {
      resolve(window.confirm(message));
    }
  });
}

export function showAlert(message: string): Promise<void> {
  return new Promise((resolve) => {
    const tg = getTg() as any;
    if (tg?.showAlert) {
      tg.showAlert(message, () => resolve());
    } else {
      window.alert(message);
      resolve();
    }
  });
}