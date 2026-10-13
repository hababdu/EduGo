/** @type {import('tailwindcss').Config} */
const v = (n) => `rgb(var(--c-${n}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Fon — sof qora emas, iliqroq tund indigo
        base: v('base'),
        surface: v('surface'),
        surfaceRaised: v('raised'),
        // Yarim shaffof qatlamlar uchun (qorong'i mavzuda oq, yorug'da to'q): bg-tint/5 ...
        tint: v('tint'),
        // Aksentlar — ball uchun oltin (hero rang), progress uchun teal
        gold: {
          DEFAULT: v('gold'),
          soft: v('gold-soft'),
        },
        teal: {
          DEFAULT: v('teal'),
          soft: v('teal-soft'),
        },
        coral: v('coral'),
        sky: v('sky'),
        ink: {
          DEFAULT: v('ink'),
          muted: v('muted'),
          faint: v('faint'),
        },
      },
      fontFamily: {
        display: ['Outfit', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        sans: ['Plus Jakarta Sans', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
