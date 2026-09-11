import axios from 'axios';

// Access tokenni xotirada (RAM) saqlash uchun o'zgaruvchi
let memoryToken: string | null = null;

export const setMemoryToken = (token: string | null) => {
  memoryToken = token;
};

export const getMemoryToken = () => {
  return memoryToken;
};

const apiClient = axios.create({
  baseURL: 'https://edugo-5h4d.onrender.com',
  withCredentials: true, // Cookie'larni yuborish uchun muhim
});

// 1. Har bir so'rovga xotiradagi tokenni qo'shish
apiClient.interceptors.request.use(
  (config) => {
    if (memoryToken) {
      config.headers.Authorization = `Bearer ${memoryToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 2. 401 (Unauthorized) xatosini ushlab, tokenni yangilashga urinish
let isRefreshing = false;

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Agar so'rov /auth/refresh ning o'zi bo'lsa va u ham 400/401 bersa, qayta urinmaslik kerak (cheksiz sikl oldini olish uchun)
    if (originalRequest.url?.includes('/auth/refresh')) {
      setMemoryToken(null);
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (!isRefreshing) {
        isRefreshing = true;
        try {
          // Backendga refresh so'rovini yuborish
          const res = await axios.post(
            'https://edugo-5h4d.onrender.com/api/v1/auth/refresh',
            {},
            { withCredentials: true }
          );

          const newToken = res.data.accessToken || res.data.token;
          setMemoryToken(newToken);
          isRefreshing = false;

          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(originalRequest);
        } catch (refreshError) {
          isRefreshing = false;
          setMemoryToken(null);
          // Sessiya butunlay yaroqsiz
          return Promise.reject(refreshError);
        }
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;