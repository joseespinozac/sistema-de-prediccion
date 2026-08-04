// Endpoints de alertas (§12 4.3): listar activas con su predicción y resolver.
import { Alert, Prediction, Account } from '../db/index.js';

export default async function alertRoutes(fastify) {
  const auth = { preHandler: fastify.requireAuth };

  // GET /api/alerts?accountId=&soloActivas=true
  fastify.get('/api/alerts', auth, async (request) => {
    const where = {};
    if (request.query?.soloActivas !== 'false') where.resuelta = false;

    // Filtrar por cuenta a través de la predicción asociada.
    const include = [
      {
        model: Prediction,
        required: true,
        where: request.query?.accountId
          ? { account_id: Number.parseInt(request.query.accountId, 10) }
          : undefined,
        include: [{ model: Account, attributes: ['id', 'nombre'] }],
      },
    ];

    const alerts = await Alert.findAll({
      where,
      include,
      order: [['fecha_detectada', 'DESC']],
    });
    return { alerts };
  });

  // PATCH /api/alerts/:id/resolve — marca la alerta como resuelta.
  fastify.patch('/api/alerts/:id/resolve', auth, async (request, reply) => {
    const alert = await Alert.findByPk(request.params.id);
    if (!alert) {
      return reply.status(404).send({ error: true, message: 'Alerta no encontrada.' });
    }
    alert.resuelta = true;
    await alert.save();
    return { alert };
  });
}
