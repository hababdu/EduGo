/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Fon — sof qora emas, iliqroq tund indigo
        base: '#14162B',
        surface: '#1B1E3A',
        surfaceRaised: '#232750',
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
        ink: {
          DEFAULT: '#F5F3ED',
          muted: '#9CA3C4',
          faint: '#5B5F82',
        },
      },
      fontFamily: {
        display: ['Fraunces', 'serif'],
        sans: ['Manrope', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
