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
          500: '#7cb342', // Low Risk
        },
        statusAmber: {
          500: '#ffb300', // Medium Risk
        },
        softRed: {
          500: '#e57373', // High Risk
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
