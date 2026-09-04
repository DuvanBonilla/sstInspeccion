const { normalizarTexto } = require("../utils/texto.util");
const ESTADOS_VALIDOS = new Set(["B", "R", "M", "NC", "NA"]);
const AFECTACION_PRODUCTIVIDAD_VALIDOS = new Set(["SI", "NO"]);

// Campos de condiciones de camilla que deben ser validados y normalizados.
const CAMPOS_CONDICION_CAMILLA = [
  "senalizacion",
  "acceso",
  "estadoSoporte",
  "instalacionPared",
  "correasSeguridad",
  "limpieza",
  "inmovilizador",
];

/**
 * Normaliza la información de una camilla.
 *
 * Limpia los campos de texto, convierte la afectación a la productividad
 * a mayúsculas, admite nombres alternativos para la evidencia y garantiza
 * que exista un objeto de condiciones.
 *
 * @param {Object} camilla - Camilla recibida en el payload.
 * @returns {{
 *   numero: string,
 *   ubicacion: string,
 *   observaciones: string,
 *   afectacionProductividad: string,
 *   evidenciaArchivo: string,
 *   evidenciaRuta: string,
 *   condiciones: Object
 * }|null} Camilla normalizada, o `null` si el valor recibido no es un objeto.
 */

function normalizarCamilla(camilla) {
  if (!camilla || typeof camilla !== "object") return null;

  return {
    numero: normalizarTexto(camilla.numero),
    ubicacion: normalizarTexto(camilla.ubicacion),
    observaciones: normalizarTexto(camilla.observaciones),
    afectacionProductividad: normalizarTexto(
      camilla.afectacionProductividad,
    ).toUpperCase(),
    evidenciaArchivo: normalizarTexto(
      camilla.evidenciaArchivo || camilla.evidenciaNombre,
    ),
    evidenciaRuta: normalizarTexto(camilla.evidenciaRuta),
    condiciones: camilla.condiciones || {},
  };
}
/**
 * Obtiene y normaliza las camillas presentes en el payload.
 *
 * Admite tanto la colección `camillas` como el objeto individual `camilla`
 * y devuelve siempre una lista uniforme, descartando valores inválidos.
 *
 * @param {Object} payload - Payload recibido para la inspección SST.
 * @returns {Array<Object>} Camillas normalizadas.
 */

function normalizarCamillas(payload) {
  if (Array.isArray(payload?.camillas)) {
    return payload.camillas.map(normalizarCamilla).filter(Boolean);
  }

  const unica = normalizarCamilla(payload?.camilla);
  return unica ? [unica] : [];
}
/**
 * Valida la información y las condiciones de las camillas.
 *
 * Comprueba el número, la ubicación y la afectación a la productividad.
 * También verifica que todas las condiciones configuradas tengan una
 * calificación permitida: `B`, `R`, `M`, `NC` o `NA`.
 *
 * Los errores encontrados se agregan al arreglo recibido y las condiciones
 * válidas se devuelven normalizadas en mayúsculas.
 *
 * @param {Array<Object>} camillas - Camillas previamente normalizadas.
 * @param {string[]} errores - Arreglo donde deben acumularse los errores.
 * @returns {Array<Object>} Camillas con sus condiciones validadas y normalizadas.
 */
function validarCamillas(camillas, errores) {
  return camillas.map((camilla, index) => {
    if (!camilla.numero)
      errores.push(`Numero de camilla es obligatorio en camilla ${index + 1}`);
    if (!camilla.ubicacion)
      errores.push(
        `Ubicacion de camilla es obligatoria en camilla ${index + 1}`,
      );

    if (
      !AFECTACION_PRODUCTIVIDAD_VALIDOS.has(camilla.afectacionProductividad)
    ) {
      errores.push(
        `Afectacion en la productividad debe ser SI o NO en camilla ${index + 1}`,
      );
    }

    // Validar condiciones de camilla
    const condiciones = {};

    for (const campo of CAMPOS_CONDICION_CAMILLA) {
      const valor = normalizarTexto(camilla.condiciones?.[campo]).toUpperCase();

      if (!ESTADOS_VALIDOS.has(valor)) {
        errores.push(`Estado invalido para ${campo} en camilla ${index + 1}`);
        continue;
      }

      condiciones[campo] = valor;
    }

    return {
      ...camilla,
      condiciones,
    };
  });
}

// Exportar funciones y constantes para ser usadas en otros módulos
module.exports = {
  CAMPOS_CONDICION_CAMILLA,
  normalizarCamillas,
  validarCamillas,
};
