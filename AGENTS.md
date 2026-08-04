# AGENTS.md — Predictor de Tráfico E3

Cross-tool project guide for code agents. Detailed rules live in
[`docs/governance.md`](docs/governance.md) (DDD flow) and
[`docs/design-system.md`](docs/design-system.md) (UI).

## TL;DR

- Node 20+ (ESM) + Fastify 5 API REST JSON + Sequelize 6 / SQLite.
- Frontend: HTML estático + Tailwind CSS (CDN en dev, compilado en
  prod) + Alpine.js 3 + ApexCharts 3.
- Servicio de predicción en Python 3.11+ (FastAPI + Prophet
  opcional, motor de respaldo siempre disponible).
- Brand: **Predictor de Tráfico E3**. UI en español (es-MX), código
  en inglés.

**Cardinal rule:** leer los docs fuente-de-verdad (§"Source of
truth") antes de cambiar nada. Si la respuesta no está en ninguno
de ellos, preguntar.

## Setup

```bash
# 1. Instalar dependencias
npm install

# 2. Crear el archivo de entorno
cp .env.example .env   # PowerShell: Copy-Item .env.example .env

# 3. Generar las claves locales (sesión y encriptación) y pegarlas en .env
node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"

# 4. Crear la base de datos SQLite y cargar datos de demostración
npm run migrate
npm run seed

# 5. Arrancar el backend (sirve también el frontend)
npm run dev:node
```

### Servicio de predicción (Python, opcional con fallback)

Para que las predicciones usen el motor completo (Prophet), en otra
terminal:

```powershell
cd prediction-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
$env:INTERNAL_TOKEN = "el-mismo-INTERNAL_TOKEN-del-.env-de-la-raiz"
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

Prophet viene comentado por defecto; el servicio usa un motor de
respaldo (tendencia + estacionalidad semanal) que no requiere
compilación. Si Prophet no está instalado, las predicciones siguen
funcionando.

**Atajo:** `npm run dev` levanta Node + Python juntos con
`concurrently` (requiere el `.venv` ya creado y el token exportado).

Abre <http://localhost:3001/login.html> e ingresa con la cuenta
demo: `demo@e3.com` / `demo1234`.

## Dev commands

| Script | Qué hace |
|---|---|
| `npm start` | Arranca el backend en modo producción. |
| `npm run dev:node` | Backend con recarga (`node --watch`). |
| `npm run dev:python` | Servicio Python con recarga (`uvicorn --reload`). |
| `npm run dev` | Node + Python juntos (`concurrently`). |
| `npm run migrate` | Aplica migraciones (crea/actualiza SQLite). |
| `npm run migrate:undo` | Revierte la última migración. |
| `npm run seed` | Carga usuario y datos demo. |
| `npm run seed:undo` | Borra los datos demo. |
| `npm run build:css` | Compila Tailwind a `frontend/css/app.css` (producción). |
| `npm run watch:css` | Tailwind en modo watch. |
| `npm run docs:check` | Verifica la estructura de `docs/` (ver governance §9). |

## Verification gates

Antes de declarar una tarea de código terminada:

1. `npm run docs:check` — estructura de docs correcta.
2. Smoke test manual del flujo afectado en navegador (login →
   dashboard → acción → ver resultado).
3. `git diff --staged --stat` — confirmar que el diff matchea la
   intención.

Cuando se introduzcan tests automatizados, se agrega
`npm run pretest` que ejecute `tsc --noEmit` (o equivalente) +
`docs:check` + tests.

## Repo layout

```
.
├── AGENTS.md                        Estás aquí. Nav hub para code agents.
├── README.md                        Cómo correr el proyecto.
├── package.json
├── backend/                         API REST JSON (Fastify + Sequelize + cron).
│   ├── server.js
│   ├── config/                      env, DB config
│   ├── db/                          modelos, migraciones, seeders
│   ├── plugins/                     auth, errorHandler
│   ├── routes/                      endpoints (uno por recurso)
│   ├── services/                    lógica de negocio (alerts, ingest, etc.)
│   └── jobs/                        periodic jobs (ver §Periodic jobs)
├── frontend/                        UI estática servida por Fastify.
│   ├── login.html
│   ├── index.html                   Dashboard
│   ├── connect.html                 Conectar cuenta de Google
│   ├── js/api.js                    wrapper fetch
│   ├── js/dashboard.js              state de Alpine
│   ├── css/input.css                entrada de Tailwind
│   └── tailwind.config.js
├── prediction-service/              Servicio Python (FastAPI + Prophet opcional).
│   ├── main.py
│   ├── predictor.py
│   ├── requirements.txt
│   └── README.md
├── docs/                            Documentación (DDD).
│   ├── governance.md                Reglas del flujo.
│   ├── design-document.md           Fuente de verdad del sistema.
│   ├── design-system.md             UI tokens.
│   ├── roadmap.md                   Features futuras.
│   ├── progress.md                  Historial enviado.
│   ├── features/                    Specs de 13 secciones.
│   ├── rfcs/                        Proposals de 7 secciones.
│   ├── decisions/                   ADRs de 5 secciones.
│   └── implementation/              Planes atómicos + archive.
└── scripts/
    └── check-docs.mjs               Verificador de estructura de docs.
```

`dist/`, `node_modules/`, `*.sqlite`, `.env`, `.venv/`, `__pycache__/`,
`frontend/css/app.css` (build artifact) están en `.gitignore`.

## Branching

Two-branch model. Ver
[`ADR-005`](docs/decisions/ADR-005-environment-branching-strategy.md).

| Branch | Purpose | Default | Receives PRs from |
|---|---|---|---|
| `development` | Daily work, integration | yes | `feature/*`, `fix/*`, `chore/*`, `hotfix/*` |
| `production` | Released code | no | `development`, `hotfix/*` |

**Promotion flow** (one PR per jump, never push direct):

```
feature/X ──PR──▶ development ──PR──▶ production (tag vX.Y.Z)
```

**Hotfix flow**:

```
hotfix/X ──PR──▶ production (tag vX.Y.Z) ──PR──▶ development (back-merge)
```

`production` is protected: requires PR + 1 review, no force-push,
no delete. Configured in the GitHub repo settings (documented in
ADR-005; not enforced by code).

**Tags:** every merge to `production` is tagged `vX.Y.Z` (semver).
The tag message lists the features shipped.

## Source of truth (read first)

The project follows **Documentation-Driven Development** (see
[`docs/governance.md`](docs/governance.md)). The canonical reference
order is:

1. **This file** — layout, commands, gotchas, hard constraints.
2. [`docs/governance.md`](docs/governance.md) — the DDD flow rules.
3. [`docs/design-document.md`](docs/design-document.md) — the
   system as it is **today** (architecture, data model, business
   rules, flows, APIs, security, components).
4. [`docs/design-system.md`](docs/design-system.md) — UI tokens,
   es-MX copy rules, component patterns.
5. [`docs/roadmap.md`](docs/roadmap.md) — future work only.
6. [`docs/progress.md`](docs/progress.md) — shipped history only.
7. [`docs/features/<slug>.md`](docs/features/) — per-feature
   13-section specs (read the matching spec before touching the
   feature).
8. [`docs/decisions/ADR-NNN-<title>.md`](docs/decisions/) — any
   architectural question is answered here.
9. [`docs/rfcs/RFC-NNN-<title>.md`](docs/rfcs/) — open proposals.
10. [`docs/implementation/current.md`](docs/implementation/current.md) +
    [`docs/implementation/v<X>.<Y>.md`](docs/implementation/) —
    atomic task plans in execution.
11. [`README.md`](README.md) — how to run the project.

### Verification

Run `npm run docs:check` before declaring any documentation or
feature work done. The script enforces:

- ADR / RFC numbering is consecutive with no gaps.
- Every `features/*.md` (except `_template.md`) has the required
  13 sections and a `**Status:**` value from the allowed set.
- `completed` features are referenced from `docs/progress.md`.
- `in_progress` features reference an active implementation plan.
- Cross-document links resolve (no dangling anchors).
- `docs/design-document.md` does not contain legacy sprint/task
  markers.
- Scopes in implementation plans are in the allowed set.

## Hard constraints (full list forthcoming in governance §Hard rules)

1. **No secrets in client JSON, logs, or error messages.** Tokens
   OAuth encriptados con AES-256-GCM; la clave maestra solo en
   `ENCRYPTION_KEY` (variable de entorno).
2. **No implementar sin spec aprobado.** Un feature spec vive en
   `docs/features/<slug>.md` con al menos las 4 secciones mínimas
   antes de que un plan lo pueda referenciar.
3. **Periodic jobs en su propio archivo** (`backend/jobs/<name>.js`).
   No en `backend/server.js`, no inline en el orquestador del cron.
   Ver [`ADR-004`](docs/decisions/ADR-004-periodic-jobs-governance.md).
4. **Versionado del implementation plan por wave** (no por
   feature). Un `v<X>.<Y>.md` agrupa todas las features que se
   envían juntas. Ver
   [`ADR-003`](docs/decisions/ADR-003-implementation-plan-versioning.md).
5. **Asignación de `target_version` es del owner, no del
   agente.** El agente propone 2–3 opciones con rationale.

## Commit discipline

Format: `<type>(<scope>): <summary>` (English, imperative, ≤72
chars on first line).

- **type**: `feat`, `fix`, `refactor`, `docs`, `chore`, `test`,
  `style`
- **scope**: `backend`, `frontend`, `prediction-service`, `docs`,
  `deps`, `infra`

Atomic commits — one logical change per commit. Don't mix
backend + frontend in the same commit (a feature commit can
span frontend + backend only if the change is meaningless
without both; otherwise split).

Reference the wave or feature spec slug when relevant
(e.g. `feat(backend): detector de patrones (v1 reglas)`).

## Known gotchas

- `ENCRYPTION_KEY` no se commitea — vive solo en `.env`. Si se
  pierde, todos los tokens OAuth encriptados en la BD se vuelven
  ilegibles (no se pueden recuperar, hay que reconectar cada
  cuenta de Google).
- Prophet en Windows puede requerir compilación (cmdstanpy). Si
  falla, el servicio Python usa un motor de respaldo que no
  requiere dependencias pesadas. Verificar con
  `pip install prophet` solo si se quiere forecasting más
  avanzado.
- En modo Testing de Google Cloud, el refresh token expira cada
  7 días — hay que reconectar cada cuenta semanalmente hasta
  publicar la app. Ver
  [`docs/roadmap.md`](docs/roadmap.md) fila R-002.
- ApexCharts crashea si el array de `colors` tiene longitud
  distinta al número de series cuando se usa `chart.type:
  'rangeArea'`. Verificar que los 3 arrays (`colors`,
  `strokeWidth`, `dashArray`, `fillOpacity`) tengan la misma
  longitud que `series.length`. Ver
  [`docs/progress.md`](docs/progress.md) entrada del 2026-08-03
  (Fase 3).
- El `ALERT_DROP_THRESHOLD` y `MIN_HISTORY_DAYS` son puntos de
  partida, no decisiones cerradas. Se ajustan con uso real.
  Ver
  [`docs/design-document.md § Pendientes`](docs/design-document.md).
- **Puerto default del backend es 3001, no 3000.** VMware NAT
  Service (`vmnat`, PID típico ~6600) ocupa el puerto 3000 en
  hosts con VMware instalado; no se puede matar sin elevación
  admin. Si ves `EADDRINUSE: 0.0.0.0:3000`, confirma con
  `netstat -ano | findstr :3000` que es `vmnat` y arranca con
  el puerto alternativo. Override vía `PORT` en `.env`.
- **Graceful shutdown.** `backend/server.js` registra handlers
  `SIGINT`/`SIGTERM` que llaman `fastify.close()` antes de
  `exit(0)`. Esto evita que `node --watch` deje el puerto
  bindeado entre rotaciones. Si ves "Fastify cerrado. Puerto
  liberado." en el log, el reload funcionó limpio.
- **Servicio Python sin venv.** `npm run dev:python` delega en
  `scripts/run-python.js` que usa el Python del venv
  (`prediction-service/.venv/Scripts/python.exe` o `bin/python`)
  y carga las vars del `.env` raíz (incluido `INTERNAL_TOKEN`)
  para que Python valide el `X-Internal-Token` correctamente.
  Si ves "FATAL: venv no encontrado", corre `cd
  prediction-service && python -m venv .venv && pip install -r
  requirements.txt`. Si Python responde con `503 INTERNAL_TOKEN
  no configurado`, es porque el .env raíz no tiene
  `INTERNAL_TOKEN` o porque corriste uvicorn directo sin pasar
  por `scripts/run-python.js`.

## Periodic jobs

Estado actual: `backend/jobs/cron.js` mezcla schedule + handler
+ orquestación. La migración al patrón definido en
[`ADR-004`](docs/decisions/ADR-004-periodic-jobs-governance.md) es
**follow-up de la wave DDD-adoption** (no parte de esta wave).

Una vez migrado:

- `backend/jobs/report-snapshot.js` exporta `runReportSnapshot()`.
- `backend/jobs/scheduler.js` registra el `node-cron` schedule.
- `npm run jobs:run report-snapshot` invoca el job manualmente.
- El schedule se documenta aquí (default: una vez al día a la
  hora configurable vía `REPORT_CRON_SCHEDULE`).
