/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/views/**/*.{html,js}",
    "./public/**/*.{html,js}"
  ],
  darkMode: 'media',
  theme: {
    extend: {},
  },
  plugins: [require('@tailwindcss/typography')],
}
