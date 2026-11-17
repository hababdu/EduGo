// src/lib/config.ts
//
// Backend manzili — yagona manba. Production'da VITE_API_URL ni Render'da
// (EduGo frontend servisi → Environment) o'rnatish mumkin; berilmasa yangi
// production backend ishlatiladi.
const PROD_FALLBACK = 'https://edugo-q31h.onrender.com';

export const API_URL: string = (
  (import.meta.env.VITE_API_URL as string | undefined) ||
  (import.meta.env.DEV ? 'http://localhost:3000' : PROD_FALLBACK)
).replace(/\/+$/, '');
