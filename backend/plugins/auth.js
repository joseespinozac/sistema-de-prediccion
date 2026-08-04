// Sesión con cookie httpOnly (no JWT en localStorage, §4) + decorador de guardia.
//
// Se usa @fastify/secure-session: cifra el contenido de la cookie con SESSION_SECRET,
// marca la cookie httpOnly + SameSite=Lax + Secure (en producción) para mitigar CSRF
// en un modelo de API same-origin (§10).
import fp from 'fastify-plugin';
import secureSession from '@fastify/secure-session';
import { env } from '../config/env.js';

async function authPlugin(fastify) {
  // La clave de sesión debe ser de 32 bytes. SESSION_SECRET es hex de 64 chars.
  // Si no es válida, se usa una clave efímera aleatoria (las sesiones no
  // sobreviven a un reinicio, pero la app no se cae en desarrollo).
  let key;
  if (/^[0-9a-fA-F]{64}$/.test(env.sessionSecret)) {
    key = Buffer.from(env.sessionSecret, 'hex');
  } else {
    fastify.log.warn(
      '[auth] SESSION_SECRET inválida; usando clave de sesión efímera (solo dev).'
    );
    const { randomBytes } = await import('node:crypto');
    key = randomBytes(32);
  }

  fastify.register(secureSession, {
    key,
    cookieName: 'e3_session',
    cookie: {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: env.isProd, // Secure solo en producción (HTTPS)
      maxAge: 60 * 60 * 8, // 8 horas
    },
  });

  // Guardia: exige sesión válida. Úsalo como preHandler en rutas protegidas.
  fastify.decorate('requireAuth', async function requireAuth(request, reply) {
    const userId = request.session.get('userId');
    if (!userId) {
      reply.status(401).send({
        error: true,
        statusCode: 401,
        message: 'No autenticado.',
      });
      return reply; // detiene la cadena
    }
    // Adjunta el id del usuario a la request para las rutas.
    request.userId = userId;
  });
}

export default fp(authPlugin, { name: 'auth' });
