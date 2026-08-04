// Motor de alertas y sugerencias preventivas (§4, §9.4, tareas 4.1–4.2).
//
// - Detección (4.1): compara el promedio proyectado del horizonte contra una
//   línea base del histórico reciente. Si la caída/subida supera el umbral
//   configurable (ALERT_DROP_THRESHOLD), crea una fila en `alerts`.
// - Sugerencia (4.2): reglas simples cruzando external_events y
//   technical_health_checks para proponer una acción preventiva.
import { Op, fn, col } from 'sequelize';
import {
  TrafficSnapshot,
  ExternalEvent,
  TechnicalHealthCheck,
  Alert,
} from '../db/index.js';
import { env } from '../config/env.js';
import { sourceForMetric } from './predictionClient.js';

// Cuántos días de histórico reciente usar como línea base.
const BASELINE_DAYS = 14;
// Ventana (días hacia atrás) para considerar un update de Google "reciente".
const RECENT_EVENT_DAYS = 30;

// Promedio de una lista de números (0 si vacía).
function avg(nums) {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

// Línea base: promedio diario de los últimos BASELINE_DAYS del histórico real.
async function recentBaseline(prediction) {
  const source = sourceForMetric(prediction.metrica);
  const where = { account_id: prediction.account_id, fuente: source };
  if (prediction.url_id) where.url_id = prediction.url_id;
  if (prediction.query_id) where.query_id = prediction.query_id;

  const rows = await TrafficSnapshot.findAll({
    attributes: ['fecha', [fn('SUM', col(prediction.metrica)), 'valor']],
    where,
    group: ['fecha'],
    order: [['fecha', 'DESC']],
    limit: BASELINE_DAYS,
    raw: true,
  });
  return avg(rows.map((r) => Number(r.valor) || 0));
}

// ¿Hay un update de Google reciente aplicable a la cuenta?
async function recentGoogleUpdate(accountId) {
  const since = new Date();
  since.setDate(since.getDate() - RECENT_EVENT_DAYS);
  const sinceStr = since.toISOString().slice(0, 10);

  const ev = await ExternalEvent.findOne({
    where: {
      tipo: 'update_google',
      fecha: { [Op.gte]: sinceStr },
      [Op.or]: [{ account_id: accountId }, { account_id: null }],
    },
    order: [['fecha', 'DESC']],
  });
  return ev || null;
}

// ¿La salud técnica más reciente de la cuenta muestra problemas?
async function technicalProblem(accountId, urlId) {
  const where = { account_id: accountId };
  if (urlId) where.url_id = urlId;
  const check = await TechnicalHealthCheck.findOne({
    where,
    order: [['fecha', 'DESC']],
  });
  if (!check) return null;
  const badStatus = check.status_code && check.status_code !== 200;
  const lowCwv =
    check.core_web_vitals_score != null && check.core_web_vitals_score < 50;
  return badStatus || lowCwv ? check : null;
}

/**
 * Construye la sugerencia de acción preventiva según las reglas del §9.4.
 */
async function buildSuggestion({ tipo, accountId, urlId }) {
  if (tipo !== 'caida') {
    // Para un pico, la sugerencia es aprovecharlo, no auditar un problema.
    return 'Pico de tráfico proyectado: revisa capacidad del sitio y prepara contenido para capitalizarlo.';
  }

  const update = await recentGoogleUpdate(accountId);
  if (update) {
    return `Caída proyectada coincide con un update de Google (${update.descripcion}, ${update.fecha}). Sugerencia: auditoría de contenido de las URLs afectadas.`;
  }

  const tech = await technicalProblem(accountId, urlId);
  if (tech) {
    const motivo =
      tech.status_code && tech.status_code !== 200
        ? `status HTTP ${tech.status_code}`
        : `Core Web Vitals bajo (${tech.core_web_vitals_score})`;
    return `Caída proyectada con salud técnica deteriorada (${motivo}). Sugerencia: auditoría técnica de la URL.`;
  }

  // Sin factor externo detectado (§9.4): no forzar una causa.
  return 'Caída proyectada sin factor externo detectado. Sugerencia: revisión manual (SERP, competencia, cambios recientes en el sitio).';
}

// Severidad según la magnitud del cambio.
function severityFor(changeAbs) {
  if (changeAbs >= 0.3) return 'alta';
  if (changeAbs >= 0.2) return 'media';
  return 'baja';
}

/**
 * Evalúa una predicción y, si corresponde, crea una alerta con su sugerencia.
 * @param {import('../db/index.js').Prediction} prediction  instancia Sequelize
 * @returns {Promise<object|null>} la Alerta creada, o null si no hay alerta
 */
export async function evaluatePrediction(prediction) {
  const puntos = Array.isArray(prediction.valores_predichos)
    ? prediction.valores_predichos
    : [];
  if (!puntos.length) return null;

  const baseline = await recentBaseline(prediction);
  if (baseline <= 0) return null; // sin base comparable

  const projected = avg(puntos.map((p) => Number(p.yhat) || 0));
  const change = (projected - baseline) / baseline; // fracción con signo
  const threshold = env.alertDropThreshold;

  let tipo = null;
  if (change <= -threshold) tipo = 'caida';
  else if (change >= threshold) tipo = 'pico';
  if (!tipo) return null; // dentro de lo normal, sin alerta

  const sugerencia = await buildSuggestion({
    tipo,
    accountId: prediction.account_id,
    urlId: prediction.url_id,
  });

  const alert = await Alert.create({
    prediction_id: prediction.id,
    tipo,
    severidad: severityFor(Math.abs(change)),
    cambio_proyectado: Number(change.toFixed(4)),
    sugerencia,
    fecha_detectada: new Date(),
    resuelta: false,
  });
  return alert;
}
