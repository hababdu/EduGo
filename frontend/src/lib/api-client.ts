// src/lib/api-client.ts
import { useAuthStore } from '../store/auth.store';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

let refreshPromise: Promise<void> | null = null;

/* ============================================================
   Refresh session
   ============================================================ */
async function refreshSession(): Promise<void> {
  const { refreshToken, setSession, clearSession, user } =
    useAuthStore.getState();

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
    throw new ApiError(401, "Sessiyani yangilab bo'lmadi");
  }

  const data = await res.json();
  setSession({
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    user: data.user ?? user!,
  });
}

/* ============================================================
   API FETCH OPTIONS
   ============================================================ */
export interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
  /**
   * So'rov body'si. Avtomatik `JSON.stringify` qilinadi.
   * `GET`/`DELETE` so'rovlar uchun ishlatilmaydi.
   */
  data?: unknown;

  /**
   * Native `body` — `FormData`, `Blob`, `URLSearchParams` uchun.
   */
  body?: BodyInit | null;
}

/* ============================================================
   apiFetch
   ============================================================ */
export async function apiFetch<T = unknown>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { data, headers, ...rest } = options;

  const doFetch = async (): Promise<Response> => {
    const { accessToken } = useAuthStore.getState();
    const tg = (window as any).Telegram?.WebApp;

    const finalHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(tg?.initData ? { 'X-Telegram-Init-Data': tg.initData } : {}),
      ...((headers as Record<string, string>) ?? {}),
    };

    // `data` bo'lsa — JSON.stringify
    const body: BodyInit | undefined =
      data !== undefined ? JSON.stringify(data) : rest.body ?? undefined;

    return fetch(`${API_URL}${path}`, {
      ...rest,
      headers: finalHeaders,
      ...(body !== undefined && { body }),
    });
  };

  let res = await doFetch();

  // 401 → refresh va qayta urinish
  if (res.status === 401) {
    if (!refreshPromise) {
      refreshPromise = refreshSession().finally(() => {
        refreshPromise = null;
      });
    }
    await refreshPromise;
    res = await doFetch();
  }

  // Xato
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    const msg =
      (errorBody as any).message ?? "So'rovda xatolik yuz berdi";
    throw new ApiError(res.status, Array.isArray(msg) ? msg[0] : msg);
  }

  // Bo'sh response
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

/* ============================================================
   Login via Telegram
   ============================================================ */
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