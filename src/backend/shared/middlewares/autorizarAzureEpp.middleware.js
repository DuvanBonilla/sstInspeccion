const {
  timingSafeEqual,
} = require("node:crypto");

/**
 * Autoriza las solicitudes de automatización relacionadas con EPP.
 *
 * Obtiene el secreto enviado mediante el encabezado
 * `Authorization: Bearer <secreto>` y lo compara con la variable de entorno
 * `AZURE_EPP_SYNC_SECRET`. La comparación se realiza utilizando tiempo
 * constante para evitar diferencias observables durante la validación.
 *
 * Si la credencial es válida, permite continuar hacia el controlador asociado.
 *
 * @param {Object} req Solicitud HTTP de Express.
 * @param {Object} req.headers Encabezados de la solicitud.
 * @param {string} [req.headers.authorization] Credencial Bearer recibida.
 * @param {Object} res Respuesta HTTP de Express.
 * @param {Function} next Función que continúa con el siguiente middleware.
 * @returns {Object|void} Continúa el flujo autorizado; devuelve estado 401
 * cuando la credencial es inválida o 500 cuando el secreto no está configurado.
 */

function autorizarAzureEpp(
  req,
  res,
  next,
) {
  const secretoConfigurado = String(
    process.env.AZURE_EPP_SYNC_SECRET || "",
  ).trim();

  if (!secretoConfigurado) {
    console.error(
      "[Azure EPP] AZURE_EPP_SYNC_SECRET no está configurado",
    );

    return res.status(500).json({
      ok: false,
      mensaje:
        "La automatización EPP no está configurada",
    });
  }

  const autorizacion = String(
    req.headers.authorization || "",
  );

  const secretoRecibido =
    autorizacion.startsWith("Bearer ")
      ? autorizacion.slice(7).trim()
      : "";

  const bufferConfigurado =
    Buffer.from(secretoConfigurado);

  const bufferRecibido =
    Buffer.from(secretoRecibido);

  const autorizado =
    bufferConfigurado.length
      === bufferRecibido.length
    && timingSafeEqual(
      bufferConfigurado,
      bufferRecibido,
    );

  if (!autorizado) {
    return res.status(401).json({
      ok: false,
      mensaje: "No autorizado",
    });
  }

  return next();
}

module.exports = {
  autorizarAzureEpp,
};