// Endpoints agregados para el dashboard (sparklines por dia).
import { getSparklines } from '../services/dashboardSparklines.js';

export default async function dashboardRoutes(fastify) {
  const auth = { preHandler: fastify.requireAuth };

  // GET /api/dashboard/sparklines?accountId=N&days=14
  // Devuelve conteo por dia de los ultimos N dias para alertas,
  // eventos externos y acciones de estrategia. Usado por sparklines
  // en las stat cards del dashboard.
  fastify.get('/api/dashboard/sparklines', auth, async (request, reply) => {
    const accountId = Number.parseInt(request.query?.accountId, 10);
    if (!accountId) {
      return reply
        .status(400)
        .send({ error: true, message: 'accountId es obligatorio.' });
    }
    const days = Number.parseInt(request.query?.days, 10) || 14;
    try {
      const data = await getSparklines(accountId, days);
      return data;
    } catch (e) {
      request.log.error({ err: e }, 'Fallo al calcular sparklines');
      return reply
        .status(500)
        .send({ error: true, message: 'No se pudieron calcular los sparklines: ' + e.message });
    }
  });
}
