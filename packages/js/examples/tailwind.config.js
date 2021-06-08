module.exports = {
  mode: 'jit',
  purge: [
    'index.html',
    './*vanilla*/**/*.html',
    './*vanilla*/**/*.{js,jsx,ts,tsx,vue}',
    './src/**/*.{js,jsx,ts,tsx,vue}',
  ],
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {},
  },
  variants: {},
  plugins: [require('@tailwindcss/forms')],
}
