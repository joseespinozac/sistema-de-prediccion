// Carga y valida las variables de entorno una sola vez al arrancar.
// Si falta algo crítico, se registra una advertencia clara (no se cae la app
// para no bloquear el desarrollo cuando aún no hay credenciales de Google).
import 'dotenv/config';

function asInt(value, fallback) {
  const n = Number.parseInt(value ?? '', 10);
  return Number.isFinite(n) ? n : fallback;
}

function asFloat(value, fallback) {
  const n = Number.parseFloat(value ?? '');
  return Number.isFinite(n) ? n : fallback;
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: (process.env.NODE_ENV || 'development') === 'production',
  port: asInt(process.env.PORT, 3001),
  appBaseUrl: process.env.APP_BASE_URL || 'http://localhost:3001',

  sessionSecret: process.env.SESSION_SECRET || '',
  encryptionKey: process.env.ENCRYPTION_KEY || '',

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri:
      process.env.GOOGLE_REDIRECT_URI ||
      'http://localhost:3001/api/auth/google/callback',
  },

  pagespeedApiKey: process.env.PAGESPEED_API_KEY || '',

  prediction: {
    serviceUrl: process.env.PREDICTION_SERVICE_URL || 'http://127.0.0.1:8000',
    internalToken: process.env.INTERNAL_TOKEN || '',
    minHistoryDays: asInt(process.env.MIN_HISTORY_DAYS, 90),
    horizonDays: asInt(process.env.PREDICTION_HORIZON_DAYS, 30),
    confidence: asFloat(process.env.PREDICTION_CONFIDENCE, 0.8),
  },

  alertDropThreshold: asFloat(process.env.ALERT_DROP_THRESHOLD, 0.15),

  // Detector de patrones semanal (reglas, v1 — ver ROADMAP.md).
  patterns: {
    dropThreshold: asFloat(process.env.PATTERN_DROP_THRESHOLD, 0.2),
    recoveryBand: asFloat(process.env.PATTERN_RECOVERY_BAND, 0.1),
    baselineWeeks: asInt(process.env.PATTERN_BASELINE_WEEKS, 8),
    sustainedWeeks: asInt(process.env.PATTERN_SUSTAINED_WEEKS, 3),
  },
};

// Validaciones no bloqueantes: avisan qué queda por configurar.
export function checkEnv(logger = console) {
  const warnings = [];

  if (!env.sessionSecret || env.sessionSecret.length < 32) {
    warnings.push(
      'SESSION_SECRET ausente o demasiado corta (se requieren 32 bytes en hex).'
    );
  }
  if (!isValidHexKey(env.encryptionKey)) {
    warnings.push(
      'ENCRYPTION_KEY ausente o inválida (se requieren 32 bytes en hex = 64 chars). ' +
        'La conexión de cuentas de Google no funcionará hasta configurarla.'
    );
  }
  if (!env.google.clientId || !env.google.clientSecret) {
    warnings.push(
      'GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET ausentes: el flujo OAuth de GA4/GSC ' +
        'está inactivo hasta generar credenciales en Google Cloud Console (ver README).'
    );
  }
  if (!env.prediction.internalToken) {
    warnings.push(
      'INTERNAL_TOKEN ausente: la comunicación con el servicio de predicción no está protegida.'
    );
  }

  for (const w of warnings) {
    logger.warn(`[env] ${w}`);
  }
  return warnings;
}

// Una clave de 32 bytes en hex tiene exactamente 64 caracteres hexadecimales.
export function isValidHexKey(key) {
  return typeof key === 'string' && /^[0-9a-fA-F]{64}$/.test(key);
}
