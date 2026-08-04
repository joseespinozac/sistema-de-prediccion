// Periodic job: snapshot del reporte de tráfico por cuenta.
// Migrado al patrón ADR-004 (ver docs/decisions/ADR-004-periodic-jobs-governance.md):
// este archivo exporta `runReportSnapshot()` que es invocable tanto por
// `backend/jobs/scheduler.js` (cuando el cron dispara) como por
// `scripts/run-jobs.js` vía `npm run jobs:run report-snapshot`.
//
// Devuelve un resumen estructurado { jobName, startedAt, finishedAt, durationMs, stats }
// para logging / observabilidad.
import { generateReport } from '../services/report.js';

export async function runReportSnapshot() {
  const startedAt = new Date();
  try {
    const snapshot = await generateReport({ save: true });
    const finishedAt = new Date();
    return {
      jobName: 'report-snapshot',
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      durationMs: finishedAt.getTime() - startedAt.getTime(),
      stats: {
        snapshotId: snapshot.id,
        cuentasEvaluadas: snapshot.contenido.cuentas_evaluadas,
        conAlerta: snapshot.contenido.con_alerta,
      },
    };
  } catch (err) {
    const finishedAt = new Date();
    return {
      jobName: 'report-snapshot',
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      durationMs: finishedAt.getTime() - startedAt.getTime(),
      stats: { error: err.message },
    };
  }
}
