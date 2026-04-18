/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: '#0f172a',
        card: '#1e293b',
        border: '#334155',
        primary: '#f8fafc',
        secondary: '#94a3b8',
        accent: '#6366f1',
        success: '#22c55e',
        warning: '#eab308',
        danger: '#ef4444',
      },
    },
  },
  plugins: [],
};
