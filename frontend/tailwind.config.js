/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Fon — sof qora emas, iliqroq tund indigo
        base: '#0B0D19',
        surface: '#12162A',
        surfaceRaised: '#1E2447',
        // Aksentlar — ball uchun oltin (hero rang), progress uchun teal
        gold: {
          DEFAULT: '#FFB020',
          soft: '#4A3A1A',
        },
        teal: {
          DEFAULT: '#34D0A0',
          soft: '#153B33',
        },
        coral: '#F0654B',
        sky: '#38BDF8',
        ink: {
          DEFAULT: '#F5F3ED',
          muted: '#9CA3C4',
          faint: '#5B5F82',
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
