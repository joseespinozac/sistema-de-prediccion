// CRUD de cuentas, URLs/consultas trackeadas y disparo de ingesta (§9.1, §12 2.4).
import {
  Account,
  TrackedUrl,
  TrackedQuery,
  GoogleConnection,
} from '../db/index.js';
import { ingestHistory } from '../services/ingest.js';

export default async function accountRoutes(fastify) {
  const auth = { preHandler: fastify.requireAuth };

  // GET /api/accounts — lista de cuentas activas.
  // Soft-deleted (activo=false) se excluyen; usar ?includeInactive=true
  // para listar tambien las inactivas (pagina de gestion de cuentas).
  fastify.get('/api/accounts', auth, async (request) => {
    const includeInactive = request.query?.includeInactive === 'true';
    const accounts = await Account.findAll({
      where: includeInactive ? {} : { activo: true },
      order: [['nombre', 'ASC']],
    });
    return { accounts };
  });

  // GET /api/accounts/:id — detalle de una cuenta + conexión asociada.
  fastify.get('/api/accounts/:id', auth, async (request, reply) => {
    const account = await Account.findByPk(request.params.id);
    if (!account) {
      return reply.status(404).send({ error: true, message: 'Cuenta no encontrada.' });
    }
    const connection = await GoogleConnection.findOne({
      where: { account_id: account.id },
    });
    return { account, connection: connection || null };
  });

  // POST /api/accounts — crear una cuenta manualmente.
  fastify.post('/api/accounts', auth, async (request, reply) => {
    const { nombre, ga4_property_id, gsc_site_url } = request.body ?? {};
    if (!nombre) {
      return reply.status(400).send({ error: true, message: 'El nombre es obligatorio.' });
    }
    const account = await Account.create({
      nombre,
      ga4_property_id: ga4_property_id || null,
      gsc_site_url: gsc_site_url || null,
      activo: true,
    });
    return reply.status(201).send({ account });
  });

  // PATCH /api/accounts/:id — actualizar nombre/propiedad/estado.
  // Tambien usado para reactivar una cuenta soft-deleted (activo: true).
  fastify.patch('/api/accounts/:id', auth, async (request, reply) => {
    const account = await Account.findByPk(request.params.id);
    if (!account) {
      return reply.status(404).send({ error: true, message: 'Cuenta no encontrada.' });
    }
    const { nombre, ga4_property_id, gsc_site_url, activo } = request.body ?? {};
    if (nombre !== undefined) account.nombre = nombre;
    if (ga4_property_id !== undefined) account.ga4_property_id = ga4_property_id;
    if (gsc_site_url !== undefined) account.gsc_site_url = gsc_site_url;
    if (activo !== undefined) account.activo = activo;
    await account.save();
    return { account };
  });

  // DELETE /api/accounts/:id — soft delete via activo=false.
  // Preserva trafico_historico, predicciones, alertas, estrategia, etc.
  // (esos datos son valiosos para R-011 historial de precision del modelo).
  // Para reactivar: PATCH /api/accounts/:id { activo: true }.
  fastify.delete('/api/accounts/:id', auth, async (request, reply) => {
    const account = await Account.findByPk(request.params.id);
    if (!account) {
      return reply.status(404).send({ error: true, message: 'Cuenta no encontrada.' });
    }
    account.activo = false;
    await account.save();
    return { account };
  });

  // ---- URLs trackeadas ----
  // GET /api/accounts/:id/urls
  fastify.get('/api/accounts/:id/urls', auth, async (request) => {
    const urls = await TrackedUrl.findAll({
      where: { account_id: request.params.id },
      order: [['url', 'ASC']],
    });
    return { urls };
  });

  // PATCH /api/accounts/:id/urls/:urlId — activar/desactivar trackeo.
  fastify.patch('/api/accounts/:id/urls/:urlId', auth, async (request, reply) => {
    const url = await TrackedUrl.findOne({
      where: { id: request.params.urlId, account_id: request.params.id },
    });
    if (!url) {
      return reply.status(404).send({ error: true, message: 'URL no encontrada.' });
    }
    if (request.body?.activo !== undefined) url.activo = request.body.activo;
    await url.save();
    return { url };
  });

  // ---- Consultas trackeadas ----
  fastify.get('/api/accounts/:id/queries', auth, async (request) => {
    const queries = await TrackedQuery.findAll({
      where: { account_id: request.params.id },
      order: [['query', 'ASC']],
    });
    return { queries };
  });

  fastify.patch('/api/accounts/:id/queries/:queryId', auth, async (request, reply) => {
    const query = await TrackedQuery.findOne({
      where: { id: request.params.queryId, account_id: request.params.id },
    });
    if (!query) {
      return reply.status(404).send({ error: true, message: 'Consulta no encontrada.' });
    }
    if (request.body?.activo !== undefined) query.activo = request.body.activo;
    await query.save();
    return { query };
  });

  // POST /api/accounts/:id/ingest — dispara la ingesta de histórico (§12 1.9).
  // Body: { startDate, endDate, force? }
  fastify.post('/api/accounts/:id/ingest', auth, async (request, reply) => {
    const accountId = Number.parseInt(request.params.id, 10);
    const { startDate, endDate, force } = request.body ?? {};
    if (!startDate || !endDate) {
      return reply
        .status(400)
        .send({ error: true, message: 'startDate y endDate son obligatorios (YYYY-MM-DD).' });
    }
    try {
      const result = await ingestHistory(accountId, { startDate, endDate, force });
      return { ok: true, result };
    } catch (e) {
      request.log.error({ err: e }, 'Fallo en ingesta');
      return reply.status(502).send({
        error: true,
        message: 'No se pudo completar la ingesta desde Google: ' + e.message,
      });
    }
  });
}
