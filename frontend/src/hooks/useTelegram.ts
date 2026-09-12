// src/hooks/useTelegram.ts
import { useEffect, useCallback } from 'react';

/* ====== FALLBACK TYPE (agar global ishlamasa) ====== */
type HapticStyle = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft';

interface TgMainButton {
  setText: (t: string) => void;
  onClick: (cb: () => void) => void;
  offClick: (cb: () => void) => void;
  show: () => void;
  hide: () => void;
  enable: () => void;
  disable: () => void;
  showProgress: (leaveActive?: boolean) => void;
  hideProgress: () => void;
}

interface TgBackButton {
  onClick: (cb: () => void) => void;
  offClick: (cb: () => void) => void;
  show: () => void;
  hide: () => void;
}

interface TgHaptic {
  impactOccurred: (s: HapticStyle) => void;
  notificationOccurred: (t: 'error' | 'success' | 'warning') => void;
}

interface TgWebApp {
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
  ready: () => void;
  expand: () => void;
  setHeaderColor: (c: string) => void;
  setBackgroundColor: (c: string) => void;
  disableVerticalSwipes: () => void;
  showAlert: (m: string, cb?: () => void) => void;
  showConfirm: (m: string, cb?: (ok: boolean) => void) => void;
  MainButton: TgMainButton;
  BackButton: TgBackButton;
  HapticFeedback: TgHaptic;
}
/* ================================================== */

export function useTelegram() {
  // ✅ Tip endi lokal — `any` ishlatmasdan ishlaydi
  const tg: TgWebApp | undefined =
    typeof window !== 'undefined'
      ? ((window as any).Telegram?.WebApp as TgWebApp | undefined)
      : undefined;

  useEffect(() => {
    if (!tg) return;
    try {
      tg.ready();
      tg.expand();
      tg.setHeaderColor('#0f0f0f');
      tg.setBackgroundColor('#0f0f0f');
      tg.disableVerticalSwipes();
    } catch (e) {
      console.warn('[useTelegram] init error:', e);
    }
  }, [tg]);

  // ... qolgan kod yuqoridagi bilan bir xil
  const haptic = useCallback(
    (style: HapticStyle = 'light') => {
      try {
        tg?.HapticFeedback.impactOccurred(style);
      } catch {}
    },
    [tg]
  );

  const hapticNotify = useCallback(
    (type: 'error' | 'success' | 'warning' = 'success') => {
      try {
        tg?.HapticFeedback.notificationOccurred(type);
      } catch {}
    },
    [tg]
  );

  const showConfirm = useCallback(
    (message: string): Promise<boolean> =>
      new Promise((resolve) => {
        if (tg?.showConfirm) {
          tg.showConfirm(message, (ok: boolean) => resolve(ok));
        } else {
          resolve(window.confirm(message));
        }
      }),
    [tg]
  );

  const showMainButton = useCallback(
    (
      text: string,
      onClick: () => void,
      opts?: { loading?: boolean; disabled?: boolean }
    ): (() => void) | undefined => {
      const mb = tg?.MainButton;
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
          } catch {}
        };
      } catch (e) {
        console.warn('[useTelegram] MainButton error:', e);
        return undefined;
      }
    },
    [tg]
  );

  const hideMainButton = useCallback(() => {
    try {
      tg?.MainButton.hide();
    } catch {}
  }, [tg]);

  const showBackButton = useCallback(
    (onClick: () => void): (() => void) | undefined => {
      const bb = tg?.BackButton;
      if (!bb) return undefined;
      try {
        bb.show();
        bb.onClick(onClick);
        return () => {
          try {
            bb.offClick(onClick);
          } catch {}
        };
      } catch (e) {
        console.warn('[useTelegram] BackButton error:', e);
        return undefined;
      }
    },
    [tg]
  );

  const hideBackButton = useCallback(() => {
    try {
      tg?.BackButton.hide();
    } catch {}
  }, [tg]);

  return {
    tg,
    user: tg?.initDataUnsafe?.user,
    colorScheme: tg?.colorScheme ?? 'dark',
    isAvailable: !!tg,
    haptic,
    hapticNotify,
    showConfirm,
    showMainButton,
    hideMainButton,
    showBackButton,
    hideBackButton,
  };
}