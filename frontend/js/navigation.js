// Single source of truth para el sidebar de navegación.
// Una línea por feature nueva. Para agregar un item:
//   { id: 'feature', label: 'Etiqueta', href: '/path' }
// Para deshabilitar (visible pero no clickeable):
//   { id: 'futuro', label: 'Futuro', href: '#', disabled: true }
//
// NOTA: items deben apuntar a paginas completas, no a anchors
// (#seccion). Los anchors confunden — visualmente parecen una
// navegacion a otra pagina pero solo hacen scroll. Las secciones
// dentro de una pagina se acceden via botones en el contenido
// (ej. "Analizar patrones" en el dashboard).
window.NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard',       href: '/index.html' },
  { id: 'accounts',  label: 'Cuentas',         href: '/accounts.html' },
  { id: 'connect',   label: 'Conectar Google', href: '/connect.html' },
];
