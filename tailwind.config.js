/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', 'system-ui', 'sans-serif'],
        script: ['"Great Vibes"', 'cursive']
      },
      // Paleta del brandboard de Twins Beauty
      colors: {
        cream: '#FAF2E2',
        cocoa: '#6D5247',
        cocoa2: '#4F3A32',
        mauve: '#AC8A81',
        blush: '#FEDDF8',
        star: '#F7A8E6',
        sand: '#F3E6DC',
        line: '#EAD9CC',
        line2: '#D9C6BD',
        muted: '#7D6056'
      }
    }
  },
  plugins: []
}
