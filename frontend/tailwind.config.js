/** @type {import('tailwindcss').Config} */
// Config para compilar Tailwind a frontend/css/app.css (npm run build:css).
// En desarrollo, las páginas usan el CDN de Tailwind para no requerir build;
// esta config queda lista para el build de producción (§11).
module.exports = {
  content: ['./frontend/**/*.html', './frontend/**/*.js'],
  theme: {
    extend: {
      colors: {
        // Paleta provisional (queda pendiente el Manual de Marca E3, §11/§14).
        brand: {
          DEFAULT: '#1f2937',
          accent: '#2563eb',
        },
      },
    },
  },
  plugins: [],
};
