/**
 * Construye el contenido multipart de una inspección EPP.
 *
 * Incorpora el payload serializado y las evidencias relacionadas con la
 * posición actual de cada trabajador.
 *
 * @param {Object} parametros Datos necesarios para construir el FormData.
 * @param {Object} parametros.inspeccion Payload de la inspección.
 * @param {Array<Object>} [parametros.evidencias=[]] Evidencias procesadas.
 * @param {Function} [parametros.crearFormData] Creador del FormData.
 * @returns {FormData|Object} Contenido multipart construido.
 */
export function construirFormDataEpp({
  inspeccion,
  evidencias = [],
  crearFormData = () => new FormData(),
} = {}) {
  const formData = crearFormData();

  formData.append(
    "payload",
    JSON.stringify(inspeccion),
  );

  evidencias.forEach((evidencia) => {
    const indice = evidencia.indice;

    const archivo = evidencia.archivo;

    if (!archivo) {
      return;
    }

    const nombreCampo =
      `evidencia_trabajador_${indice}`;

    formData.append(
      nombreCampo,
      archivo,
      archivo.name,
    );

    formData.append(
      `${nombreCampo}_lastmod`,
      String(archivo.lastModified || ""),
    );
  });

  return formData;
}