# ARCHIVED — superseded by `../../progress.md`

> Este archivo se conserva solo como referencia histórica de la bitácora en prosa antes de la adopción de Documentation-Driven Development ([`ADR-000`](../../decisions/ADR-000-ddd-adoption.md)). Su contenido narrativo fue convertido a la tabla en [`../../progress.md`](../../progress.md).
>
> NO edites este archivo. Para historial shipped, edita [`../../progress.md`](../../progress.md).

---

# Bitácora de implementación — Predictor de Tráfico E3

Registro histórico de qué se construyó, por qué, y cómo se verificó. Complementa
a [`implementation-plan.md`](implementation-plan.md) (el plan/fuente de verdad)
y a [`README.md`](README.md) (cómo correr el proyecto hoy).

**Cómo leer esto:** entradas en orden cronológico inverso (la más reciente
arriba). Cada entrada nueva se agrega al principio, nunca se reescribe una
entrada pasada — si algo cambia, se documenta como una entrada nueva.

---

## 2026-08-04 — ROADMAP.md + Detector de patrones semanal (v1, reglas)

**Qué se hizo:**
- Se creó [`ROADMAP.md`](ROADMAP.md): estrategia documentada de features
  futuras (prioridad mixta impacto/esfuerzo), consolidando lo ya anotado en
  §13/§14 del plan original más gaps detectados construyendo el MVP (el más
  importante: **el registro de precisión del modelo, pedido desde el §8
  original, nunca se implementó** — queda como pendiente prioritario).
- Se implementó la primera feature nueva del roadmap: **detector de
  patrones semanal** — agrega el tráfico en semanas de calendario, compara
  cada semana contra una línea base móvil (8 semanas anteriores), detecta
  episodios de caída/pico/recuperación/tendencia sostenida, los cruza con
  `external_events` ya registrados, y los narra en español por plantillas
  (sin LLM — la narración asistida por LLM queda documentada como v2 futura
  en el roadmap, a propósito, siguiendo el mismo principio de "reglas
  primero" que ya usa el motor de sugerencias de alertas).

**Por qué:** pedido explícito — poder leer en texto lo que se ve en la
gráfica ("la primera semana de mayo cayó el tráfico pero se recuperó la
segunda semana"), sin depender de que alguien lo note a ojo.

**Archivos:** `backend/services/patterns.js` (motor), `backend/routes/patterns.js`
(`GET /api/accounts/:id/patterns`), `backend/config/env.js` (umbrales
`PATTERN_*`), `backend/services/predictionClient.js` (`buildSeries` ahora
acepta rango de fechas opcional, reutilizado por el detector),
`frontend/js/dashboard.js` + `frontend/index.html` (botón "Analizar
patrones" + panel de resumen y episodios).

**Verificado con datos reales:** cuenta demo (datos sintéticos suaves) → 0
episodios, sin falsos positivos. Cuenta real "Empeño Facil" (365 días de
GA4) → 10 episodios detectados correctamente, incluyendo el cruce real con
el evento "Core Update de junio" ya registrado. **Hallazgo importante:** el
umbral por defecto (20%) resultó demasiado sensible para la volatilidad real
de esa cuenta — casi todo el año quedó cubierto por episodios "sostenidos".
Documentado en `ROADMAP.md` como punto de calibración pendiente antes de
usarlo con más cuentas.

---

## 2026-08-04 — Importación de histórico: botón manual + detección automática

**Qué se hizo:** conectar una cuenta de Google no traía el histórico solo — se
necesitaba disparar la ingesta a mano por API. Se agregó:
- Botón **"Importar histórico"** en el dashboard: trae/actualiza GA4+GSC para
  el rango de fechas seleccionado, en el momento que se quiera.
- **Detección automática**: al cambiar de cuenta o de rango de fechas, si la
  cobertura de datos es menor al 50% de los días pedidos, se importa solo,
  sin acción del usuario.

**Por qué:** al probar con la cuenta real "Empeño Facil", la tabla/gráfica se
veía vacía tras conectar — el usuario esperaba que aparecieran los datos de
inmediato.

**Archivos:** `frontend/js/dashboard.js` (`importHistory`, `importHistoryManual`,
`tryAutoImport`, `expectedDaysBetween`), `frontend/index.html` (botón + banner
de estado).

**Verificado con datos reales:** al extender el rango 500 días atrás, detectó
el hueco y trajo automáticamente **7,986 filas reales de GA4** de un periodo
nunca importado (mayo 2024), con valores de sesiones confirmados (3,502–3,931).
Search Console devolvió 0 filas para ese rango por su límite real de
retención (~16 meses) — comportamiento correcto, no un bug. El botón manual
no duplica datos ya importados.

---

## 2026-08-03 — Conexión de la primera cuenta real de Google (operativo)

**Qué se hizo:** se generaron `client_id`/`client_secret` en Google Cloud
Console (pantalla de consentimiento en modo **External/Testing**, ya que aún
no se confirma si E3 tiene Google Workspace — ver §14 del plan) y se
configuraron en `.env`. Se conectó la cuenta real **"Empeño Facil"** (GA4 +
Search Console) y se importaron 365 días de histórico: 1,214 URLs y 2,284
consultas detectadas.

**Pendiente/riesgo anotado:** en modo Testing, el refresh token de Google
expira cada 7 días — hay que reconectar semanalmente hasta publicar la app o
confirmar Workspace para pasar a modo "Internal".

---

## 2026-08-03 — Fase 4: Alertas, sugerencias, trazabilidad, salud técnica, reporte periódico

**Qué se hizo** (roadmap §12, tareas 4.1–4.8):
- **Motor de alertas** (`backend/services/alerts.js`): compara el promedio
  proyectado contra el histórico reciente; si supera el umbral configurable
  (`ALERT_DROP_THRESHOLD`), crea una fila en `alerts` (tipo caída/pico,
  severidad, % de cambio).
- **Motor de sugerencias**: cruza la alerta con `external_events` (update de
  Google reciente → sugiere auditoría de contenido) y `technical_health_checks`
  (salud técnica mala → auditoría técnica); si no hay factor externo, sugiere
  revisión manual sin forzar una causa.
- **CRUD de `strategy_log`**: registro de trazabilidad (objetivo #3 del plan)
  — acción tomada, resultado observado, autor, ligado opcionalmente a una alerta.
- **CRUD de `external_events`**: registro manual de updates de Google / eventos
  de mercado.
- **PageSpeed Insights + status code** (`backend/services/pagespeed.js`) →
  `technical_health_checks`.
- **Reporte periódico** (`backend/services/report.js` + `backend/jobs/cron.js`
  con `node-cron`): corre la predicción de todas las cuentas activas y guarda
  un snapshot en `report_snapshots` (canal de entrega email/Slack: pendiente,
  §14).
- **UI**: panel de alertas activas con sugerencia y botón "Resolver"/"Registrar
  acción"; tabla de estrategia; formulario de eventos externos.

**Verificado:** end-to-end vía API (crear evento, registrar estrategia con
autor, listar alertas, generar reporte manual) y con un umbral de prueba
mínimo para confirmar que el pipeline predicción→alerta→sugerencia escribe
correctamente.

---

## 2026-08-03 — Fase 3: Motor de predicción (Python)

**Qué se hizo** (roadmap §12, tareas 3.1–3.8):
- Servicio **FastAPI** (`prediction-service/`) con `POST /predict`, autenticado
  por header `X-Internal-Token`. Incluye **Prophet** (opcional, comentado por
  defecto) y un **motor de respaldo** (tendencia + estacionalidad semanal,
  sin dependencias de compilación) para que funcione aunque Prophet no
  instale en Windows.
- **`predictionClient.js`**: arma la serie desde `traffic_snapshots` +
  `external_events`, aplica **cold start** (<90 días de histórico → "datos
  insuficientes", no llama al modelo), llama a Python y guarda en `predictions`.
- **Overlay en la gráfica**: histórico (línea sólida) + predicción (punteada)
  + banda de confianza sombreada (ApexCharts).

**Bug encontrado y corregido durante la verificación:** el combo `rangeArea`
de ApexCharts crasheaba (`Cannot read properties of undefined`) por usar
`chart.type:'line'` junto con arrays de `fill`/`stroke` mal dimensionados.
Se corrigió usando `chart.type:'rangeArea'` y arrays de estilo del mismo
tamaño que el número real de series.

**Verificado:** predicción real con motor de respaldo (30 puntos, banda
`yhat_lower`/`yhat_upper`), sin errores de consola, con las 3 series
dibujándose correctamente.

---

## 2026-08-03 — Fase 2: Dashboard (API JSON + Alpine.js)

**Qué se hizo** (roadmap §12, tareas 2.1–2.7):
- Wrapper `fetch` (`frontend/js/api.js`) con manejo explícito de carga/error y
  redirección a login en 401.
- Pantalla de login + dashboard: selector de cuenta, selector de métrica
  (clics/impresiones de GSC · sesiones de GA4), rango de fechas comparativo,
  filtro por URL o consulta.
- Gráfica de histórico con **ApexCharts**.
- Seeder con usuario demo y **~180 días de datos sintéticos**, para poder
  desarrollar y probar sin depender de credenciales reales de Google desde
  el día uno.

**Verificado:** login end-to-end en navegador real, gráfica renderizada,
cambio de métrica reactivo, sin errores de consola.

---

## 2026-08-03 — Fase 1: Fundaciones + conexión de credenciales OAuth

**Qué se hizo** (roadmap §12, tareas 1.1–1.10):
- Setup del proyecto Node.js + Fastify (API REST JSON pura, sin SSR).
- Modelo de datos completo (11 entidades del §7) en Sequelize + SQLite, con
  migración vía `sequelize-cli` (no `sync()`, para permitir el salto a
  Postgres sin reescribir esquema).
- Autenticación del equipo: registro/login/logout con `bcrypt` + sesión en
  cookie `httpOnly` + `SameSite=Lax`, rate-limiting en login.
- Módulo de encriptación **AES-256-GCM** (`encrypt()`/`decrypt()`) — clave
  maestra solo en `ENCRYPTION_KEY` (variable de entorno), nunca en la BD ni
  en el repo.
- Flujo **OAuth2 de Google** completo: connect → callback → guardado
  encriptado → listar propiedades GA4/sitios GSC → asociar a una cuenta →
  renovar token automáticamente → desconectar (con revocación en Google).
- Ingesta de histórico GA4/GSC a `traffic_snapshots`.

**Decisiones técnicas tomadas** (no cubiertas explícitamente por el plan):
JavaScript plano (no TypeScript), npm, `@fastify/secure-session`, `googleapis`
+ `@google-analytics/data`, `node-cron`, `fetch` nativo para Node→Python,
`concurrently` para correr Node+Python juntos en desarrollo.

**Verificado:** flujo completo por API (health, login, cuentas, guard 401 sin
sesión, `password_hash` nunca expuesto en JSON) y visualmente en navegador.

**Nota de entorno:** en este equipo no había Node.js ni Python instalados —
se instalaron vía `winget` (Node 24 LTS, Python 3.12) durante esta misma
sesión.

---

## Cómo se mantiene esta bitácora

Cada vez que se implemente algo nuevo (una fase del plan, una corrección de
bug, una decisión operativa como conectar una cuenta real), se agrega una
entrada nueva **arriba de todo**, con: qué se hizo, por qué, qué archivos
tocó, y cómo se verificó. No se edita el histórico ya escrito.
