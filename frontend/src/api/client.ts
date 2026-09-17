// src/api/client.ts
import axios from 'axios';

let memoryToken: string | null = null;

export const setMemoryToken = (token: string | null) => {
  memoryToken = token;
};

export const getMemoryToken = () => memoryToken;

const API_URL =
  import.meta.env.VITE_API_URL ?? 'https://edugo-5h4d.onrender.com';

const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

/* ============================================================
   REQUEST INTERCEPTOR
   ============================================================ */
apiClient.interceptors.request.use(
  (config) => {
    // Token
    if (memoryToken) {
      config.headers.Authorization = `Bearer ${memoryToken}`;
    }

    // Telegram initData
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.initData) {
      config.headers['X-Telegram-Init-Data'] = tg.initData;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

/* ============================================================
   RESPONSE INTERCEPTOR — 401 refresh
   ============================================================ */
let isRefreshing = false;

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (originalRequest.url?.includes('/auth/refresh')) {
      setMemoryToken(null);
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (!isRefreshing) {
        isRefreshing = true;

        try {
          const res = await axios.post(
            `${API_URL}/api/v1/auth/refresh`,
            {},
            { withCredentials: true },
          );

          const newToken = res.data.accessToken || res.data.token;
          setMemoryToken(newToken);
          isRefreshing = false;

          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(originalRequest);
        } catch (refreshError) {
          isRefreshing = false;
          setMemoryToken(null);
          return Promise.reject(refreshError);
        }
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;