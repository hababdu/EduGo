// src/lib/config.ts
//
// Backend manzili — yagona manba. Production'da VITE_API_URL ni Render'da
// (EduGo-1 → Environment) o'rnating; berilmasa production backend ishlatiladi.
const PROD_FALLBACK = 'https://edugo-5h4d.onrender.com';

export const API_URL: string = (
  (import.meta.env.VITE_API_URL as string | undefined) ||
  (import.meta.env.DEV ? 'http://localhost:3000' : PROD_FALLBACK)
).replace(/\/+$/, '');
