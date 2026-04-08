/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Georgia', 'Cambria', '"Times New Roman"', 'Times', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        navy: {
          50:  '#F2F5FB',
          100: '#E2E9F5',
          200: '#C3D1EA',
          300: '#99B0D9',
          400: '#6A8DC4',
          500: '#4369AE',
          600: '#2F528F',
          700: '#1E3E74',
          800: '#142C57',
          900: '#0C1C38',
        },
        gold: {
          50:  '#FCF8EE',
          100: '#F7EDCF',
          200: '#EFDB9F',
          300: '#E5C56C',
          400: '#D9AE3D',
          500: '#C49520',
          600: '#9A7519',
          700: '#735812',
          800: '#4D3A0C',
          900: '#261D06',
        },
        canvas: '#F3F6FC',
      },
      boxShadow: {
        card: '0 1px 4px 0 rgba(14,28,64,0.07), 0 4px 16px 0 rgba(14,28,64,0.05)',
        'card-hover': '0 2px 8px 0 rgba(14,28,64,0.10), 0 8px 24px 0 rgba(14,28,64,0.08)',
      },
    },
  },
  plugins: [],
}
