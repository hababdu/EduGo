import axios from 'axios';

let memoryToken: string | null = null;

export const setMemoryToken = (token: string | null) => {
  memoryToken = token;
};

export const getMemoryToken = () => memoryToken;

const apiClient = axios.create({
  baseURL: 'https://edugo-5h4d.onrender.com',
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  if (memoryToken) {
    config.headers.Authorization = `Bearer ${memoryToken}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Agar 401 kelsa va urinib ko'rilmagan bo'lsa
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Backend cookie ishlatayotgan bo'lsa, body bo'sh yuboriladi
        const res = await axios.post(
          'https://edugo-5h4d.onrender.com/api/v1/auth/refresh',
          {},
          { withCredentials: true }
        );

        const newToken = res.data.accessToken || res.data.token;
        setMemoryToken(newToken);

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh ham o'xshamasa, demak sessiya tugagan
        setMemoryToken(null);
        console.error("Sessiya muddati tugadi, qaytadan kirish kerak.");
        // Kerak bo'lsa login sahifasiga yo'naltirasiz
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;