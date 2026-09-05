import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Telegram WebApp'ni tunnel (ngrok) orqali sinash uchun
    port: 5173,
  },
});
