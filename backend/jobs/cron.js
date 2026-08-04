// Trabajos programados con node-cron (§9.7, §12 4.5).
// - Reporte periódico: corre la predicción de todas las cuentas activas,
//   dispara alertas y guarda un snapshot en report_snapshots.
//
// La expresión cron es configurable vía REPORT_CRON (por defecto: 07:00 a diario).
// Se puede desactivar poniendo DISABLE_CRON=true (útil en tests o al importar
// el server para otros fines).
import cron from 'node-cron';
import { generateReport } from '../services/report.js';

const DEFAULT_SCHEDULE = '0 7 * * *'; // todos los días a las 07:00

export function startCronJobs(fastify) {
  if (process.env.DISABLE_CRON === 'true') {
    fastify.log.info('[cron] Deshabilitado por DISABLE_CRON=true.');
    return null;
  }

  const schedule = process.env.REPORT_CRON || DEFAULT_SCHEDULE;
  if (!cron.validate(schedule)) {
    fastify.log.warn(`[cron] Expresión inválida "${schedule}"; se usa la de por defecto.`);
  }
  const expr = cron.validate(schedule) ? schedule : DEFAULT_SCHEDULE;

  const task = cron.schedule(expr, async () => {
    fastify.log.info('[cron] Generando reporte periódico…');
    try {
      const snapshot = await generateReport({ save: true });
      fastify.log.info(
        `[cron] Reporte #${snapshot.id} generado (${snapshot.contenido.con_alerta} alertas).`
      );
    } catch (e) {
      fastify.log.error({ err: e }, '[cron] Fallo al generar el reporte periódico');
    }
  });

  fastify.log.info(`[cron] Reporte periódico programado ("${expr}").`);
  return task;
}
