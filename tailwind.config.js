/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        neo: {
          bg: '#0f131a',
          surface: '#131722',
          muted: '#1a1f2b',
          border: '#202636',
          text: '#e6e8ee',
          subtext: '#9aa3b2',
          lime: '#cbff4d',
          violet: '#b084ff'
        }
      },
      borderRadius: {
        xl: '1.25rem',
        '2xl': '1.5rem'
      },
      boxShadow: {
        neo: '0 20px 40px rgba(0,0,0,0.35)'
      }
    },
  },
  plugins: [],
}
