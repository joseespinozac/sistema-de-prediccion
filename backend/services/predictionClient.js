// Orquestación de la predicción desde el backend Node (§8, tareas 3.4–3.6).
// 1. Arma la serie diaria desde traffic_snapshots.
// 2. Aplica la lógica de cold start (<MIN_HISTORY_DAYS → no llama al modelo).
// 3. Junta los external_events del rango.
// 4. Llama al servicio Python /predict con X-Internal-Token.
// 5. Guarda el resultado en `predictions` y lo devuelve.
import { Op, fn, col } from 'sequelize';
import {
  TrafficSnapshot,
  ExternalEvent,
  Prediction,
} from '../db/index.js';
import { env } from '../config/env.js';

const METRIC_COLUMN = { clics: 'clics', impresiones: 'impresiones', sesiones: 'sesiones' };

// La métrica define la fuente por defecto (GA4 vs GSC), igual que en traffic.js.
function sourceForMetric(metric) {
  return metric === 'sesiones' ? 'ga4' : 'gsc';
}

/**
 * Construye la serie diaria [{fecha, valor}] agregando traffic_snapshots.
 * `start`/`end` son opcionales: sin ellos, usa todo el histórico disponible
 * (comportamiento original, usado por la predicción y las alertas). Con
 * ellos, acota el rango (usado por el detector de patrones).
 */
async function buildSeries({ accountId, metric, source, urlId, queryId, start, end }) {
  const where = { account_id: accountId, fuente: source };
  if (urlId) where.url_id = Number.parseInt(urlId, 10);
  if (queryId) where.query_id = Number.parseInt(queryId, 10);
  if (start && end) where.fecha = { [Op.between]: [start, end] };

  const rows = await TrafficSnapshot.findAll({
    attributes: ['fecha', [fn('SUM', col(metric)), 'valor']],
    where,
    group: ['fecha'],
    order: [['fecha', 'ASC']],
    raw: true,
  });
  return rows.map((r) => ({ fecha: String(r.fecha), valor: Number(r.valor) || 0 }));
}

/**
 * Trae los eventos externos aplicables a la cuenta dentro del rango de la serie.
 */
async function getEvents(accountId, series) {
  if (!series.length) return [];
  const start = series[0].fecha;
  const end = series[series.length - 1].fecha;
  const events = await ExternalEvent.findAll({
    where: {
      fecha: { [Op.between]: [start, end] },
      [Op.or]: [{ account_id: accountId }, { account_id: null }],
    },
    order: [['fecha', 'ASC']],
    raw: true,
  });
  return events.map((e) => ({
    fecha: String(e.fecha),
    tipo: e.tipo,
    descripcion: e.descripcion,
  }));
}

/**
 * Llama al servicio Python. Lanza si no responde o el token es inválido.
 */
async function callPredictionService(payload) {
  const url = `${env.prediction.serviceUrl.replace(/\/$/, '')}/predict`;
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Token': env.prediction.internalToken,
      },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    throw new Error(
      'No se pudo contactar el servicio de predicción. ¿Está corriendo? ' + e.message
    );
  }
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { detail: text };
  }
  if (!res.ok) {
    throw new Error(
      (data && (data.detail || data.message)) || `Servicio de predicción: HTTP ${res.status}`
    );
  }
  return data;
}

/**
 * Genera (y guarda) una predicción para una cuenta/URL/consulta/métrica.
 *
 * @returns {Promise<
 *   | { estado: 'datos_insuficientes', diasDisponibles: number, minimo: number }
 *   | { estado: 'ok', prediction: object, componentes: object }
 * >}
 */
export async function generatePrediction({
  accountId,
  metric = 'clics',
  urlId = null,
  queryId = null,
  horizonteDias = env.prediction.horizonDays,
  nivelConfianza = env.prediction.confidence,
}) {
  const safeMetric = METRIC_COLUMN[metric] || 'clics';
  const source = sourceForMetric(safeMetric);

  const series = await buildSeries({ accountId, metric: safeMetric, source, urlId, queryId });

  // ---- Cold start (§8): sin suficiente histórico, no se llama al modelo. ----
  const diasDisponibles = series.length;
  if (diasDisponibles < env.prediction.minHistoryDays) {
    return {
      estado: 'datos_insuficientes',
      diasDisponibles,
      minimo: env.prediction.minHistoryDays,
    };
  }

  const eventos = await getEvents(accountId, series);

  const respuesta = await callPredictionService({
    series,
    eventos_externos: eventos,
    horizonte_dias: horizonteDias,
    nivel_confianza: nivelConfianza,
  });

  const prediccion = respuesta.prediccion || [];
  if (!prediccion.length) {
    throw new Error('El servicio de predicción devolvió una serie vacía.');
  }

  // ---- Guardar en predictions (tarea 3.5). ----
  const prediction = await Prediction.create({
    account_id: accountId,
    url_id: urlId ? Number.parseInt(urlId, 10) : null,
    query_id: queryId ? Number.parseInt(queryId, 10) : null,
    metrica: safeMetric,
    fecha_generacion: new Date(),
    periodo_predicho_inicio: prediccion[0].fecha,
    periodo_predicho_fin: prediccion[prediccion.length - 1].fecha,
    valores_predichos: prediccion,
    intervalo_confianza: nivelConfianza,
  });

  return {
    estado: 'ok',
    prediction,
    componentes: respuesta.componentes || {},
  };
}

// Exporta helpers reutilizables (los usa el motor de alertas, §4).
export { buildSeries, sourceForMetric };
