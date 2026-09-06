import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/auth.store';
import { getInitData, getTelegramWebApp } from '../lib/telegram';
import { loginWithTelegram } from '../lib/api-client';

type AuthStatus = 'checking' | 'authenticated' | 'error' | 'no-telegram';

/**
 * Mini App yuklanganda BIR MARTA ishga tushadi: initData'ni oladi,
 * backendga yuborib, JWT sessiyani o'rnatadi. Xato bo'lsa (masalan
 * botdan tashqarida ochilgan bo'lsa) foydalanuvchiga tushunarli holat qaytaradi.
 *
 * VAQTINCHALIK: `debugInfo` maydoni production muammosini diagnostika qilish
 * uchun qo'shildi — muammo hal bo'lgach olib tashlanadi.
 */
export function useAuth() {
  const [status, setStatus] = useState<AuthStatus>('checking');
  const [debugInfo, setDebugInfo] = useState<string>('');
  const setSession = useAuthStore((s) => s.setSession);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) {
      setStatus('authenticated');
      return;
    }

    const tg = getTelegramWebApp();
    const initData = getInitData();

    const diag = [
      `window.Telegram mavjud: ${typeof window !== 'undefined' && !!window.Telegram}`,
      `WebApp mavjud: ${!!tg}`,
      `initData uzunligi: ${tg?.initData?.length ?? 'n/a'}`,
      `platform: ${(tg as any)?.platform ?? 'n/a'}`,
      `version: ${(tg as any)?.version ?? 'n/a'}`,
    ].join(' | ');
    setDebugInfo(diag);

    if (!initData) {
      setStatus('no-telegram');
      return;
    }

    loginWithTelegram(initData)
      .then((data) => {
        setSession({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          user: data.user,
        });
        setStatus('authenticated');
      })
      .catch((err) => {
        setDebugInfo((prev) => `${prev} | login xatosi: ${err?.message ?? err}`);
        setStatus('error');
      });
  }, [isAuthenticated, setSession]);

  return { status, debugInfo };
}
