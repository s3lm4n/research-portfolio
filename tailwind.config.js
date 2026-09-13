/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./*.html"],
  theme: {
    extend: {
      colors: {
        anthracite: '#111827',
        secondary: '#6b7280',
        border: '#e5e7eb',
        accent: '#1e40af',
        subtle: '#e5e7eb'
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
