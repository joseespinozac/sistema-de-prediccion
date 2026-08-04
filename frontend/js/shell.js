// Shell reusable: sidebar (desktop + drawer mobile) + topbar.
// Se inyecta en `<div id="app-shell">` antes de Alpine.start() via script
// sincronico en <head>. Asi cada pagina autenticada declara:
//
//   <body class="bg-gray-100 text-gray-900">
//     <div id="app-shell"></div>
//     <main x-data="pageComponent()" x-init="init()">...</main>
//   </body>
//
// login.html NO usa el shell (pre-autenticacion).
//
// Orden de scripts obligatorio (sincronicos antes de Alpine):
//   1. /js/api.js         window.API
//   2. /js/navigation.js  window.NAV_ITEMS
//   3. /js/shell.js       este archivo (inyecta markup + expone appShell)
//   4. /js/<page>.js      componente de la pagina (dashboard, accounts, etc.)
//   5. alpinejs (defer)   arranca tras DOMContentLoaded
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

      <!-- Topbar (header encima del main, contiene hamburger en mobile + user/logout) -->
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

  const mount = document.getElementById('app-shell');
  if (mount) {
    // outerHTML reemplaza el placeholder (incluyendo el skeleton si existe).
    mount.outerHTML = SHELL_HTML;
  }
})();
