/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#0F172A',
          card: '#1E293B',
          border: '#334155',
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
