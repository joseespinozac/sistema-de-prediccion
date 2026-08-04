// Autenticación del equipo: registro, login, logout, sesión actual.
// Contraseñas con bcrypt, nunca en texto plano (§10).
import bcrypt from 'bcryptjs';
import { User } from '../db/index.js';

const BCRYPT_ROUNDS = 12;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function authRoutes(fastify) {
  // Rate limit específico para login/registro (anti fuerza bruta, §10).
  const authRateLimit = {
    config: {
      rateLimit: { max: 10, timeWindow: '1 minute' },
    },
  };

  // POST /api/auth/register
  fastify.post('/api/auth/register', authRateLimit, async (request, reply) => {
    const { email, password } = request.body ?? {};

    if (!email || !EMAIL_RE.test(email)) {
      return reply.status(400).send({ error: true, message: 'Email inválido.' });
    }
    if (!password || password.length < 8) {
      return reply
        .status(400)
        .send({ error: true, message: 'La contraseña debe tener al menos 8 caracteres.' });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return reply
        .status(409)
        .send({ error: true, message: 'Ya existe un usuario con ese email.' });
    }

    const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await User.create({ email, password_hash, rol: 'member' });

    request.session.set('userId', user.id);
    return reply.status(201).send({ user });
  });

  // POST /api/auth/login
  fastify.post('/api/auth/login', authRateLimit, async (request, reply) => {
    const { email, password } = request.body ?? {};
    if (!email || !password) {
      return reply
        .status(400)
        .send({ error: true, message: 'Email y contraseña son obligatorios.' });
    }

    const user = await User.findOne({ where: { email } });
    // Mismo mensaje genérico exista o no el usuario (no revelar cuáles existen).
    const ok = user
      ? await bcrypt.compare(password, user.password_hash)
      : false;

    if (!ok) {
      return reply
        .status(401)
        .send({ error: true, message: 'Credenciales inválidas.' });
    }

    request.session.set('userId', user.id);
    return reply.send({ user });
  });

  // POST /api/auth/logout
  fastify.post('/api/auth/logout', async (request, reply) => {
    request.session.delete();
    return reply.send({ ok: true });
  });

  // GET /api/auth/me — usuario de la sesión actual.
  fastify.get(
    '/api/auth/me',
    { preHandler: fastify.requireAuth },
    async (request, reply) => {
      const user = await User.findByPk(request.userId);
      if (!user) {
        request.session.delete();
        return reply.status(401).send({ error: true, message: 'Sesión inválida.' });
      }
      return reply.send({ user });
    }
  );
}
