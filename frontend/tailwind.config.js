/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        trustBlue: {
          50: '#f0f5fa',
          100: '#e1eaf5',
          200: '#c5d7eb',
          300: '#9abbdc',
          400: '#6999c9',
          500: '#467eb6',
          600: '#346395',
          700: '#2a4f78',
          800: '#254565',
          900: '#1a365d', // Deep Trust Blue
          950: '#122540',
        },
        sageGreen: {
          50:  '#f3f9ec',
          100: '#e6f3d2',
          500: '#7cb342',
          700: '#558b2f',
        },
        statusAmber: {
          50:  '#fff8e1',
          100: '#ffecb3',
          500: '#ffb300',
          700: '#f57f17',
        },
        softRed: {
          50:  '#fef2f2',
          100: '#fee2e2',
          500: '#e57373',
          600: '#ef4444',
          700: '#b91c1c',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'report-fade': {
          '0%':   { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'report-slide': {
          '0%':   { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'report-card': {
          '0%':   { opacity: '0', transform: 'translateY(20px) scale(0.97)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
      animation: {
        'report-fade':  'report-fade 0.4s ease both',
        'report-slide': 'report-slide 0.45s ease both',
        'report-card':  'report-card 0.5s ease both',
      },
    },
  },
  plugins: [],
}
