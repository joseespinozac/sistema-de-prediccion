// Single source of truth para el sidebar de navegación.
// Una línea por feature nueva. Para agregar un item:
//   { id: 'feature', label: 'Etiqueta', href: '/path' }
// Para anchor dentro de una página:
//   { id: 'patterns', label: 'Patrones', href: '/index.html#patterns' }
// Para deshabilitar (visible pero no clickeable):
//   { id: 'futuro', label: 'Futuro', href: '#', disabled: true }
window.NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard',       href: '/index.html' },
  { id: 'connect',   label: 'Conectar Google', href: '/connect.html' },
  { id: 'patterns',  label: 'Patrones',        href: '/index.html#patterns' },
];
