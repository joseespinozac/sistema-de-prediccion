// Shell reusable: sidebar (desktop + drawer mobile) + topbar.
// Se carga al FINAL del <body> (sincronico) para que el DOM este
// parseado antes de inyectar. Cada pagina autenticada declara:
//
//   <body class="bg-gray-100 text-gray-900">
//     <div id="app-shell"><!-- skeleton aqui --></div>
//     <main x-data="pageComponent()" x-init="init()">...</main>
//   </body>
//
// shell.js:
//   1. Reemplaza #app-shell con el shell completo (incluye un slot
//      <div data-app-content> donde va el contenido de la pagina).
//   2. Mueve el <main> de la pagina dentro de ese slot.
//   3. Expone window.appShell (Alpine component) antes de que Alpine
//      arranque (Alpine usa defer; corre despues de DOMContentLoaded).
//
// login.html NO usa el shell (pre-autenticacion) — no incluye
// el placeholder #app-shell ni carga este script.
//
// Orden de scripts (todos sincronicos al final del body):
//   1. /js/api.js         window.API
//   2. /js/navigation.js  window.NAV_ITEMS
//   3. /js/<page>.js      componente de la pagina (dashboard, etc.)
//   4. /js/shell.js       este archivo
//   5. alpinejs (defer)   escanea DOM y arranca
(function mountShell() {
  const SHELL_HTML = `
    <div class="flex min-h-screen" x-data="appShell">
      <!-- Backdrop mobile (cierra al click) -->
      <div
        x-show="open"
        x-cloak
        @click="open = false"
        class="md:hidden fixed inset-0 bg-black/50 z-40"
      ></div>

      <!-- Drawer mobile (sliding sidebar) -->
      <aside
        x-show="open"
        x-cloak
        x-transition:enter="transition ease-out duration-200"
        x-transition:enter-start="-translate-x-full"
        x-transition:enter-end="translate-x-0"
        x-transition:leave="transition ease-in duration-150"
        x-transition:leave-start="translate-x-0"
        x-transition:leave-end="-translate-x-full"
        class="md:hidden fixed inset-y-0 left-0 w-64 bg-white z-50 flex flex-col"
      >
        <div class="p-4 border-b border-gray-200 flex items-center justify-between">
          <span class="text-sm font-semibold">Predictor de Tráfico E3</span>
          <button @click="open = false" class="text-gray-500 hover:text-gray-900" aria-label="Cerrar menú">✕</button>
        </div>
        <nav class="flex-1 p-3 space-y-1">
          <template x-for="item in items" :key="item.id">
            <a
              :href="item.href"
              @click="open = false"
              :class="active(item)
                ? 'block rounded-md px-3 py-2 text-sm font-medium bg-blue-50 text-blue-700'
                : 'block rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-50'"
              x-text="item.label"
            ></a>
          </template>
        </nav>
      </aside>

      <!-- Sidebar desktop (siempre visible en md+) -->
      <aside class="hidden md:flex md:flex-col md:w-56 md:shrink-0 md:border-r md:border-gray-200 md:bg-white">
        <div class="p-4 border-b border-gray-200">
          <a href="/index.html" class="text-sm font-semibold">Predictor de Tráfico E3</a>
        </div>
        <nav class="flex-1 p-3 space-y-1">
          <template x-for="item in items" :key="item.id">
            <a
              :href="item.href"
              :class="active(item)
                ? 'block rounded-md px-3 py-2 text-sm font-medium bg-blue-50 text-blue-700'
                : 'block rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-50'"
              x-text="item.label"
            ></a>
          </template>
        </nav>
      </aside>

      <!-- Contenedor del header + contenido de la pagina -->
      <div class="flex-1 min-w-0 flex flex-col">
        <header class="bg-white border-b border-gray-200 px-4 py-3 flex items-center text-sm">
          <button
            @click="open = !open"
            class="md:hidden mr-3 text-gray-700 hover:text-gray-900"
            aria-label="Abrir menú"
          >
            <span x-show="!open">☰</span>
            <span x-show="open" x-cloak>✕</span>
          </button>
          <div class="flex-1"></div>
          <span class="text-gray-400 mr-4" x-text="user ? user.email : ''"></span>
          <button @click="logout()" class="text-gray-600 hover:text-gray-900">Salir</button>
        </header>
        <div class="flex-1" data-app-content></div>
      </div>
    </div>
  `;

  function appShell() {
    return {
      open: false,
      user: null,
      items: window.NAV_ITEMS || [],
      active(item) {
        return location.pathname + location.hash === item.href;
      },
      async init() {
        try {
          const me = await API.get('/api/auth/me');
          this.user = me.user;
        } catch {
          // 401: api.js ya redirige a /login.html. No hacer nada aqui.
        }
      },
      async logout() {
        try {
          await API.post('/api/auth/logout');
        } finally {
          location.href = '/login.html';
        }
      },
    };
  }

  // Exponer appShell globalmente para que Alpine lo encuentre tras la inyeccion.
  window.appShell = appShell;

  // Reemplazar iconos <i data-lucide="..."> con SVG tras Alpine init.
  // Requiere que la pagina haya cargado lucide via CDN en <head>
  // (ver docs/page-template.md).
  document.addEventListener('alpine:initialized', () => {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  });

  const placeholder = document.getElementById('app-shell');
  if (!placeholder) return; // sin shell en esta pagina (e.g. login.html)

  // Capturar el <main> de la pagina ANTES de la inyeccion (es sibling
  // inmediato del placeholder en la mayoria de paginas autenticadas).
  const pageMain = placeholder.nextElementSibling;

  // Reemplazar el placeholder (incluyendo el skeleton interno) con el shell.
  placeholder.outerHTML = SHELL_HTML;

  // Mover el <main> dentro del slot [data-app-content] del shell.
  // Asi el <main> queda dentro del flex-col container, debajo del header.
  const contentSlot = document.querySelector('[data-app-content]');
  if (contentSlot && pageMain && pageMain.tagName === 'MAIN') {
    contentSlot.appendChild(pageMain);
  }
})();

