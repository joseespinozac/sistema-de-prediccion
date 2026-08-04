// Punto de entrada del backend: API REST JSON pura + frontend estático (§4).
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyCookie from '@fastify/cookie';
import fastifyRateLimit from '@fastify/rate-limit';

import { env, checkEnv } from './config/env.js';
import { sequelize } from './db/index.js';

import errorHandler from './plugins/errorHandler.js';
import authPlugin from './plugins/auth.js';

import authRoutes from './routes/auth.js';
import googleAuthRoutes from './routes/googleAuth.js';
import accountRoutes from './routes/accounts.js';
import trafficRoutes from './routes/traffic.js';
import predictionRoutes from './routes/predictions.js';
import patternRoutes from './routes/patterns.js';
import alertRoutes from './routes/alerts.js';
import strategyLogRoutes from './routes/strategyLog.js';
import externalEventRoutes from './routes/externalEvents.js';
import reportRoutes from './routes/reports.js';

import { startCronJobs } from './jobs/cron.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIR = path.resolve(__dirname, '..', 'frontend');

async function buildServer() {
  const fastify = Fastify({
    logger: {
      level: env.isProd ? 'info' : 'debug',
      transport: env.isProd
        ? undefined
        : { target: 'pino-pretty', options: { colorize: true } },
    },
  });

  // Infra: errores JSON, cookies, rate limit global (login se limita aparte).
  await fastify.register(errorHandler);
  await fastify.register(fastifyCookie);
  await fastify.register(fastifyRateLimit, {
    global: false, // solo donde se declare explícitamente
    max: 100,
    timeWindow: '1 minute',
  });

  // Sesión + guardia de autenticación.
  await fastify.register(authPlugin);

  // Rutas de la API.
  await fastify.register(authRoutes);
  await fastify.register(googleAuthRoutes);
  await fastify.register(accountRoutes);
  await fastify.register(trafficRoutes);
  await fastify.register(predictionRoutes);
  await fastify.register(patternRoutes);
  await fastify.register(alertRoutes);
  await fastify.register(strategyLogRoutes);
  await fastify.register(externalEventRoutes);
  await fastify.register(reportRoutes);

  // Frontend estático (HTML + Tailwind + Alpine + ApexCharts).
  await fastify.register(fastifyStatic, {
    root: FRONTEND_DIR,
    prefix: '/',
  });

  // Healthcheck simple.
  fastify.get('/api/health', async () => ({ ok: true, env: env.nodeEnv }));

  return fastify;
}

async function start() {
  checkEnv(console); // avisa qué falta configurar (no bloquea)

  const fastify = await buildServer();

  try {
    // Verifica la conexión a la BD (las tablas se crean con `npm run migrate`).
    await sequelize.authenticate();
    fastify.log.info('Conexión a la base de datos OK.');
  } catch (e) {
    fastify.log.error(
      { err: e },
      'No se pudo conectar a la BD. ¿Corriste `npm run migrate`?'
    );
  }

  try {
    await fastify.listen({ port: env.port, host: '0.0.0.0' });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }

  // Trabajos programados (reporte periódico). Se puede desactivar con DISABLE_CRON=true.
  startCronJobs(fastify);

  // Graceful shutdown: node --watch / Docker stop / K8s SIGTERM cierran el server
  // para liberar el puerto antes de que el proceso termine (sin esto, --watch
  // deja el puerto bindeado y la nueva instancia falla con EADDRINUSE).
  const shutdown = async (signal) => {
    fastify.log.info(`Recibido ${signal}, cerrando Fastify...`);
    try {
      await fastify.close();
      fastify.log.info('Fastify cerrado. Puerto liberado.');
      process.exit(0);
    } catch (err) {
      fastify.log.error(err, 'Error cerrando Fastify');
      process.exit(1);
    }
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start();

export { buildServer };
