# ADR-004 — Governance de periodic jobs

> **Date:** 2026-08-04
> **Status:** accepted

---

## 1. Contexto

El proyecto tiene un periodic job hoy: el reporte periódico
implementado en `backend/jobs/cron.js` con `node-cron`. El job:

- Corre con `node-cron` una vez al día (configurable vía env).
- Para cada cuenta activa, genera una predicción y guarda un
  snapshot en `report_snapshots`.
- Loggea con `console.log` (no JSON estructurado).
- El handler está inline en el mismo archivo.

Esto funciona, pero el archivo mezcla tres responsabilidades:

1. El schedule (`node-cron`).
2. El handler del job (la generación del reporte).
3. La orquestación (boot del job al arrancar el servidor).

Si se agregan más periodic jobs (retention de `report_snapshots`,
notificaciones por email/Slack, etc.), este patrón no escala.

## 2. Problema

¿Qué reglas debe seguir un periodic job en este proyecto?

## 3. Alternativas

### A. Status quo (un archivo con todo inline)

Seguir con `backend/jobs/cron.js` mezclando schedule + handler +
orquestación. Agregar más jobs al mismo archivo o crear más
archivos con el mismo patrón.

**Pro:** Ya funciona. Cero reescritura.
**Contra:** Cada nuevo job es una copia del patrón actual. No hay
forma de invocar un job manualmente sin bootear el servidor. No
hay garantía de idempotencia.

### B. Adoptar la regla del proyecto gemelo

Cada periodic job vive en `backend/jobs/<job-name>.js` y exporta
una función `runJobName()`. Los jobs se invocan vía
`npm run jobs:run <job-name>`. Idempotencia obligatoria. JSON
estructurado en logs.

**Pro:** Probado en producción en el proyecto gemelo. Permite
invocar jobs manualmente sin bootear el servidor. Cada job es
testeable de forma aislada.
**Contra:** Hay que migrar el job actual de `cron.js` a un archivo
dedicado y separar el schedule del handler.

### C. Usar una librería externa (`bull`, `agenda`)

Adoptar una cola persistente con scheduler.

**Pro:** Cola real, retries, persistencia entre reboots.
**Contra:** Requiere Redis o Mongo. Overkill para 1–2 jobs.
Complejidad operacional nueva.

## 4. Decisión

**Adoptar opción B.** Reglas:

1. **Ubicación.** Cada periodic job vive en
   `backend/jobs/<job-name>.js` y exporta una función async
   `runJobName()` que retorna un resumen estructurado:
   ```js
   { jobName, startedAt, finishedAt, durationMs, stats }
   ```
2. **Orquestador.** Un único `backend/jobs/cron.js` (renombrado a
   `backend/jobs/scheduler.js` en la migración) se limita a
   registrar los schedules de cada job con `node-cron`. No contiene
   lógica de negocio.
3. **CLI runner.** `npm run jobs:run <job-name>` invoca un job
   puntual. Implementado con un script Node que importa
   dinámicamente el módulo del job.
4. **Idempotencia.** Todo job debe ser seguro de ejecutar N veces
   sin daño. Las mutaciones usan `WHERE id NOT IN (lo ya
   procesado)` o filtrado equivalente.
5. **Logging estructurado.** Cada job emite JSON con al menos:
   `jobName`, `startedAt`, `finishedAt`, `durationMs`, `stats`.
6. **Operación.** El schedule real (`node-cron` config, o crontab
   del sistema, o `CronJob` de Kubernetes) se documenta en
   `AGENTS.md §Periodic jobs`.

## 5. Consecuencias

Positivas:

- Cada job es testeable de forma aislada (`npm run jobs:run
  report-snapshot` corre el job sin bootear el servidor).
- La idempotencia explícita previene duplicados cuando un job se
  reintenta.
- El JSON estructurado permite parsear logs con `jq` o un
  dashboard externo.

Negativas:

- Migración obligatoria del job actual (`backend/jobs/cron.js`
  → `backend/jobs/report-snapshot.js` + `scheduler.js`).
  Mitigación: la migración es trivial (mover el handler, dejar
  el schedule), se hace en un commit dedicado.
- `npm run jobs:run` no se puede invocar si el job no es
  importable (depende de variables de entorno no cargadas). El
  runner debe cargar `.env` antes de importar.

Reversibilidad: alta. Consolidar los jobs en un solo archivo de
nuevo es viable (pierde los beneficios), pero la estructura
actual es la defendible a largo plazo.
