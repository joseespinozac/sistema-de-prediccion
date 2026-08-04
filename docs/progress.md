# Progress — Predictor de Tráfico E3

> **Source of truth** para trabajo enviado. Contiene **solo**
> features completadas. El trabajo futuro vive en
> [`docs/roadmap.md`](roadmap.md). Los planes de implementación
> activos viven en [`docs/implementation/current.md`](implementation/current.md).
>
> **Append-only.** Las filas se agregan en orden cronológico, la
> más reciente arriba. Las filas nunca se editan una vez
> escritas; si una feature se revisita, una nueva fila
> supersede a la anterior.
>
> Este archivo se inicializó el **2026-08-04** con las 6 entradas
> que existían en el `BITACORA.md` original (ahora archivado en
> [`docs/implementation/archive/bitacora-pre-DDD.md`](implementation/archive/bitacora-pre-DDD.md)).
> Cada fila referencia el feature spec cuando aplique.

---

## Formato

| Date | Version | Feature | Description | Commit | Notes |
|---|---|---|---|---|---|

- **Date:** ISO 8601 (`YYYY-MM-DD`), el día que la fila aterrizó
  en la branch principal.
- **Version:** tag de release (`v0.0.0`, `v0.1.0`, `v1.0`, etc.).
- **Feature:** slug que resuelve en `docs/features/<slug>.md`, o
  label corto de chore.
- **Description:** una línea, ≤120 chars.
- **Commit:** hash de 7 chars en `development`/`production`.
- **Notes:** supersedes, follow-ups, links a ADRs.

---

## Shipped

### v0.1.0 — DDD adoption (esta wave)

| Date | Version | Feature | Description | Commit | Notes |
|---|---|---|---|---|---|
| 2026-08-04 | v0.1.0 | `ddd-adoption` | Adoptar Documentation-Driven Development: `docs/{governance,design-document,design-system,roadmap,progress}.md` + `features/` + `rfcs/` + `decisions/` + `implementation/` + `scripts/check-docs.mjs` + `AGENTS.md` raíz. 6 ADRs fundacionales (000–005). 2 branches (`development` + `production`), semver, hotfix con back-merge. | (pending) | Ver [`ADR-000`](decisions/ADR-000-ddd-adoption.md). |

### v0.0.0 — Fases 1–4 del plan original (pre-DDD)

Las siguientes filas cubren el trabajo previo a la adopción de
DDD. Cada feature tiene su spec en
`docs/features/<slug>.md` con `status: completed`.

| Date | Version | Feature | Description | Commit | Notes |
|---|---|---|---|---|---|
| 2026-08-04 | v0.0.0 | `detector-patrones-v1` | R-001 — detector de patrones semanal (v1, reglas). Backend: motor + endpoint. Frontend: botón "Analizar patrones" + panel. Hallazgo de calibración: el umbral 20% resultó demasiado sensible para la volatilidad real de "Empeño Facil" (10 episodios, varios "sostenidos" con magnitudes 128%–426%) — subir `PATTERN_DROP_THRESHOLD` o `PATTERN_BASELINE_WEEKS` antes de usar con más cuentas. | (pending) | Spec: [`features/detector-patrones-v1.md`](features/detector-patrones-v1.md). |
| 2026-08-04 | v0.0.0 | `importacion-historico-manual` | Conectar una cuenta de Google no traía el histórico solo. Botón "Importar histórico" en el dashboard (forzar rango / re-sincronizar) + detección automática al cambiar cuenta/rango si cobertura < 50%. Verificado: 7,986 filas reales de GA4 importadas para mayo 2024 de la cuenta "Empeño Facil" tras extender el rango 500 días atrás. GSC devolvió 0 filas por su límite real de retención (~16 meses). | (pending) | |
| 2026-08-03 | v0.0.0 | `conexion-google-real` | Conexión de la primera cuenta real de Google (operativo). `client_id`/`client_secret` generados en Google Cloud Console (External/Testing). Cuenta "Empeño Facil" conectada (GA4 + GSC), 365 días de histórico, 1,214 URLs y 2,284 consultas detectadas. Pendiente/riesgo: refresh token expira cada 7 días en modo Testing — reconectar semanalmente hasta publicar. | (pending) | |
| 2026-08-03 | v0.0.0 | `fase-4-alertas-trazabilidad` | Fase 4 del plan original: motor de alertas (`backend/services/alerts.js`), motor de sugerencias (cruce con `external_events` y `technical_health_checks`), CRUD de `strategy_log`, CRUD de `external_events`, PageSpeed Insights + status code → `technical_health_checks`, reporte periódico (`backend/services/report.js` + `backend/jobs/cron.js`). UI: panel de alertas + tabla de estrategia + formulario de eventos externos. Canal de entrega del reporte aún no implementado. | (pending) | |
| 2026-08-03 | v0.0.0 | `fase-3-motor-prediccion-python` | Fase 3: servicio **FastAPI** (`prediction-service/`) con `POST /predict`, auth por `X-Internal-Token`, **Prophet** (opcional, comentado por defecto) + motor de respaldo (tendencia + estacionalidad semanal, sin deps de compilación). `predictionClient.js`: arma la serie desde `traffic_snapshots` + `external_events`, aplica cold start (<90 días → "datos insuficientes"), llama a Python y guarda en `predictions`. Overlay en la gráfica (histórico sólido + predicción punteada + banda de confianza sombreada). Bug corregido durante verificación: ApexCharts crasheaba con `Cannot read properties of undefined` por usar `chart.type:'line'` con arrays de `fill`/`stroke` mal dimensionados — corregido a `chart.type:'rangeArea'` con arrays del mismo tamaño que `series.length`. | (pending) | Bug ApexCharts guardado como gotcha en `AGENTS.md`. |
| 2026-08-03 | v0.0.0 | `fase-2-dashboard` | Fase 2: wrapper `fetch` (`frontend/js/api.js`) con manejo de carga/error y redirect a login en 401. Login + dashboard: selector de cuenta, métrica (clics/impresiones de GSC · sesiones de GA4), rango de fechas comparativo, filtro por URL o consulta. Gráfica de histórico con **ApexCharts**. Seeder con usuario demo y ~180 días de datos sintéticos. | (pending) | |
| 2026-08-03 | v0.0.0 | `fase-1-fundaciones-oauth` | Fase 1: setup Node.js + Fastify (API REST JSON pura, sin SSR). Modelo de datos completo (11 entidades) en Sequelize + SQLite, con migración vía `sequelize-cli`. Autenticación: registro/login/logout con `bcryptjs` + sesión en cookie `httpOnly` + `SameSite=Lax` + rate-limiting. Módulo de encriptación **AES-256-GCM** (`encrypt()`/`decrypt()`) con clave solo en `ENCRYPTION_KEY`. Flujo **OAuth2 de Google** completo: connect → callback → guardado encriptado → listar propiedades GA4/sitios GSC → asociar a una cuenta → renovar token → desconectar (con revocación). Ingesta de histórico GA4/GSC a `traffic_snapshots`. | (pending) | |

---

## Cómo se mantiene este archivo

1. **Cuando una feature se envía:** se agrega una fila apuntando
   al spec `completed`. El hash de commit ancla la fila al
   historial git.
2. **Cuando una feature es superseded:** se agrega una nueva fila
   con una nota `Supersedes: ...`. La fila vieja se queda intacta.
3. **Auditoría trimestral:** cada fila debe resolver a un feature
   spec `completed` y a un commit hash presente en `git log`.
   `npm run docs:check` falla si la fila referencia un slug de
   feature que no es `status: completed` en su spec.

El historial pre-DDD completo vive en los archivos archivados
en
[`docs/implementation/archive/`](implementation/archive/):
`bitacora-pre-DDD.md` (fuente original en prosa),
`implementation-plan-pre-DDD.md` (plan original),
`roadmap-pre-DDD.md` (roadmap con emojis de status).
