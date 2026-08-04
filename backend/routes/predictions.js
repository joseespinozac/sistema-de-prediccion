// Endpoints de predicción para el frontend (§12 3.7).
import { Account, Prediction } from '../db/index.js';
import { generatePrediction } from '../services/predictionClient.js';
import { evaluatePrediction } from '../services/alerts.js';

export default async function predictionRoutes(fastify) {
  const auth = { preHandler: fastify.requireAuth };

  // POST /api/accounts/:id/predict
  //   body: { metric?, urlId?, queryId?, horizonteDias?, nivelConfianza? }
  // Genera una predicción nueva (llama al servicio Python) y evalúa alertas.
  fastify.post('/api/accounts/:id/predict', auth, async (request, reply) => {
    const accountId = Number.parseInt(request.params.id, 10);
    const account = await Account.findByPk(accountId);
    if (!account) {
      return reply.status(404).send({ error: true, message: 'Cuenta no encontrada.' });
    }

    const { metric, urlId, queryId, horizonteDias, nivelConfianza } = request.body ?? {};

    let result;
    try {
      result = await generatePrediction({
        accountId,
        metric,
        urlId: urlId || null,
        queryId: queryId || null,
        horizonteDias,
        nivelConfianza,
      });
    } catch (e) {
      request.log.error({ err: e }, 'Fallo al generar predicción');
      return reply.status(502).send({ error: true, message: e.message });
    }

    if (result.estado === 'datos_insuficientes') {
      return reply.send({
        estado: 'datos_insuficientes',
        message: `Datos insuficientes para una predicción confiable: hay ${result.diasDisponibles} días de histórico y se requieren al menos ${result.minimo}.`,
        diasDisponibles: result.diasDisponibles,
        minimo: result.minimo,
      });
    }

    // Evaluar si la predicción dispara una alerta (§4). No bloquea la respuesta.
    let alert = null;
    try {
      alert = await evaluatePrediction(result.prediction);
    } catch (e) {
      request.log.warn({ msg: e.message }, 'Fallo al evaluar alertas');
    }

    return reply.send({
      estado: 'ok',
      prediction: result.prediction,
      componentes: result.componentes,
      alert,
    });
  });

  // GET /api/accounts/:id/predictions/latest
  //   ?metric=&urlId=&queryId=  — última predicción guardada (sin recalcular).
  fastify.get('/api/accounts/:id/predictions/latest', auth, async (request, reply) => {
    const accountId = Number.parseInt(request.params.id, 10);
    const where = { account_id: accountId };
    if (request.query?.metric) where.metrica = request.query.metric;
    if (request.query?.urlId) where.url_id = Number.parseInt(request.query.urlId, 10);
    if (request.query?.queryId) where.query_id = Number.parseInt(request.query.queryId, 10);

    const prediction = await Prediction.findOne({
      where,
      order: [['fecha_generacion', 'DESC']],
    });
    if (!prediction) {
      return reply.send({ estado: 'sin_prediccion', prediction: null });
    }
    return reply.send({ estado: 'ok', prediction });
  });
}
