// CRUD del registro de estrategia — trazabilidad, objetivo #3 (§12 4.4).
import { StrategyLog, Alert, User } from '../db/index.js';

export default async function strategyLogRoutes(fastify) {
  const auth = { preHandler: fastify.requireAuth };

  // GET /api/accounts/:id/strategy-log — entradas de una cuenta.
  fastify.get('/api/accounts/:id/strategy-log', auth, async (request) => {
    const entries = await StrategyLog.findAll({
      where: { account_id: request.params.id },
      include: [
        { model: User, as: 'autor', attributes: ['id', 'email'] },
        { model: Alert, attributes: ['id', 'tipo', 'severidad'] },
      ],
      order: [['fecha', 'DESC']],
    });
    return { entries };
  });

  // POST /api/accounts/:id/strategy-log — registrar una acción.
  //   body: { accion_tomada, resultado_observado?, alert_id? }
  fastify.post('/api/accounts/:id/strategy-log', auth, async (request, reply) => {
    const accountId = Number.parseInt(request.params.id, 10);
    const { accion_tomada, resultado_observado, alert_id } = request.body ?? {};
    if (!accion_tomada || !accion_tomada.trim()) {
      return reply
        .status(400)
        .send({ error: true, message: 'La acción tomada es obligatoria.' });
    }
    const entry = await StrategyLog.create({
      account_id: accountId,
      alert_id: alert_id || null,
      accion_tomada: accion_tomada.trim(),
      resultado_observado: resultado_observado || null,
      autor_id: request.userId,
      fecha: new Date(),
    });
    return reply.status(201).send({ entry });
  });

  // PATCH /api/strategy-log/:id — actualizar resultado observado.
  fastify.patch('/api/strategy-log/:id', auth, async (request, reply) => {
    const entry = await StrategyLog.findByPk(request.params.id);
    if (!entry) {
      return reply.status(404).send({ error: true, message: 'Entrada no encontrada.' });
    }
    const { resultado_observado, accion_tomada } = request.body ?? {};
    if (resultado_observado !== undefined) entry.resultado_observado = resultado_observado;
    if (accion_tomada !== undefined) entry.accion_tomada = accion_tomada;
    await entry.save();
    return { entry };
  });
}
