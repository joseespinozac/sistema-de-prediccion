// Endpoint del detector de patrones semanal (v1, reglas — ver ROADMAP.md).
import { Account } from '../db/index.js';
import { detectPatterns } from '../services/patterns.js';

export default async function patternRoutes(fastify) {
  const auth = { preHandler: fastify.requireAuth };

  // GET /api/accounts/:id/patterns?metric=&urlId=&queryId=&start=&end=
  fastify.get('/api/accounts/:id/patterns', auth, async (request, reply) => {
    const accountId = Number.parseInt(request.params.id, 10);
    const account = await Account.findByPk(accountId);
    if (!account) {
      return reply.status(404).send({ error: true, message: 'Cuenta no encontrada.' });
    }

    const { metric, urlId, queryId, start, end } = request.query ?? {};
    try {
      const result = await detectPatterns({
        accountId,
        metric,
        urlId: urlId || null,
        queryId: queryId || null,
        start: start || null,
        end: end || null,
      });
      return reply.send(result);
    } catch (e) {
      request.log.error({ err: e }, 'Fallo al detectar patrones');
      return reply.status(500).send({ error: true, message: e.message });
    }
  });
}
