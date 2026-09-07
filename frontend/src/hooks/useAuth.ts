import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/auth.store';
import { getInitData } from '../lib/telegram';
import { loginWithTelegram } from '../lib/api-client';

type AuthStatus = 'checking' | 'authenticated' | 'error' | 'no-telegram';

/**
 * Mini App yuklanganda BIR MARTA ishga tushadi: initData'ni oladi,
 * backendga yuborib, JWT sessiyani o'rnatadi. Xato bo'lsa (masalan
 * botdan tashqarida ochilgan bo'lsa) foydalanuvchiga tushunarli holat qaytaradi.
 */
export function useAuth() {
  const [status, setStatus] = useState<AuthStatus>('checking');
  const setSession = useAuthStore((s) => s.setSession);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) {
      setStatus('authenticated');
      return;
    }

    const initData = getInitData();
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
      .catch(() => setStatus('error'));
  }, [isAuthenticated, setSession]);

  return status;
}
