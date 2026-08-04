// Endpoints de reporte periódico y salud técnica (§12 4.6, 4.7).
import { ReportSnapshot } from '../db/index.js';
import { generateReport } from '../services/report.js';
import { checkAccountHealth } from '../services/pagespeed.js';

export default async function reportRoutes(fastify) {
  const auth = { preHandler: fastify.requireAuth };

  // GET /api/reports/latest — último snapshot guardado.
  fastify.get('/api/reports/latest', auth, async () => {
    const report = await ReportSnapshot.findOne({
      order: [['fecha_generacion', 'DESC']],
    });
    return { report: report || null };
  });

  // GET /api/reports — lista de reportes (metadatos + contenido).
  fastify.get('/api/reports', auth, async () => {
    const reports = await ReportSnapshot.findAll({
      order: [['fecha_generacion', 'DESC']],
      limit: 30,
    });
    return { reports };
  });

  // POST /api/reports/run — genera un reporte ahora (dispara el mismo flujo del cron).
  fastify.post('/api/reports/run', auth, async (request, reply) => {
    try {
      const snapshot = await generateReport({ save: true });
      return { ok: true, report: snapshot };
    } catch (e) {
      request.log.error({ err: e }, 'Fallo al generar reporte manual');
      return reply.status(502).send({ error: true, message: e.message });
    }
  });

  // POST /api/accounts/:id/health-check — corre PageSpeed + status para la cuenta.
  fastify.post('/api/accounts/:id/health-check', auth, async (request, reply) => {
    const accountId = Number.parseInt(request.params.id, 10);
    try {
      const results = await checkAccountHealth(accountId);
      return { ok: true, checks: results };
    } catch (e) {
      request.log.error({ err: e }, 'Fallo en health-check');
      return reply.status(502).send({ error: true, message: e.message });
    }
  });
}
