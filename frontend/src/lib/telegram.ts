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

export function haptic(style: 'light' | 'medium' | 'heavy' = 'light') {
  getTelegramWebApp()?.HapticFeedback?.impactOccurred(style);
}
