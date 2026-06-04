/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'bp-purple': '#5B2C6F',
        'bp-deep': '#3F1D4F',
        'bp-lavender': '#F5EDF6',
        'bp-pink': '#FAF7FB',
        'iob-blue': '#0E57A5',
        'status-green': '#10B981',
        'status-yellow': '#F59E0B',
        'status-red': '#EF4444',
        'status-gray': '#6B7280',
        'status-blue': '#0EA5E9',
      },
      fontFamily: {
        sans: ['Segoe UI', 'system-ui', '-apple-system', 'sans-serif'],
      },
      letterSpacing: {
        action: '0.05em',
      },
    },
  },
  plugins: [],
};
