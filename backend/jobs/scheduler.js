// Trabajos programados con node-cron (§9.7, §12 4.5).
// Tras la migración a ADR-004 (ver docs/decisions/ADR-004-periodic-jobs-governance.md),
// este archivo solo REGISTRA schedules — la lógica de negocio vive en archivos
// individuales (e.g. report-snapshot.js) que exportan `runJobName()`.
//
// La expresión cron es configurable vía REPORT_CRON (por defecto: 07:00 a diario).
// Se puede desactivar poniendo DISABLE_CRON=true (útil en tests).
import cron from 'node-cron';
import { runReportSnapshot } from './report-snapshot.js';

const DEFAULT_SCHEDULE = '0 7 * * *'; // todos los días a las 07:00

export function startCronJobs(fastify) {
  if (process.env.DISABLE_CRON === 'true') {
    fastify.log.info('[cron] Deshabilitado por DISABLE_CRON=true.');
    return null;
  }

  const schedule = process.env.REPORT_CRON || DEFAULT_SCHEDULE;
  const expr = cron.validate(schedule) ? schedule : DEFAULT_SCHEDULE;
  if (schedule !== expr) {
    fastify.log.warn(`[cron] Expresión inválida "${schedule}"; se usa "${expr}".`);
  }

  cron.schedule(expr, async () => {
    fastify.log.info('[cron] Generando reporte periódico…');
    try {
      const result = await runReportSnapshot();
      fastify.log.info(
        `[cron] Reporte #${result.stats.snapshotId} generado ` +
          `(${result.stats.conAlerta} alertas) en ${result.durationMs}ms.`
      );
    } catch (e) {
      fastify.log.error({ err: e }, '[cron] Fallo al generar el reporte periódico');
    }
  });

  fastify.log.info(`[cron] Reporte periódico programado ("${expr}").`);
}
