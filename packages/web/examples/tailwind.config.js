module.exports = {
  mode: 'jit',
  purge: [
    'index.html',
    './ts-vanilla/**/*.html',
    './ts-vanilla/**/*.{js,jsx,ts,tsx,vue}',
    './src/**/*.{js,jsx,ts,tsx,vue}',
  ],
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {},
  },
  variants: {},
  plugins: [],
}
