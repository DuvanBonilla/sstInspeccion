/**
 * Envía una inspección SST al backend.
 *
 * @param {FormData} formData Payload y evidencias de la inspección.
 * @param {Object} dependencias Dependencias de comunicación.
 * @param {Function} dependencias.leerRespuesta Procesador de la respuesta HTTP.
 * @param {Function} [dependencias.fetchImpl] Cliente HTTP utilizado.
 * @returns {Promise<Object>} Respuesta procesada del backend.
 * @throws {Error} Cuando el servidor rechaza la inspección.
 */
export async function enviarInspeccionSst(
  formData,
  {
    leerRespuesta,
    fetchImpl = fetch,
  },
) {
  const respuesta = await fetchImpl(
    "/enviar-onedrive-extintor",
    {
      method: "POST",
      body: formData,
    },
  );

  const datos = await leerRespuesta(respuesta);

  if (!respuesta.ok) {
    const mensaje = Array.isArray(datos.errores)
      ? datos.errores.join(" | ")
      : "Error al guardar la inspección";

    throw new Error(mensaje);
  }

  return datos;
}