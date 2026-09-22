/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#ffffff',
        surface: '#faf8f4',
        ink: {
          900: '#0d0b0a',
          800: '#201d1d',
          700: '#383434',
          500: '#6b6664',
          400: '#9e9996',
        },
        border: '#d5d2cf',
        accent: {
          pink: '#ff0090',
          green: '#00ff66',
          yellow: '#ffe600',
          lime: '#a6ff00',
          cyan: '#00f0ff',
        }
      },
      fontFamily: {
        sans: ['"Hanken Grotesk Variable"', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Hanken Grotesk Variable"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        'sm': '4px',
        'md': '8px',
        'lg': '16px',
        'xl': '20px',
        'pill': '999px',
      },
      boxShadow: {
        'huge-pink': '0 20px 50px -10px rgba(255, 0, 144, 0.3)',
        'huge-green': '0 20px 50px -10px rgba(0, 255, 102, 0.3)',
        'huge-yellow': '0 20px 50px -10px rgba(255, 230, 0, 0.3)',
        'hard': '4px 4px 0px 0px #0d0b0a',
        'hard-pink': '6px 6px 0px 0px #ff0090',
        'hard-green': '6px 6px 0px 0px #00ff66',
        'hard-yellow': '6px 6px 0px 0px #ffe600',
      }
    },
  },
  plugins: [],
}
