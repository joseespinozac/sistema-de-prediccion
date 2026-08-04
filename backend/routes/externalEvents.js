// CRUD de eventos externos (updates de Google / mercado), registro manual v1 (§6.4, §12 4.8).
import { Op } from 'sequelize';
import { ExternalEvent } from '../db/index.js';

const TIPOS = ['update_google', 'mercado'];

export default async function externalEventRoutes(fastify) {
  const auth = { preHandler: fastify.requireAuth };

  // GET /api/external-events?accountId=  — eventos globales + de la cuenta.
  fastify.get('/api/external-events', auth, async (request) => {
    const where = {};
    if (request.query?.accountId) {
      const id = Number.parseInt(request.query.accountId, 10);
      where[Op.or] = [{ account_id: id }, { account_id: null }];
    }
    const events = await ExternalEvent.findAll({
      where,
      order: [['fecha', 'DESC']],
    });
    return { events };
  });

  // POST /api/external-events — registrar un evento.
  //   body: { fecha, tipo, descripcion, account_id? }
  fastify.post('/api/external-events', auth, async (request, reply) => {
    const { fecha, tipo, descripcion, account_id } = request.body ?? {};
    if (!fecha || !tipo || !descripcion) {
      return reply
        .status(400)
        .send({ error: true, message: 'fecha, tipo y descripcion son obligatorios.' });
    }
    if (!TIPOS.includes(tipo)) {
      return reply
        .status(400)
        .send({ error: true, message: `tipo debe ser uno de: ${TIPOS.join(', ')}.` });
    }
    const event = await ExternalEvent.create({
      fecha,
      tipo,
      descripcion,
      account_id: account_id || null,
    });
    return reply.status(201).send({ event });
  });

  // DELETE /api/external-events/:id
  fastify.delete('/api/external-events/:id', auth, async (request, reply) => {
    const event = await ExternalEvent.findByPk(request.params.id);
    if (!event) {
      return reply.status(404).send({ error: true, message: 'Evento no encontrado.' });
    }
    await event.destroy();
    return { ok: true };
  });
}
