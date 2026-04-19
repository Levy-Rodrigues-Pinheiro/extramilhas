/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0f172a',
          secondary: '#1e293b',
        },
        accent: {
          purple: '#8B5CF6',
          blue: '#3B82F6',
          emerald: '#10B981',
          amber: '#F59E0B',
        },
      },
    },
  },
  plugins: [],
};
