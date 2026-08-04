# Page Template

Template canónico para crear una nueva página autenticada en el
proyecto. Replica el estilo visual de
[Flowbite Admin Dashboard](https://flowbite-admin-dashboard.vercel.app/)
usando solo utility classes de Tailwind + iconos
[Lucide](https://lucide.dev) (sin dependencia de Flowbite).

> **Cuándo usar este template:** cualquier página nueva que requiera
> navegación (sidebar + topbar) y autenticación. Para páginas
> pre-autenticación (login), ver §"Login" más abajo.

> **Regla general:** cualquier nueva página autenticada declara el
> shell (no copies el markup del sidebar). El shell vive en
> [`frontend/js/shell.js`](../frontend/js/shell.js) y se inyecta en
> `<div id="app-shell">` antes de que Alpine arranque.

---

## Template estándar (página autenticada)

```html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>TÍTULO · Predictor de Tráfico E3</title>

    <!-- 1. Tailwind (CDN en dev, build en prod) -->
    <script src="https://cdn.tailwindcss.com"></script>

    <!-- 2. Lucide icons (CDN) — DEBE ir antes que Alpine -->
    <script defer src="https://unpkg.com/lucide@latest"></script>

    <!-- 3. Alpine.js (defer) — arranca tras DOMContentLoaded -->
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>

    <style>
      [x-cloak] { display: none !important; }
    </style>
  </head>
  <body class="bg-gray-50 text-gray-900">

    <!-- 4. Placeholder donde shell.js inyecta sidebar + topbar.
         El skeleton ocupa el espacio del sidebar mientras carga. -->
    <div id="app-shell">
      <div class="hidden md:block md:w-64 md:border-r md:border-gray-200 md:bg-white md:h-screen"></div>
    </div>

    <!-- 5. <main> — el contenido de esta pagina. shell.js lo mueve
         dentro del slot [data-app-content] del shell tras inyectar.
         <main> DEBE ser sibling inmediato del #app-shell. -->
    <main
      class="px-4 md:px-6 py-6 max-w-7xl w-full"
      x-data="pageComponent()"
      x-init="init(); $nextTick(() => lucide.createIcons())"
    >
      <!-- 6. Header de pagina — titulo con icono + subtitulo opcional -->
      <header class="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 class="flex items-center gap-2 text-2xl font-semibold text-gray-900">
            <i data-lucide="nombre-icono" class="w-7 h-7 text-blue-600"></i>
            Título de la página
          </h1>
          <p class="text-sm text-gray-500 mt-1">Subtítulo opcional.</p>
        </div>
        <!-- Acciones del header (botones primarios) -->
        <div class="flex gap-2">
          <a href="#" class="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg px-4 py-2">
            <i data-lucide="plus" class="w-4 h-4"></i>
            Acción primaria
          </a>
        </div>
      </header>

      <!-- 7. Contenido de la pagina. Patrones comunes: -->

      <!-- Stat cards row -->
      <section class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div class="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div class="flex items-center gap-3 mb-3">
            <span class="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-blue-50 text-blue-600">
              <i data-lucide="building-2" class="w-5 h-5"></i>
            </span>
            <span class="text-xs font-medium text-gray-500 uppercase tracking-wide">Label</span>
          </div>
          <p class="text-3xl font-semibold text-gray-900" x-text="someValue"></p>
        </div>
      </section>

      <!-- Section card con icono -->
      <section class="bg-white border border-gray-200 rounded-xl shadow-sm p-5 mb-6">
        <h2 class="flex items-center gap-2 text-sm font-medium text-gray-700 mb-4">
          <i data-lucide="nombre-icono" class="w-4 h-4 text-gray-400"></i>
          Título de sección
        </h2>
        <!-- contenido -->
      </section>

      <!-- Tabla con row hover -->
      <div class="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 text-left text-gray-500 border-b border-gray-200">
            <tr>
              <th class="py-3 px-4 font-medium">Columna</th>
            </tr>
          </thead>
          <tbody>
            <template x-for="item in items" :key="item.id">
              <tr class="border-b border-gray-100 hover:bg-gray-50">
                <td class="py-3 px-4" x-text="item.name"></td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </main>

    <!-- 8. Scripts de la app — orden estricto:
         api → navigation → page-specific → shell.
         Alpine (defer en head) corre via DOMContentLoaded. -->
    <script src="/js/api.js"></script>
    <script src="/js/navigation.js"></script>
    <script src="/js/page.js"></script>
    <script src="/js/shell.js"></script>
  </body>
</html>
```

---

## Login (página pre-autenticación)

Sin shell (no hay navegación pre-login). Brand en header propio,
card centrada.

```html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Ingresar · Predictor de Tráfico E3</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script defer src="https://unpkg.com/lucide@latest"></script>
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
    <style>[x-cloak] { display: none !important; }</style>
  </head>
  <body class="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
    <header class="px-6 py-5">
      <a href="/index.html" class="inline-flex items-center gap-2 text-gray-900">
        <span class="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-blue-600 text-white">
          <i data-lucide="trending-up" class="w-5 h-5"></i>
        </span>
        <span class="text-base font-semibold leading-tight">
          Predictor<br>de Tráfico E3
        </span>
      </a>
    </header>
    <div class="flex-1 flex items-center justify-center p-4">
      <div class="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-200 p-8"
           x-data="loginForm()" x-init="$nextTick(() => lucide.createIcons())">
        <div class="flex items-center justify-center mb-6">
          <span class="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-100 text-blue-600">
            <i data-lucide="log-in" class="w-6 h-6"></i>
          </span>
        </div>
        <h1 class="text-center text-xl font-semibold text-gray-900 mb-1">Iniciar sesión</h1>
        <p class="text-center text-sm text-gray-500 mb-6">Acceso del equipo E3</p>
        <!-- form -->
      </div>
    </div>
    <footer class="px-6 py-4 text-center text-xs text-gray-400">
      Predictor de Tráfico E3 · v0.3.0
    </footer>
  </body>
</html>
```

---

## Cómo agregar una nueva página al sidebar

1. Crear `frontend/<nombre>.html` siguiendo este template.
2. Crear `frontend/js/<nombre>.js` con el Alpine component:

   ```js
   function nombrePage() {
     return {
       // state
       async init() {
         // cargar datos del backend
       },
       // methods
     };
   }
   ```

3. Si la página debe aparecer en el sidebar, agregar el item a
   `frontend/js/navigation.js`:

   ```js
   window.NAV_ITEMS = [
     // items existentes
     { id: 'nuevo', label: 'Nuevo', href: '/nuevo.html', icon: 'nombre-icono-lucide' },
   ];
   ```

4. Registrar el item en la wave actual (si va junto a otras features)
   o abrir nueva wave en `docs/implementation/current.md`.

5. Verificar:
   - `npm run docs:check` pasa.
   - Reiniciar `npm run dev`.
   - Login + navegación a la nueva página.
   - Sidebar marca la página activa.
   - Topbar muestra el breadcrumb correcto.

---

## Reglas de oro

1. **Cero duplicación de chrome.** No copies el markup del sidebar.
   El shell lo inyecta.
2. **`<main>` debe ser sibling inmediato de `#app-shell`.** shell.js
   usa `placeholder.nextElementSibling` para encontrarlo.
3. **Si necesitas `user`, `logout()` o items del sidebar**, no los
   declares en tu componente Alpine — el shell los expone via scope
   inheritance.
4. **Carga Lucide en `<head>` antes que Alpine** (orden de `defer`
   scripts importa).
5. **Usa `$nextTick(() => lucide.createIcons())` en `x-init`** si la
   página tiene mucho contenido dinámico (modales, x-for).
6. **Reusa patrones del design-system** (§1–§8): stat cards, section
   cards con icono, tabla con hover, badges de estado, modal con
   icono en header.

---

## Referencias

- **Shell inyectable:** [`frontend/js/shell.js`](../frontend/js/shell.js)
- **Sidebar items:** [`frontend/js/navigation.js`](../frontend/js/navigation.js)
- **Design system:** [`docs/design-system.md`](design-system.md)
- **Iconos disponibles:** <https://lucide.dev/icons>
- **Flowbite Admin Dashboard (referencia visual):** <https://flowbite-admin-dashboard.vercel.app/>
