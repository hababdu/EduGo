import { create } from 'zustand';

interface AuthUser {
  id: string;
  firstName: string;
  lastName?: string;
  username?: string;
  role: string;
  profilePhotoUrl?: string;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  setSession: (data: { accessToken: string; refreshToken: string; user: AuthUser }) => void;
  clearSession: () => void;
}

const RT_KEY = 'edugo.rt';

/** Telegram tashqarisida (PWA/APK) sessiya qayta ochilganda tiklanishi uchun refresh token saqlanadi. */
export function getStoredRefreshToken(): string | null {
  try { return localStorage.getItem(RT_KEY); } catch { return null; }
}
function storeRefresh(v: string | null) {
  try {
    if (v) localStorage.setItem(RT_KEY, v);
    else localStorage.removeItem(RT_KEY);
  } catch { /* ruxsat yo'q */ }
}
const inTelegram = () =>
  typeof window !== 'undefined' && !!(window as any).Telegram?.WebApp?.initData;

/**
 * Access token faqat XOTIRADA (localStorage'da EMAS) — XSS orqali
 * o'g'irlanish xavfini kamaytiradi. Refresh token uchun ham xuddi shu
 * yondashuv (production'da httpOnly cookie afzalroq, lekin Telegram
 * Mini App muhitida bu ko'pincha amaliy emas, shu sabab sessionStorage
 * bilan almashtirilishi mumkin — buni jamoa bilan kelishib qo'ying).
 */
export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  isAuthenticated: false,
  setSession: ({ accessToken, refreshToken, user }) => {
    if (!inTelegram()) storeRefresh(refreshToken || null);
    set({ accessToken, refreshToken, user, isAuthenticated: true });
  },
  clearSession: () => {
    storeRefresh(null);
    set({ accessToken: null, refreshToken: null, user: null, isAuthenticated: false });
  },
}));
