/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        medical: {
          blue: '#1D4ED8',
          blueHover: '#1E40AF',
          blueLight: '#EFF6FF',
          tint: '#F8FAFC',
          mint: '#10B981',
          mintSurface: '#D1FAE5',
          mintText: '#047857',
          amber: '#F59E0B',
          amberSurface: '#FEF3C7',
          amberText: '#B45309',
          red: '#EF4444',
          redSurface: '#FEE2E2',
          redText: '#B91C1C',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
