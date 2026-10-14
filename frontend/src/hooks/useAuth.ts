import { useEffect, useState } from 'react';
import { useAuthStore, getStoredRefreshToken } from '../store/auth.store';
import { getInitData } from '../lib/telegram';
import { loginWithTelegram } from '../lib/api-client';
import { API_URL } from '../lib/config';

type AuthStatus = 'checking' | 'authenticated' | 'error' | 'login';

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
      // Telegram'siz (PWA/APK): saqlangan refresh token bilan sessiyani tiklaymiz, bo'lmasa kirish sahifasi
      const rt = getStoredRefreshToken();
      if (!rt) {
        setStatus('login');
        return;
      }
      fetch(`${API_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: rt }),
      })
        .then(async (res) => {
          if (res.status === 401) throw new Error('expired');
          if (!res.ok) throw new Error('server');
          const d = await res.json();
          setSession({ accessToken: d.accessToken, refreshToken: d.refreshToken, user: d.user });
          setStatus('authenticated');
        })
        .catch((e) => {
          if (e?.message === 'expired') {
            useAuthStore.getState().clearSession();
            setStatus('login');
          } else setStatus('error');
        });
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
