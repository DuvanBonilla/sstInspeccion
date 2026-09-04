/**
 * Obtiene el payload de una solicitud HTTP.
 *
 * Cuando el formulario envía la propiedad `payload` como una cadena JSON,
 * convierte su contenido en un objeto. En los demás casos devuelve directamente
 * el cuerpo de la solicitud o un objeto vacío cuando no existe.
 *
 * @param {Object} req Solicitud HTTP de Express.
 * @param {Object} [req.body] Cuerpo recibido en la solicitud.
 * @param {string} [req.body.payload] Información serializada en formato JSON.
 * @returns {Object} Datos interpretados de la solicitud.
 * @throws {SyntaxError} Si la propiedad `payload` contiene un JSON inválido.
 */

function leerPayload(req) {
  if (typeof req.body?.payload === "string") {
    return JSON.parse(req.body.payload);
  }

  return req.body || {};
}

module.exports = {
  leerPayload,
};