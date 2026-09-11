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
  withCredentials: true, // Agar refresh token httpOnly cookie'da bo'lsa kerak bo'ladi
});

// 1. So'rov yuborishdan oldin xotiradagi tokenni qo'shish
apiClient.interceptors.request.use(
  (config) => {
    if (memoryToken) {
      config.headers.Authorization = `Bearer ${memoryToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 2. 401 (Unauthorized) bo'lganda tokenni yangilash (Refresh token mexanizmi)
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: null | string = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Agar xatolik 401 bo'lsa va bu so'rov oldin takrorlanmagan bo'lsa
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Refresh token orqali yangi access token olish endpointi 
        // (Agarda refresh token sessionStorage yoki httpOnly cookie'da saqlanayotgan bo'lsa)
        const refreshToken = sessionStorage.getItem('refresh_token'); // yoki cookie'dan olinadi
        
        const res = await axios.post('https://edugo-5h4d.onrender.com/api/v1/auth/refresh', {
          refreshToken, // agar cookie ishlatilsa bu bo'sh bo'lishi mumkin
        });

        const newToken = res.data.accessToken || res.data.token;
        setMemoryToken(newToken);

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        processQueue(null, newToken);
        
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        setMemoryToken(null);
        // Token muddati tugagan yoki yaroqsiz — foydalanuvchini login qilishga yo'naltirish
        // window.location.href = '/login'; 
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;