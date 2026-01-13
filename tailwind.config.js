/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/**/*.{js,ts,jsx,tsx,html}'],
  theme: {
    extend: {
      colors: {
        // AccessON 브랜드 컬러
        brand: {
          brown: '#7A3D1F',
          yellow: '#F4C430',
          green: '#1DAF67',
          black: '#2C2C2C',
        },
        primary: {
          50: '#fef9f3',
          100: '#fdf0e3',
          200: '#fad9bd',
          300: '#f5b88a',
          400: '#e88f4d',
          500: '#D4722A', // Brand orange-brown
          600: '#7A3D1F', // Brand brown
          700: '#5C2E17',
          800: '#3D1F0F',
          900: '#1E0F08',
        },
        accent: {
          yellow: '#F4C430',
          green: '#1DAF67',
        },
        dark: {
          bg: '#1a1a1a',
          surface: '#2C2C2C',
          border: '#404040',
          hover: '#3d3d3d',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
        timecode: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
  darkMode: 'class',
};
