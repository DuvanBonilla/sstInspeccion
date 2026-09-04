const { normalizarTexto } = require("../utils/texto.util");
const ESTADOS_VALIDOS = new Set(["B", "R", "M", "NC", "NA"]);
const VALORES_SI_NO   = new Set(["Sí", "No", ""]);

/**
 * Normaliza la información de un insumo perteneciente a un botiquín.
 *
 * Limpia sus campos de texto, convierte la integridad y el plan de
 * intervención a mayúsculas y admite nombres alternativos para la evidencia.
 *
 * @param {Object} item - Insumo recibido en el payload.
 * @returns {{
 *   no: number|string,
 *   item: string,
 *   cantidadIdeal: string,
 *   cantidadReal: string,
 *   integridadEmpaque: string,
 *   fechaVencimiento: string,
 *   planIntervencion: string,
 *   fechaIntervencion: string,
 *   cumplimiento: string,
 *   observaciones: string,
 *   afectacionServicio: string,
 *   evidenciaArchivo: string,
 *   evidenciaRuta: string
 * }|null} Insumo normalizado, o `null` si el valor recibido no es un objeto.
 */
function normalizarBotiquinItem(item) {
  if (!item || typeof item !== "object") return null;

  // Normaliza cada campo del ítem, asegurando que sean cadenas y aplicando mayúsculas donde corresponde
  return {
    no: item.no || "",
    item: normalizarTexto(item.item),
    cantidadIdeal: normalizarTexto(item.cantidadIdeal),
    cantidadReal: normalizarTexto(item.cantidadReal),
    integridadEmpaque: normalizarTexto(item.integridadEmpaque).toUpperCase(),
    fechaVencimiento: normalizarTexto(item.fechaVencimiento),
    planIntervencion: normalizarTexto(item.planIntervencion).toUpperCase(),
    fechaIntervencion: normalizarTexto(item.fechaIntervencion),
    cumplimiento: normalizarTexto(item.cumplimiento),
    observaciones: normalizarTexto(item.observaciones),
    afectacionServicio: normalizarTexto(item.afectacionServicio),
    evidenciaArchivo: normalizarTexto(item.evidenciaArchivo || item.evidenciaNombre),
    evidenciaRuta: normalizarTexto(item.evidenciaRuta)
  };
}

/**
 * Normaliza un botiquín y todos sus insumos.
 *
 * Limpia los datos generales y de evidencia del botiquín, y normaliza
 * individualmente los elementos incluidos en su colección `items`.
 *
 * @param {Object} botiquin - Botiquín recibido en el payload.
 * @returns {{
 *   numero: string,
 *   ubicacion: string,
 *   observacionGeneral: string,
 *   evidenciaGeneralArchivo: string,
 *   evidenciaArchivo: string,
 *   evidenciaRuta: string,
 *   items: Array<Object>
 * }|null} Botiquín normalizado, o `null` si el valor recibido no es un objeto.
 */
function normalizarBotiquin(botiquin) {
  if (!botiquin || typeof botiquin !== "object") return null;

  return {
    numero: normalizarTexto(botiquin.numero),
    ubicacion: normalizarTexto(botiquin.ubicacion),
    observacionGeneral: normalizarTexto(botiquin.observacionGeneral),
    evidenciaGeneralArchivo: normalizarTexto(botiquin.evidenciaGeneralArchivo),
    evidenciaArchivo: normalizarTexto(botiquin.evidenciaArchivo || botiquin.evidenciaNombre),
    evidenciaRuta: normalizarTexto(botiquin.evidenciaRuta),
    items: Array.isArray(botiquin.items) ? botiquin.items.map(normalizarBotiquinItem).filter(Boolean) : []
  };
}
/**
 * Obtiene y normaliza los botiquines presentes en el payload.
 *
 * Admite tanto la colección `botiquines` como el objeto individual
 * `botiquin` y devuelve siempre una lista uniforme, descartando valores
 * inválidos.
 *
 * @param {Object} payload - Payload recibido para la inspección SST.
 * @returns {Array<Object>} Botiquines normalizados.
 */
function normalizarBotiquines(payload) {
  if (Array.isArray(payload?.botiquines)) {
    return payload.botiquines.map(normalizarBotiquin).filter(Boolean);
  }

  const unico = normalizarBotiquin(payload?.botiquin);
  return unico ? [unico] : [];
}
/**
 * Valida los botiquines y los insumos registrados en cada uno.
 *
 * Comprueba el número y ubicación del botiquín, así como la existencia
 * de insumos. Para cada elemento verifica su nombre, cantidades, integridad
 * del empaque, cumplimiento y afectación al servicio.
 *
 * Los incumplimientos encontrados se agregan al arreglo de errores recibido.
 *
 * @param {Array<Object>} botiquines - Botiquines previamente normalizados.
 * @param {string[]} errores - Arreglo donde deben acumularse los errores.
 * @returns {Array<Object>} Botiquines validados junto con sus insumos.
 */

function validarBotiquines(botiquines, errores) {
  return botiquines.map((botiquin, index) => {
    if (!botiquin.numero) errores.push(`Numero de botiquin es obligatorio en botiquin ${index + 1}`);
    if (!botiquin.ubicacion) errores.push(`Ubicacion de botiquin es obligatoria en botiquin ${index + 1}`);

    const items = Array.isArray(botiquin.items) ? botiquin.items : [];
    if (items.length === 0) {
      errores.push(`Debe agregar items en botiquin ${index + 1}`);
    }

    // Validación de cada ítem dentro del botiquín
    for (const [itemIndex, item] of items.entries()) {
      if (!item.item) errores.push(`Item obligatorio en botiquin ${index + 1}, fila ${itemIndex + 1}`);
      if (!item.cantidadIdeal) errores.push(`Cantidad ideal obligatoria en botiquin ${index + 1}, fila ${itemIndex + 1}`);
      if (!item.cantidadReal) errores.push(`Cantidad real obligatoria en botiquin ${index + 1}, fila ${itemIndex + 1}`);

      if (!ESTADOS_VALIDOS.has(item.integridadEmpaque)) {
        errores.push(`Integridad empaque invalida en botiquin ${index + 1}, fila ${itemIndex + 1}`);
      }

      if (!VALORES_SI_NO.has(item.cumplimiento)) {
        errores.push(`Cumplimiento invalido en botiquin ${index + 1}, fila ${itemIndex + 1}`);
      }

      if (!VALORES_SI_NO.has(item.afectacionServicio)) {
        errores.push(`Afectacion al servicio invalida en botiquin ${index + 1}, fila ${itemIndex + 1}`);
      }
    }

    return botiquin;
  });
}

// Exportación de las funciones para normalización y validación de botiquines
module.exports = {
  normalizarBotiquines,
  validarBotiquines
};
