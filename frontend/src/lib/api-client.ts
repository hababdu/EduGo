import { useAuthStore } from '../store/auth.store';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

let refreshPromise: Promise<void> | null = null;

async function refreshSession(): Promise<void> {
  const { refreshToken, setSession, clearSession, user } = useAuthStore.getState();
  if (!refreshToken) {
    clearSession();
    throw new ApiError(401, 'Sessiya tugagan');
  }

  const res = await fetch(`${API_URL}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    clearSession();
    throw new ApiError(401, 'Sessiyani yangilab bo\'lmadi');
  }

  const data = await res.json();
  setSession({
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    user: data.user ?? user!,
  });
}

/**
 * Barcha himoyalangan so'rovlar shu funksiya orqali o'tadi.
 * 401 kelsa — BIR MARTA avtomatik refresh qilib, so'rovni qayta yuboradi.
 * (parallel bir nechta 401 kelsa ham faqat bitta refresh so'rovi ketadi.)
 */
export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const doFetch = async (): Promise<Response> => {
    const { accessToken } = useAuthStore.getState();
    return fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...options.headers,
      },
    });
  };

  let res = await doFetch();

  if (res.status === 401) {
    if (!refreshPromise) {
      refreshPromise = refreshSession().finally(() => {
        refreshPromise = null;
      });
    }
    await refreshPromise;
    res = await doFetch();
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.message ?? 'So\'rovda xatolik yuz berdi');
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export async function loginWithTelegram(initData: string) {
  const res = await fetch(`${API_URL}/api/v1/auth/telegram`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initData }),
  });

  if (!res.ok) {
    throw new ApiError(res.status, 'Telegram orqali kirishda xatolik');
  }

  return res.json();
}
