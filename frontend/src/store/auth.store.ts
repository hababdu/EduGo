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
  setSession: ({ accessToken, refreshToken, user }) =>
    set({ accessToken, refreshToken, user, isAuthenticated: true }),
  clearSession: () =>
    set({ accessToken: null, refreshToken: null, user: null, isAuthenticated: false }),
}));
