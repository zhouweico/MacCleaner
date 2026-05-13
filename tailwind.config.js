/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        macos: {
          sidebar: '#1e1e1e',
          content: '#2c2c2e',
          surface: '#3a3a3c',
          'surface-hover': '#48484a',
          separator: 'rgba(255,255,255,0.08)',
          'text-primary': '#f5f5f7',
          'text-secondary': 'rgba(235,235,245,0.6)',
          'text-tertiary': 'rgba(235,235,245,0.3)',
          accent: '#0A84FF',
          'accent-hover': '#409cff',
          selection: 'rgba(10,132,255,0.25)',
          green: '#30D158',
          red: '#FF453A',
        },
      },
    },
  },
  plugins: [],
};
