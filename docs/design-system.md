# Sistema de Diseño — Predictor de Tráfico E3

> **Versión:** 0.1
> **Estado:** fuente de verdad para todo el front-end (`frontend/`).
> **Última revisión:** ver `git log` del archivo.
> **Audiencia:** devs que construyen pantallas con HTML + Tailwind
> + Alpine.js + ApexCharts.

---

## 0. Convenciones generales

1. **Stack de UI**
   - **HTML estático** servido por Fastify vía `@fastify/static`.
   - **Tailwind CSS** (CDN en dev para evitar build, compilado a
     `frontend/css/app.css` para producción vía `npm run
     build:css`).
   - **Alpine.js 3** para reactividad declarativa (`x-data`,
     `x-show`, `x-for`, `x-text`).
   - **ApexCharts 3** para gráficas (histórico, predicción,
     banda de confianza).
   - **Lucide Icons** vía CDN (`<i data-lucide="nombre">`) para
     iconografía consistente en toda la UI. Ver §8 para uso.
   - **Sin frameworks SPA** (no React, no Vue, no Angular) — la
     UI es server-rendered y se hidrata con Alpine.
   - **Inspirado en Flowbite Admin Dashboard.** El layout visual
     (sidebar fijo + topbar sticky + content scrollable, stat
     cards, tablas con hover, modales con iconos, badges de
     estado) replica el lenguaje visual de Flowbite sin agregar
     la dependencia — todo se hace con utility classes de
     Tailwind. Para referencia: <https://flowbite-admin-dashboard.vercel.app/>.

2. **Idioma de la UI**
   - **Toda** copia visible para el usuario está en **español
     (es-MX)** — títulos, etiquetas, mensajes, errores, toasts,
     placeholders.
   - Los nombres de variables, archivos, mensajes de consola y
     logs van en **inglés**.

3. **Marca**
   - **Nombre comercial:** `Predictor de Tráfico E3`.
   - **Logo / identidad:** pendiente hasta que se comparta un
     Manual de Marca E3 formal (ver
     [`docs/design-document.md § Pendientes`](design-document.md#ui-ux-lineamientos)).
   - Por ahora, el header muestra solo el texto "Predictor de
     Tráfico E3" sin logo.

4. **Estructura de archivos**
   - Páginas: `frontend/<page>.html` (login, dashboard, connect).
   - JS: `frontend/js/<page>.js` — una función `<page>()` que
     devuelve el state de Alpine.
   - API client: `frontend/js/api.js` (wrapper `fetch` único).
   - CSS: `frontend/css/input.css` (entrada de Tailwind, build
     de prod).
   - Config Tailwind: `frontend/tailwind.config.js`.

5. **Naming**
   - Variables JS: `camelCase`.
   - Selectores CSS / clases Tailwind: `kebab-case`.
   - Endpoints backend: `/api/<resource>` (lowercase, plural).

---

## 1. Tokens de color

Los tokens viven en **Tailwind** (que ya los trae por default) y
se referencian vía clases. La paleta **provisional** está en
`frontend/tailwind.config.js` bajo `theme.extend.colors.brand`.

| Token Tailwind | Hex | Uso |
|---|---|---|
| `gray-50` | `#f9fafb` | Fondo de página (alternativa, no usado actualmente) |
| `gray-100` | `#f3f4f6` | Fondo de página (default) |
| `gray-200` | `#e5e7eb` | Bordes 1px |
| `gray-300` | `#d1d5db` | Bordes de inputs |
| `gray-400` | `#9ca3af` | Texto auxiliar deshabilitado |
| `gray-500` | `#6b7280` | Texto secundario, labels |
| `gray-600` | `#4b5563` | Texto body en hover, links secundarios |
| `gray-700` | `#374151` | Texto body, títulos de sección |
| `gray-800` | `#1f2937` | Header (texto), botón "Importar histórico" |
| `gray-900` | `#111827` | Texto principal del body |
| `blue-50` | `#eff6ff` | Fondo de mensajes info (reservado) |
| `blue-600` | `#2563eb` | Botón primario (Generar predicción, Guardar) |
| `blue-700` | `#1d4ed8` | Hover del botón primario |
| `teal-700` | `#0f766e` | Botón "Analizar patrones" |
| `teal-800` | `#115e59` | Hover de "Analizar patrones" |
| `red-50` | `#fef2f2` | Fondo de mensajes de error |
| `red-200` | `#fecaca` | Borde de error |
| `red-600` | `#dc2626` | Texto de error (botón "Borrar") |
| `red-700` | `#b91c1c` | Badge "Caída" |
| `red-800` | `#991b1b` | Texto de error (banner) |
| `emerald-50` | `#ecfdf5` | Fondo de badge "Pico / recuperado" |
| `emerald-200` | `#a7f3d0` | Borde de badge "Pico" |
| `emerald-600` | `#059669` | Texto "✓ recuperado" |
| `emerald-700` | `#047857` | Badge "Pico" |

### Colores de ApexCharts (no Tailwind)

Estos hex están hardcoded en `frontend/js/dashboard.js` y
deben vivir en paralelo a la tabla de arriba:

| Hex | Uso |
|---|---|
| `#2563eb` | Serie "Histórico" (línea sólida) |
| `#93c5fd` | Serie "Confianza" (banda rangeArea, fill 0.2) |
| `#f59e0b` | Serie "Predicción" (línea punteada, dashArray 6) |

**Regla:** si necesitas un color que no está en la tabla, primero
pregunta si debe existir. Si la respuesta es sí, agrégalo a esta
tabla y, si aplica, a `frontend/tailwind.config.js`.

---

## 2. Tipografía

| Nivel | Uso | Clases Tailwind |
|---|---|---|
| Brand / Header | Texto en `<header>` (topbar) | `text-sm font-semibold` (14 / 20) |
| Section title | Título de sección dentro de card | `text-sm font-medium text-gray-700` |
| Section title large | Título de página | (no usado actualmente; default `text-base`) |
| Body | Texto por defecto | `text-sm` (14 / 20) |
| Small / help | Texto auxiliar, labels | `text-xs` (12 / 16) |
| Mono | Fechas, IDs | `font-mono text-xs text-gray-500` |

**Familia:** default de Tailwind (system-ui fallback). Sin fuente
custom cargada por ahora.

---

## 3. Espaciado y layout

Escala de Tailwind (`p-1` a `p-16`) — usar siempre estos valores.
**No** inventar valores en px.

| Caso | Clases |
|---|---|
| Page padding | `max-w-6xl mx-auto px-4 py-6` |
| Card padding | `p-4` o `p-8` (empty state) |
| Gap entre cards | `gap-6` (grid) o `mb-6` (stack) |
| Form gap | `gap-2` (flex) o `space-y-3` (stack) |
| Header height | `py-3` (header bar) |
| Card radius | `rounded-xl` (cards) o `rounded-md` (inputs/buttons) |
| Border | `border border-gray-200` |

---

## 4. Componentes recurrentes

### Card

```html
<section class="bg-white border border-gray-200 rounded-xl p-4 mb-6">
  <h2 class="text-sm font-medium text-gray-700 mb-3">Título de la sección</h2>
  <!-- contenido -->
</section>
```

Variantes:
- Con título + contador: añadir `<span class="text-xs text-gray-400" x-text="..."></span>` a la derecha del título, en un `flex items-center justify-between`.
- Loading overlay: `class="... relative"` + `<div class="absolute inset-0 bg-white/70 flex items-center justify-center z-10 rounded-xl"><span class="text-sm text-gray-500">Cargando…</span></div>`.
- Error banner: `class="... text-red-800 bg-red-50 border border-red-200"` (en lugar de `bg-white border border-gray-200`).

### Botones

| Tipo | Clases | Ejemplo |
|---|---|---|
| Primario | `bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-md px-4 py-2` | "Generar predicción", "Guardar" |
| Secundario oscuro | `bg-gray-700 hover:bg-gray-800 disabled:opacity-60 text-white text-sm font-medium rounded-md px-3 py-2` | "Importar histórico" |
| Acción contextual | `bg-teal-700 hover:bg-teal-800 disabled:opacity-60 text-white text-sm font-medium rounded-md px-4 py-2` | "Analizar patrones" |
| Peligro (texto) | `text-xs text-red-600 hover:underline` | "Borrar" (en línea) |
| Link inline | `text-xs underline` o `text-blue-600 hover:underline` | "Resolver", "Registrar acción" |

Estado disabled: siempre con `disabled:opacity-60` y
`:disabled="loadingFlag"`.

### Input (texto/fecha/select)

```html
<input class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
```

Selects y date inputs usan la misma clase que inputs de texto.

### Badge de tipo (caída / pico / recuperado)

```html
<span class="px-2 py-0.5 rounded text-xs font-medium border bg-red-50 text-red-700 border-red-200">
  Caída
</span>
<!-- variante pico -->
<span class="... bg-emerald-50 text-emerald-700 border-emerald-200">
  Pico
</span>
```

Si el episodio es "sostenido", se concatena " sostenida" al texto
en el JS (no se modela con clase separada).

### Tabla (registro de estrategia)

```html
<table class="w-full text-sm">
  <thead>
    <tr class="text-left text-gray-500 border-b border-gray-200">
      <th class="py-1 pr-2">…</th>
    </tr>
  </thead>
  <tbody>
    <tr class="border-b border-gray-100">
      <td class="py-1 pr-2">…</td>
    </tr>
  </tbody>
</table>
```

### Empty state

```html
<div class="bg-white border border-gray-200 rounded-xl p-8 text-center">
  <p class="text-gray-600 mb-3">Mensaje de estado vacío</p>
  <a href="…" class="inline-block bg-blue-600 text-white text-sm rounded-md px-4 py-2">
    Acción primaria
  </a>
</div>
```

---

## 5. Estados de carga y error

Regla copiada de `docs/design-document.md § UI/UX`: cada fetch
debe manejar explícitamente sus 3 estados.

| Estado | Cómo se muestra |
|---|---|
| Loading inicial (carga la página) | Spinner overlay en el card afectado (ver §4 Card) o en toda la sección |
| Loading puntual (botón) | Texto del botón cambia a "Calculando…" / "Importando…" / "Analizando…" con `x-show`, fondo con `disabled:opacity-60` |
| Error | Banner rojo en la parte superior de `<main>` (`text-red-800 bg-red-50 border border-red-200 rounded-md px-4 py-2`), mensaje en `x-text="error"` |
| Vacío | Empty state card (`p-8 text-center`) o mensaje inline en gris (`text-sm text-gray-400`) |
| Sin datos para la gráfica | ApexCharts `noData.text: "Sin datos para este rango."` |

---

## 6. Gráfica (ApexCharts)

Tres series, en este orden:

1. **Histórico** — `type: 'line'`, color `#2563eb` (azul), sin
   `dashArray`, `fill.opacity: 1`.
2. **Confianza** — `type: 'rangeArea'`, color `#93c5fd` (azul
   claro), `fill.opacity: 0.2` (banda sombreada).
3. **Predicción** — `type: 'line'`, color `#f59e0b` (ámbar),
   `dashArray: 6` (punteada), `fill.opacity: 1`.

Convención: el último punto del histórico se duplica como primer
punto de la predicción (puente visual). Esto se hace en
`frontend/js/dashboard.js renderChart()`.

Configuración obligatoria:

- `chart.type`: `rangeArea` cuando hay predicción, `line` cuando no
  (ApexCharts crashea si se mezclan mal — ver entrada del 2026-08-03 en `docs/progress.md`).
- `chart.height: 380`.
- `chart.fontFamily: 'inherit'`.
- `chart.toolbar.show: true` (zoom + export).
- `xaxis.type: 'datetime'`, `xaxis.labels.datetimeUTC: false`
  (fechas locales del navegador del usuario).
- `yaxis.labels.formatter`: `(v) => Math.round(v).toLocaleString('es-MX')`
  para separadores de miles correctos.
- `tooltip.x.format: 'dd MMM yyyy'`.
- `stroke.curve: 'smooth'`.
- `dataLabels.enabled: false`.

---

## 7. Shell de la app (sidebar + topbar inyectados)

El shell es la "chrome" común a todas las páginas autenticadas
(sidebar + topbar + drawer mobile). **Se inyecta una sola vez en
`<div id="app-shell">`** por `frontend/js/shell.js` — las páginas
no la duplican.

### Estructura del layout

```
desktop (≥md):
┌──────────┬────────────────────────────────────────┐
│ SIDEBAR  │ Header (hamburger mobile + user/logout)│
│ (w-56)   ├────────────────────────────────────────┤
│  brand   │                                        │
│  nav     │ Main content (inyectado por la pagina)│
│          │                                        │
└──────────┴────────────────────────────────────────┘

mobile (<md):
┌────────────────────────────────────────┐
│ ☰  Header                          user  │
├────────────────────────────────────────┤
│  Main content                          │
└────────────────────────────────────────┘
[☰ → drawer desliza desde la izquierda + backdrop]
```

### Anatomía de una página autenticada (mínima)

```html
<!doctype html>
<html lang="es">
  <head>
    <script src="https://cdn.tailwindcss.com"></script>
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
    <style>[x-cloak] { display: none !important; }</style>
  </head>
  <body class="bg-gray-100 text-gray-900">
    <div id="app-shell">
      <!-- Skeleton: ocupa el espacio del sidebar mientras shell.js inyecta. -->
      <div class="hidden md:block md:w-56 md:border-r md:border-gray-200 md:bg-white md:min-h-screen"></div>
    </div>

    <main class="px-4 py-6 max-w-6xl w-full" x-data="dashboard()" x-init="init()">
      <!-- contenido de la pagina aqui -->
    </main>

    <script src="/js/api.js"></script>
    <script src="/js/navigation.js"></script>
    <script src="/js/dashboard.js"></script>
    <script src="/js/shell.js"></script>
  </body>
</html>
```

`shell.js` se carga **al final del body** (sincronico, DOM ya
parseado) — antes que Alpine arranque (Alpine usa `defer`). shell.js
hace:

1. Captura el `<main>` hermano del placeholder (siguienteElementSibling).
2. Reemplaza `#app-shell` con el shell completo (template literal).
3. Mueve el `<main>` capturado dentro del slot
   `[data-app-content]` del shell (queda dentro del flex-col container,
   debajo del header).
4. Expone `window.appShell` (Alpine component) para que el shell
   se inicialice cuando Alpine escanee el DOM.

### Skeleton (prevención de layout shift)

Sin skeleton, mientras shell.js no haya inyectado el shell, el
espacio del sidebar está vacío y el contenido se "corre" hacia la
izquierda cuando aparece. El `<div class="hidden md:block md:w-56...">`
dentro de `#app-shell` ocupa exactamente el ancho del sidebar
desktop y desaparece con el placeholder tras la inyección.

### Single source of truth: `NAV_ITEMS`

`frontend/js/navigation.js` exporta `window.NAV_ITEMS` — un array
de items. Una línea por feature nueva:

```js
window.NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard',       href: '/index.html' },
  { id: 'accounts',  label: 'Cuentas',         href: '/accounts.html' },
  { id: 'connect',   label: 'Conectar Google', href: '/connect.html' },
];
```

**Reglas para items:**

| Caso | Forma |
|---|---|
| Página completa | `{ id, label, href: '/ruta.html' }` ✅ preferido |
| Item deshabilitado (feature planeada, no implementada) | `{ ..., disabled: true }` (atenuado, no clickeable) |
| ❌ **Evitar anchors** (`/pagina#seccion`) | Confunden al usuario: visualmente parece navegar a otra página pero solo hace scroll dentro de la actual. Las secciones dentro de una página se acceden con botones en el contenido. |

### Active state logic

```js
function active(item) {
  return location.pathname + location.hash === item.href;
}
```

Implementada en `appShell` (dentro de shell.js).

### Tokens del shell

| Elemento | Desktop | Mobile |
|---|---|---|
| Ancho sidebar | `w-56` (224px) | `w-64` (256px) cuando drawer abierto |
| Borde derecho | `border-r border-gray-200` | n/a |
| Fondo | `bg-white` | `bg-white` (drawer) / `bg-black/50` (backdrop) |
| Padding interno | `p-3` para nav, `p-4` para brand top | igual |
| Skeleton placeholder | `md:w-56 md:border-r md:border-gray-200 md:bg-white md:min-h-screen` | n/a (drawer cerrado) |

### Item activo vs inactivo

| Estado | Clases |
|---|---|
| Inactivo | `block rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-50` |
| Activo | `block rounded-md px-3 py-2 text-sm font-medium bg-blue-50 text-blue-700` |

Ambos usan el mismo `px-3 py-2` para que el cambio de estado no
mueva el layout.

### Drawer mobile (z-index y animación)

| Capa | z-index | Animación |
|---|---|---|
| Backdrop | `z-40` | sin animación (aparece/desaparece) |
| Drawer | `z-50` | `x-transition` slide-in 200ms / slide-out 150ms |

El click en el backdrop cierra el drawer (`@click="open = false"`).
El click en cualquier item del drawer también cierra
(`@click="open = false"`) antes de navegar.

### Páginas que usan el shell

| Página | Shell | Por qué |
|---|---|---|
| `login.html` | ❌ no | Pre-autenticación, no hay chrome |
| `index.html` | ✅ sí | Dashboard principal |
| `connect.html` | ✅ sí | Setup de cuenta |
| `accounts.html` | ✅ sí | Gestión de cuentas |
| Páginas futuras | ✅ sí | Por defecto en todas las autenticadas |

### Reglas de uso

1. **Cualquier nueva página autenticada** declara el shell —
   no copies el markup del sidebar.
2. **Si necesitas email del usuario o logout**, no los pidas
   tú — el shell los expone via Alpine scope inheritance
   (`this.user`, `logout()` disponibles en `<main>`).
3. **Si una página solo necesita datos de dominio**, no declares
   `user` ni `logout` en su Alpine component — reusa los del shell.
4. **El `<main>` debe ser hermano inmediato del `#app-shell`** —
   shell.js asume `placeholder.nextElementSibling` para encontrarlo.

---

## 8. Iconografía con Lucide

### Setup

```html
<!-- En <head>, antes del script defer de Alpine (orden importa: Lucide primero) -->
<script defer src="https://unpkg.com/lucide@latest"></script>
<script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
```

### Uso básico

```html
<i data-lucide="home" class="w-5 h-5"></i>
```

Lucide reemplaza el `<i>` por el SVG correspondiente cuando se llama
`createIcons()`. El shell hace esto automáticamente al inicializar
Alpine.

### Tamaños estándar

| Tamaño | Clases Tailwind | Uso |
|---|---|---|
| Pequeño | `w-4 h-4` (16px) | Botones con icono + texto, headers de sección, badges |
| Mediano | `w-5 h-5` (20px) | Items de sidebar, items de menú, iconos de card |
| Grande | `w-6 h-6` (24px) | Botones standalone (ej. hamburger), iconos destacados |
| XL | `w-7 h-7` (28px) | Iconos de página (header), empty states |

### Colores (foreground)

Lucide usa `currentColor` para el stroke, así que se controla con
clases de color Tailwind:

| Color | Clases |
|---|---|
| Default (gris) | `text-gray-400` (en headers), `text-gray-500` (en items) |
| Brand | `text-blue-600` |
| Success | `text-emerald-600` |
| Warning | `text-amber-600` |
| Danger | `text-red-600` |
| White (sobre bg oscuro) | `text-white` |

Para iconos dentro de un círculo con fondo de color, usar el patrón
`bg-{color}-50 text-{color}-600`:

```html
<span class="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-blue-50 text-blue-600">
  <i data-lucide="building-2" class="w-5 h-5"></i>
</span>
```

### Contenido dinámico (renderizado por Alpine)

Cuando `x-for` o `x-show` crea nuevos nodos con iconos después de
la carga inicial, hay que re-escanear el DOM. Dos opciones:

**Opción A — global en cada `<main>`** (preferida para páginas con mucho contenido dinámico):

```html
<main x-data="pageComponent()" x-init="init(); $nextTick(() => lucide.createIcons())">
```

Esto re-escanea después de cada cambio de state. Costo: ~1ms por
scan. Aceptable para nuestra escala.

**Opción B — selectiva después de operaciones específicas:**

```js
await this.loadData();
this.$nextTick(() => lucide.createIcons());
```

Usar cuando el costo de re-escanear todo el DOM es alto.

### Catálogo de iconos usados en el proyecto

| Icono | Uso |
|---|---|
| `trending-up` | Logo de la app (header + login) |
| `layout-dashboard` | Item de sidebar: Dashboard |
| `building-2` | Item de sidebar: Cuentas |
| `plug` | Item de sidebar: Conectar Google |
| `menu` | Botón hamburger (mobile) |
| `chevron-right` | Breadcrumb separator |
| `chevron-down` | Dropdown indicator |
| `search` | Search input (decorativo por ahora) |
| `log-out` | Dropdown user: Cerrar sesión |
| `sliders-horizontal` | Header de sección: Filtros |
| `download` | Botón: Importar histórico |
| `line-chart` | Botón: Generar predicción / Header de gráfica |
| `activity` | Botón: Analizar patrones / Header de patrones |
| `alert-triangle` | Header de sección: Alertas / Stat card icon |
| `calendar` | Header de sección: Eventos / Stat card icon |
| `check-square` | Header de sección: Estrategia / Stat card icon |
| `building-plus` | Empty state icon |
| `inbox` | Empty state icon (Cuentas) |
| `mail` | Input icon: email |
| `lock` | Input icon: password |
| `log-in` | Login header icon |
| `alert-circle` | Login error icon |
| `arrow-right` | Login submit button |
| `loader-2` | Loading spinner (animate-spin) |
| `external-link` | Botón: Conectar cuenta de Google |
| `shield-check` | Conectar paso 1 icon |
| `list-tree` | Conectar paso 2 icon |
| `save` | Botón: Guardar |
| `pencil` | Botón: Editar |
| `trash-2` | Botón: Eliminar |
| `refresh-cw` | Botón: Reactivar |
| `plus` | Botón: Agregar / Nuevo |
| `check` | Step indicator: paso completado |

Para buscar más iconos: <https://lucide.dev/icons>.

---

## 9. Page template

El template canónico para nuevas páginas está documentado en
[`docs/page-template.md`](page-template.md). Resumen rápido:

```html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>TÍTULO · Predictor de Tráfico E3</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script defer src="https://unpkg.com/lucide@latest"></script>
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
    <style>[x-cloak] { display: none !important; }</style>
  </head>
  <body class="bg-gray-50 text-gray-900">
    <div id="app-shell">
      <div class="hidden md:block md:w-64 md:border-r md:border-gray-200 md:bg-white md:h-screen"></div>
    </div>
    <main class="px-4 md:px-6 py-6 max-w-7xl w-full" x-data="pageComponent()" x-init="init(); $nextTick(() => lucide.createIcons())">
      <header class="mb-6">
        <h1 class="flex items-center gap-2 text-2xl font-semibold text-gray-900">
          <i data-lucide="nombre-icono" class="w-7 h-7 text-blue-600"></i>
          Título de la página
        </h1>
        <p class="text-sm text-gray-500 mt-1">Subtítulo opcional.</p>
      </header>
      <!-- contenido aquí -->
    </main>
    <script src="/js/api.js"></script>
    <script src="/js/navigation.js"></script>
    <script src="/js/page.js"></script>
    <script src="/js/shell.js"></script>
  </body>
</html>
```

---

## 10. Reglas de copy (es-MX)

- **Tuteo directo.** "Conectar", "Generar", "Importar" (no
  "Conectarse", "Genera tu predicción").
- **Verbos en imperativo** para botones y CTAs.
- **Tiempos:** "Cargando datos…", "Calculando…", "Importando…"
  con la elipsis Unicode (`…`, no tres puntos).
- **Fechas:** formato es-MX via
  `new Date(iso).toLocaleDateString('es-MX')`. Año con 4 dígitos.
- **Números grandes:** `toLocaleString('es-MX')` para separador de
  miles (coma).
- **Mensajes de error:** empiezan con la entidad, no con
  "Error:". Ej. "No se pudo conectar con Google. Verifica tus
  credenciales." (no "Error: connect failed").
- **Tildes y acentos:** correctos. No escribir "información" sin tilde.
