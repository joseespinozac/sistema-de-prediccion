// Shell reusable: sidebar (w-64, desktop + drawer mobile) + topbar con
// search + user + breadcrumb slot. Diseno inspirado en Flowbite Admin
// Dashboard, replicado manualmente con utility classes de Tailwind.
//
// Se carga al FINAL del <body> (sincronico) para que el DOM este
// parseado antes de inyectar. Cada pagina autenticada declara:
//
//   <body class="bg-gray-50 text-gray-900">
//     <div id="app-shell"><!-- skeleton aqui --></div>
//     <main x-data="pageComponent()" x-init="init()">...</main>
//   </body>
//
// shell.js:
//   1. Reemplaza #app-shell con el shell completo (incluye un slot
//      <div data-app-content> donde va el contenido de la pagina).
//   2. Mueve el <main> de la pagina dentro de ese slot.
//   3. Expone window.appShell (Alpine component).
//   4. Escucha 'alpine:initialized' para reemplazar iconos Lucide
//      (<i data-lucide="..."> con <svg>...</svg>).
//
// login.html NO usa el shell (pre-autenticacion).
//
// Orden de scripts (todos sincronicos al final del body):
//   1. /js/api.js         window.API
//   2. /js/navigation.js  window.NAV_ITEMS
//   3. /js/<page>.js      componente de la pagina (dashboard, etc.)
//   4. /js/shell.js       este archivo
//   5. alpinejs (defer)   escanea DOM y arranca
(function mountShell() {
  const SHELL_HTML = `
    <div class="flex h-screen overflow-hidden bg-gray-50" x-data="appShell">

      <!-- Sidebar desktop (fijo a la izquierda, w-64) -->
      <aside class="hidden md:flex md:flex-col md:w-64 md:shrink-0 md:border-r md:border-gray-200 md:bg-white">
        <a href="/index.html" class="flex items-center gap-2 h-16 px-5 border-b border-gray-200 shrink-0">
          <span class="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-blue-600 text-white">
            <i data-lucide="trending-up" class="w-5 h-5"></i>
          </span>
          <span class="text-sm font-semibold text-gray-900 leading-tight">
            Predictor<br>de Tráfico E3
          </span>
        </a>
        <nav class="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <template x-for="item in items" :key="item.id">
            <a
              :href="item.href"
              :class="active(item)
                ? 'flex items-center gap-3 rounded-r-md py-2 pl-4 pr-3 text-sm font-medium bg-blue-50 text-blue-700 border-l-2 border-blue-600 -ml-px'
                : 'flex items-center gap-3 rounded-md py-2 px-3 text-sm text-gray-700 hover:bg-gray-100'"
            >
              <i :data-lucide="item.icon" class="w-5 h-5 shrink-0"></i>
              <span x-text="item.label"></span>
            </a>
          </template>
        </nav>
        <div class="px-3 py-3 border-t border-gray-200 text-xs text-gray-400">
          v0.3.0 — Flowbite style
        </div>
      </aside>

      <!-- Backdrop + drawer mobile -->
      <div
        x-show="open"
        x-cloak
        @click="open = false"
        class="md:hidden fixed inset-0 bg-gray-900/50 z-40"
      ></div>
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
        <a href="/index.html" @click="open = false" class="flex items-center gap-2 h-16 px-5 border-b border-gray-200">
          <span class="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-blue-600 text-white">
            <i data-lucide="trending-up" class="w-5 h-5"></i>
          </span>
          <span class="text-sm font-semibold text-gray-900 leading-tight">
            Predictor<br>de Tráfico E3
          </span>
        </a>
        <nav class="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <template x-for="item in items" :key="item.id">
            <a
              :href="item.href"
              @click="open = false"
              :class="active(item)
                ? 'flex items-center gap-3 rounded-r-md py-2 pl-4 pr-3 text-sm font-medium bg-blue-50 text-blue-700 border-l-2 border-blue-600 -ml-px'
                : 'flex items-center gap-3 rounded-md py-2 px-3 text-sm text-gray-700 hover:bg-gray-100'"
            >
              <i :data-lucide="item.icon" class="w-5 h-5 shrink-0"></i>
              <span x-text="item.label"></span>
            </a>
          </template>
        </nav>
        <div class="px-3 py-3 border-t border-gray-200 text-xs text-gray-400">
          v0.3.0 — Flowbite style
        </div>
      </aside>

      <!-- Columna derecha: topbar sticky + content slot scrollable -->
      <div class="flex-1 min-w-0 flex flex-col overflow-hidden">

        <!-- Topbar sticky (no scrollea con el content) -->
        <header class="h-16 bg-white border-b border-gray-200 px-4 md:px-6 flex items-center gap-4 shrink-0">
          <button
            @click="open = !open"
            class="md:hidden text-gray-600 hover:text-gray-900"
            aria-label="Abrir menú"
          >
            <i data-lucide="menu" class="w-6 h-6"></i>
          </button>

          <!-- Breadcrumb / titulo de pagina (placeholder, mejorado por paginas) -->
          <div class="hidden md:flex items-center gap-2 text-sm">
            <span class="text-gray-500">Predictor de Tráfico</span>
            <i data-lucide="chevron-right" class="w-4 h-4 text-gray-400"></i>
            <span class="text-gray-900 font-medium" x-text="currentTitle()"></span>
          </div>

          <div class="flex-1"></div>

          <!-- Search placeholder (decorativo por ahora) -->
          <div class="hidden md:flex items-center gap-2 max-w-xs flex-1">
            <div class="relative w-full">
              <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"></i>
              <input
                type="search"
                placeholder="Buscar…"
                class="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>
          </div>

          <!-- User dropdown -->
          <div class="relative" x-data="{ open: false }" @click.away="open = false">
            <button @click="open = !open" class="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900">
              <span class="hidden md:inline" x-text="user ? user.email : ''"></span>
              <span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold" x-text="userInitials()"></span>
              <i data-lucide="chevron-down" class="w-4 h-4 text-gray-400"></i>
            </button>
            <div
              x-show="open"
              x-cloak
              x-transition
              class="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50"
            >
              <div class="px-3 py-2 border-b border-gray-100">
                <p class="text-xs text-gray-500">Sesión activa</p>
                <p class="text-sm text-gray-900 truncate" x-text="user ? user.email : ''"></p>
              </div>
              <button
                @click="logout()"
                class="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                <i data-lucide="log-out" class="w-4 h-4"></i>
                <span>Cerrar sesión</span>
              </button>
            </div>
          </div>
        </header>

        <!-- Content slot (unico elemento con scroll vertical) -->
        <div class="flex-1 overflow-y-auto" data-app-content></div>
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
      currentTitle() {
        const item = this.items.find((i) => i.href === location.pathname);
        return item ? item.label : 'Dashboard';
      },
      userInitials() {
        if (!this.user?.email) return '?';
        const email = this.user.email;
        return email.substring(0, 2).toUpperCase();
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

  // Reemplazar iconos Lucide (<i data-lucide="..."> con <svg>) tras Alpine init.
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
