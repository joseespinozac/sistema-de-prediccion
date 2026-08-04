// Generación del snapshot de reporte periódico (§9.7, §12 4.6).
// Corre la predicción de cada cuenta activa, evalúa alertas y arma un resumen
// que se guarda en report_snapshots. El canal de entrega (email/Slack) queda
// pendiente (§14); por ahora el reporte vive en BD y se consulta vía API.
import { Op } from 'sequelize';
import { Account, Alert, Prediction, ReportSnapshot } from '../db/index.js';
import { generatePrediction } from './predictionClient.js';
import { evaluatePrediction } from './alerts.js';

/**
 * Corre la predicción a nivel cuenta (métrica clics agregada) para todas las
 * cuentas activas y devuelve/guarda un snapshot con el estado de cada una.
 */
export async function generateReport({ save = true } = {}) {
  const accounts = await Account.findAll({ where: { activo: true } });
  const resumen = [];

  for (const account of accounts) {
    const item = {
      account_id: account.id,
      nombre: account.nombre,
      estado: null,
      alerta: null,
      detalle: null,
    };

    try {
      const result = await generatePrediction({ accountId: account.id, metric: 'clics' });
      if (result.estado === 'datos_insuficientes') {
        item.estado = 'datos_insuficientes';
        item.detalle = `${result.diasDisponibles}/${result.minimo} días de histórico`;
      } else {
        item.estado = 'ok';
        const alert = await evaluatePrediction(result.prediction);
        if (alert) {
          item.alerta = {
            tipo: alert.tipo,
            severidad: alert.severidad,
            cambio_proyectado: alert.cambio_proyectado,
            sugerencia: alert.sugerencia,
          };
        }
        const puntos = result.prediction.valores_predichos || [];
        item.detalle = {
          horizonte_dias: puntos.length,
          yhat_promedio:
            puntos.length
              ? Math.round(puntos.reduce((a, p) => a + (p.yhat || 0), 0) / puntos.length)
              : null,
        };
      }
    } catch (e) {
      item.estado = 'error';
      item.detalle = e.message;
    }

    resumen.push(item);
  }

  const contenido = {
    generado: new Date().toISOString(),
    cuentas_evaluadas: accounts.length,
    con_alerta: resumen.filter((r) => r.alerta).length,
    resumen,
  };

  if (save) {
    return ReportSnapshot.create({
      fecha_generacion: new Date(),
      contenido,
    });
  }
  return { contenido };
}

/** Devuelve alertas nuevas (no resueltas) generadas desde una fecha. */
export async function alertsSince(date) {
  return Alert.findAll({
    where: { resuelta: false, fecha_detectada: { [Op.gte]: date } },
    include: [{ model: Prediction, include: [Account] }],
    order: [['fecha_detectada', 'DESC']],
  });
}
