/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Georgia', 'Cambria', '"Times New Roman"', 'Times', 'serif'],
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif',
        ],
      },
      colors: {
        olive: {
          50:  '#F4F6EE',
          100: '#E7ECDA',
          200: '#CED9B5',
          300: '#B4C68F',
          400: '#9AB36A',
          500: '#80A047',
          600: '#637D37',
          700: '#4A5D29',
          800: '#323E1C',
          900: '#1A200F',
        },
        gold: {
          50:  '#FCF8EE',
          100: '#F7EDCF',
          200: '#EFDB9F',
          300: '#E6C86E',
          400: '#DCB541',
          500: '#C49B26',
          600: '#9A7B1E',
          700: '#735C16',
          800: '#4D3D0F',
          900: '#261F07',
        },
        parchment: {
          DEFAULT: '#FAF8F2',
          dark:    '#F2EDDF',
        },
      },
      boxShadow: {
        card: '0 1px 4px 0 rgba(50,62,28,0.07), 0 4px 16px 0 rgba(50,62,28,0.05)',
        'card-hover': '0 2px 8px 0 rgba(50,62,28,0.10), 0 8px 24px 0 rgba(50,62,28,0.08)',
      },
    },
  },
  plugins: [],
}
