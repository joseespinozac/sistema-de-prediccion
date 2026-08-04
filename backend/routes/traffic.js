// Serie de tráfico histórico agregada por día, para alimentar la gráfica (§12 2.6).
import { Op, fn, col } from 'sequelize';
import { Account, TrafficSnapshot } from '../db/index.js';

// Métricas disponibles según la fuente.
const METRIC_COLUMN = {
  clics: 'clics',
  impresiones: 'impresiones',
  sesiones: 'sesiones',
};

export default async function trafficRoutes(fastify) {
  const auth = { preHandler: fastify.requireAuth };

  // GET /api/accounts/:id/traffic
  //   ?metric=clics|impresiones|sesiones
  //   &start=YYYY-MM-DD&end=YYYY-MM-DD
  //   &urlId=..  (opcional)  &queryId=.. (opcional)
  //   &source=ga4|gsc (opcional; por defecto se infiere de la métrica)
  fastify.get('/api/accounts/:id/traffic', auth, async (request, reply) => {
    const accountId = Number.parseInt(request.params.id, 10);
    const account = await Account.findByPk(accountId);
    if (!account) {
      return reply.status(404).send({ error: true, message: 'Cuenta no encontrada.' });
    }

    const metric = METRIC_COLUMN[request.query?.metric] || 'clics';
    const source =
      request.query?.source ||
      (metric === 'sesiones' ? 'ga4' : 'gsc');

    const where = { account_id: accountId, fuente: source };
    if (request.query?.start && request.query?.end) {
      where.fecha = { [Op.between]: [request.query.start, request.query.end] };
    }
    if (request.query?.urlId) where.url_id = Number.parseInt(request.query.urlId, 10);
    if (request.query?.queryId) {
      where.query_id = Number.parseInt(request.query.queryId, 10);
    }

    // Agregación por día (suma de la métrica). Alias "valor" para el frontend.
    const rows = await TrafficSnapshot.findAll({
      attributes: [
        'fecha',
        [fn('SUM', col(metric)), 'valor'],
      ],
      where,
      group: ['fecha'],
      order: [['fecha', 'ASC']],
      raw: true,
    });

    const series = rows.map((r) => ({
      fecha: String(r.fecha),
      valor: Number(r.valor) || 0,
    }));

    return {
      accountId,
      metric,
      source,
      count: series.length,
      series,
    };
  });
}
