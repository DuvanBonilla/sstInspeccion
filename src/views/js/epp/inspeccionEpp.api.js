/**
 * Envía una inspección EPP al backend.
 *
 * Realiza la solicitud multipart, procesa la respuesta JSON y conserva
 * los mensajes de error entregados por el servidor.
 *
 * @param {FormData|Object} formData Contenido multipart de la inspección.
 * @param {Object} [dependencias] Dependencias utilizadas por la solicitud.
 * @param {Function} [dependencias.solicitar=fetch] Cliente HTTP.
 * @returns {Promise<Object>} Respuesta procesada del backend.
 * @throws {Error} Cuando la solicitud o la respuesta no son exitosas.
 */
export async function enviarInspeccionEpp(
  formData,
  {
    solicitar = fetch,
  } = {},
) {
  const respuesta = await solicitar(
    "/enviar-inspeccion-epp",
    {
      method: "POST",
      body: formData,
    },
  );

  const data = await respuesta.json();

  if (!respuesta.ok || !data.ok) {
    throw new Error(
      data.mensaje ||
        "No fue posible registrar la inspección EPP.",
    );
  }

  return data;
}