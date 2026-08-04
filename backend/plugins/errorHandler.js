// Manejador de errores centralizado: respuestas JSON uniformes que NUNCA
// filtran secretos ni detalles internos al cliente (§10).
import fp from 'fastify-plugin';

async function errorHandlerPlugin(fastify) {
  fastify.setErrorHandler((error, request, reply) => {
    const status = error.statusCode && error.statusCode >= 400
      ? error.statusCode
      : 500;

    // Log completo del lado del servidor (útil para el equipo, §10),
    // pero sin volcar tokens: los modelos ya ocultan *_encrypted en toJSON.
    if (status >= 500) {
      request.log.error({ err: error }, 'Error no controlado');
    } else {
      request.log.warn({ msg: error.message }, 'Error de solicitud');
    }

    // Mensaje seguro para el cliente: en 5xx nunca se expone el detalle real.
    const clientMessage =
      status >= 500 ? 'Error interno del servidor.' : error.message;

    reply.status(status).send({
      error: true,
      statusCode: status,
      message: clientMessage,
    });
  });

  // 404 uniforme en JSON.
  fastify.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      error: true,
      statusCode: 404,
      message: 'Recurso no encontrado.',
    });
  });
}

export default fp(errorHandlerPlugin, { name: 'error-handler' });
