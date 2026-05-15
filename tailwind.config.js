/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ascend: {
          950: '#0b1320',
          900: '#111827',
          800: '#1f2937',
          700: '#334155',
          600: '#475569',
          500: '#64748b',
          400: '#94a3b8',
          300: '#cbd5e1',
          200: '#e2e8f0',
          100: '#f8fafc',
        },
      },
      boxShadow: {
        glow: '0 0 80px rgba(15, 23, 42, 0.22)',
      },
    },
  },
  plugins: [],
};
