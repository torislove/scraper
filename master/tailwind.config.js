/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          gold: '#D4AF37',
          dark: '#0a0a0a',
          card: '#1a1a1a'
        }
      }
    },
  },
  plugins: [],
}
