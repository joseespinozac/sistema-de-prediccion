// Servicio de sparklines para el dashboard: cuentas por dia de los
// ultimos N dias para alertas, eventos externos y acciones de estrategia.
// Usado por el endpoint GET /api/dashboard/sparklines.
import { Op } from 'sequelize';
import { subDays, startOfDay, format } from 'date-fns';
import { Alert, ExternalEvent, StrategyLog, Prediction } from '../db/index.js';

/**
 * Cuenta eventos por dia en un rango de fechas.
 * @param {Date[]} dates  Array de fechas (un dia por posicion), orden ascendente.
 * @param {{ fecha: DateLike }[]} records  Registros a contar.
 * @param {(r) => DateLike} getFecha  Funcion para extraer la fecha del registro.
 * @returns {number[]} counts por dia (mismo tamaño que dates).
 */
function countByDay(dates, records, getFecha) {
  const counts = new Array(dates.length).fill(0);
  const dayMs = 24 * 60 * 60 * 1000;
  const startMs = dates[0].getTime();
  for (const r of records) {
    const f = getFecha(r);
    if (!f) continue;
    const t = new Date(f).getTime();
    const idx = Math.floor((t - startMs) / dayMs);
    if (idx >= 0 && idx < counts.length) counts[idx] += 1;
  }
  return counts;
}

/**
 * Devuelve series temporales de los ultimos N dias para alertas,
 * eventos externos y acciones de estrategia. Cada serie es un array
 * de N enteros (cuenta por dia, indice 0 = hace N dias).
 *
 * @param {number} accountId  Cuenta a la que filtrar alertas y estrategia.
 *                             Los eventos externos se incluyen si pertenecen
 *                             a esta cuenta O son globales (account_id IS NULL).
 * @param {number} days  Cantidad de dias hacia atras. Default 14. Max 90.
 * @returns {Promise<{ days: number, events: number[], alerts: number[], strategy: number[] }>}
 */
export async function getSparklines(accountId, days = 14) {
  const n = Math.min(Math.max(parseInt(days, 10) || 14, 1), 90);
  const today = startOfDay(new Date());
  const start = subDays(today, n - 1); // incluye hoy + n-1 dias anteriores

  // Construir el array de fechas (orden ascendente, formato YYYY-MM-DD).
  const dates = [];
  for (let i = 0; i < n; i++) {
    dates.push(subDays(today, n - 1 - i));
  }

  const dateStrs = dates.map((d) => format(d, 'yyyy-MM-dd'));

  // Alertas: via prediction -> account.
  // Strategy: directo por account_id.
  const [alerts, strategy, events, predictions] = await Promise.all([
    Alert.findAll({
      include: [{
        model: Prediction,
        where: { account_id: accountId },
        attributes: [],
      }],
      where: { fecha_detectada: { [Op.gte]: start } },
      attributes: ['fecha_detectada'],
      raw: true,
    }),
    StrategyLog.findAll({
      where: { account_id: accountId, fecha: { [Op.gte]: start } },
      attributes: ['fecha'],
      raw: true,
    }),
    ExternalEvent.findAll({
      where: {
        fecha: { [Op.gte]: format(start, 'yyyy-MM-dd') },
        [Op.or]: [{ account_id: null }, { account_id: accountId }],
      },
      attributes: ['fecha'],
      raw: true,
    }),
    // No se usa; placeholder para mantener el paralelismo si despues
    // necesitamos JOINs adicionales.
    Promise.resolve([]),
  ]);

  // ExternalEvent.fecha es DATEONLY (string 'YYYY-MM-DD'), no Date.
  // Lo parseamos a Date para reutilizar countByDay.
  return {
    days: n,
    dateStrs,
    alerts: countByDay(dates, alerts, (r) => r.fecha_detectada),
    strategy: countByDay(dates, strategy, (r) => r.fecha),
    events: countByDay(
      dates,
      events.map((e) => ({ fecha: new Date(e.fecha) })),
      (r) => r.fecha
    ),
  };
}
