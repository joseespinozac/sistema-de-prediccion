// Rutas del flujo OAuth2 de Google (§6.1) + listado de propiedades/sitios.
// Todas requieren sesión de usuario. Los tokens se encriptan antes de guardarse
// y nunca se devuelven al cliente (§6.2, §10).
import crypto from 'node:crypto';
import { GoogleConnection, Account } from '../db/index.js';
import { encrypt, encryptNullable, decrypt } from '../services/crypto.js';
import {
  buildConsentUrl,
  exchangeCodeForTokens,
  fetchGoogleEmail,
  revokeToken,
  isOAuthConfigured,
  GOOGLE_SCOPES,
} from '../services/googleOAuth.js';
import {
  getAuthenticatedClient,
  listGa4Properties,
  listGscSites,
} from '../services/googleData.js';

export default async function googleAuthRoutes(fastify) {
  const auth = { preHandler: fastify.requireAuth };

  // GET /api/auth/google/status — ¿está configurado el OAuth? (para la UI)
  fastify.get('/api/auth/google/status', auth, async () => ({
    configured: isOAuthConfigured(),
  }));

  // GET /api/auth/google/connect — inicia el flujo, redirige a Google.
  fastify.get('/api/auth/google/connect', auth, async (request, reply) => {
    if (!isOAuthConfigured()) {
      return reply.status(503).send({
        error: true,
        message:
          'OAuth de Google no configurado. Falta GOOGLE_CLIENT_ID/SECRET (ver README).',
      });
    }
    // state anti-CSRF: se guarda en la sesión y se verifica en el callback.
    const state = crypto.randomBytes(16).toString('hex');
    request.session.set('oauthState', state);
    const url = buildConsentUrl(state);
    return reply.redirect(url);
  });

  // GET /api/auth/google/callback — Google regresa con ?code&state.
  fastify.get('/api/auth/google/callback', auth, async (request, reply) => {
    const { code, state, error: oauthError } = request.query ?? {};

    if (oauthError) {
      return reply.redirect('/connect.html?error=' + encodeURIComponent(oauthError));
    }
    const expectedState = request.session.get('oauthState');
    request.session.set('oauthState', null);
    if (!code || !state || state !== expectedState) {
      return reply.redirect('/connect.html?error=state_invalido');
    }

    // Intercambio del code por tokens.
    const tokens = await exchangeCodeForTokens(code);
    if (!tokens.access_token) {
      return reply.redirect('/connect.html?error=sin_access_token');
    }

    let googleEmail = null;
    try {
      googleEmail = await fetchGoogleEmail(tokens);
    } catch {
      // No es crítico; seguimos sin el email.
    }

    // Encriptar y guardar (aún sin account_id: se asocia al elegir propiedad).
    const connection = await GoogleConnection.create({
      account_id: null,
      user_id: request.userId,
      access_token_encrypted: encrypt(tokens.access_token),
      refresh_token_encrypted: encryptNullable(tokens.refresh_token),
      expires_at: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      scopes: (tokens.scope || GOOGLE_SCOPES.join(' ')),
      google_email: googleEmail,
      connected_at: new Date(),
    });

    // Redirige a la UI para elegir propiedad/sitio con esta conexión.
    return reply.redirect(`/connect.html?connection=${connection.id}&ok=1`);
  });

  // GET /api/google/connections — conexiones del usuario (sin tokens).
  fastify.get('/api/google/connections', auth, async (request) => {
    const connections = await GoogleConnection.findAll({
      order: [['connected_at', 'DESC']],
    });
    return { connections }; // toJSON ya elimina los *_encrypted
  });

  // GET /api/google/properties?connection=ID — propiedades GA4 + sitios GSC.
  fastify.get('/api/google/properties', auth, async (request, reply) => {
    const connectionId = Number.parseInt(request.query?.connection, 10);
    if (!connectionId) {
      return reply
        .status(400)
        .send({ error: true, message: 'Falta el parámetro connection.' });
    }
    const connection = await GoogleConnection.findByPk(connectionId);
    if (!connection) {
      return reply.status(404).send({ error: true, message: 'Conexión no encontrada.' });
    }

    const authClient = await getAuthenticatedClient(connection);
    const [ga4Properties, gscSites] = await Promise.all([
      listGa4Properties(authClient).catch((e) => {
        request.log.warn({ msg: e.message }, 'Fallo al listar propiedades GA4');
        return [];
      }),
      listGscSites(authClient).catch((e) => {
        request.log.warn({ msg: e.message }, 'Fallo al listar sitios GSC');
        return [];
      }),
    ]);

    return { ga4Properties, gscSites };
  });

  // POST /api/google/connections/:id/link — asocia la conexión a una cuenta.
  // Body: { accountId? , nombre?, ga4_property_id, gsc_site_url }
  // Si no se pasa accountId, se crea una cuenta nueva con `nombre`.
  fastify.post('/api/google/connections/:id/link', auth, async (request, reply) => {
    const connectionId = Number.parseInt(request.params.id, 10);
    const { accountId, nombre, ga4_property_id, gsc_site_url } = request.body ?? {};

    const connection = await GoogleConnection.findByPk(connectionId);
    if (!connection) {
      return reply.status(404).send({ error: true, message: 'Conexión no encontrada.' });
    }
    if (!ga4_property_id && !gsc_site_url) {
      return reply.status(400).send({
        error: true,
        message: 'Debes seleccionar al menos una propiedad GA4 o un sitio GSC.',
      });
    }

    let account;
    if (accountId) {
      account = await Account.findByPk(accountId);
      if (!account) {
        return reply.status(404).send({ error: true, message: 'Cuenta no encontrada.' });
      }
      account.ga4_property_id = ga4_property_id || account.ga4_property_id;
      account.gsc_site_url = gsc_site_url || account.gsc_site_url;
      await account.save();
    } else {
      account = await Account.create({
        nombre: nombre || connection.google_email || 'Cuenta sin nombre',
        ga4_property_id: ga4_property_id || null,
        gsc_site_url: gsc_site_url || null,
        activo: true,
      });
    }

    connection.account_id = account.id;
    await connection.save();

    return reply.send({ account, connection });
  });

  // DELETE /api/google/connections/:id — desconecta: revoca en Google + borra.
  fastify.delete('/api/google/connections/:id', auth, async (request, reply) => {
    const connectionId = Number.parseInt(request.params.id, 10);
    const connection = await GoogleConnection.findByPk(connectionId);
    if (!connection) {
      return reply.status(404).send({ error: true, message: 'Conexión no encontrada.' });
    }

    // Revocar en Google ANTES de borrar (§6.2). Si falla, se registra pero se
    // continúa con el borrado local para no dejar el registro huérfano.
    try {
      const token = decrypt(connection.access_token_encrypted);
      await revokeToken(token);
    } catch (e) {
      request.log.warn({ msg: e.message }, 'No se pudo revocar el token en Google');
    }

    await connection.destroy();
    return reply.send({ ok: true });
  });
}
