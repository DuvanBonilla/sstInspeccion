const { normalizarTexto } = require("../utils/texto.util");

const ESTADOS_VALIDOS = new Set(["B", "R", "M", "NC", "NA"]);

/**
 * Normaliza la información de una señalización.
 *
 * Limpia los campos de texto, convierte el estado y el aseo a mayúsculas,
 * conserva la información de la evidencia y asigna el índice correspondiente
 * dentro de la inspección.
 *
 * @param {Object} [item={}] - Señalización recibida en el payload.
 * @param {number} [idx=0] - Posición de la señalización dentro de la lista.
 * @returns {{
 *   idx: number,
 *   tipo: string,
 *   ubicacion: string,
 *   cantidad: string,
 *   estado: string,
 *   aseo: string,
 *   observaciones: string,
 *   evidenciaRuta: string,
 *   evidenciaArchivo: string,
 *   evidenciaFecha: string|Date|null
 * }} Señalización normalizada.
 */

function normalizarSenalizacion(item = {}, idx = 0) {
  return {
    idx,
    tipo: normalizarTexto(item.tipo),
    ubicacion: normalizarTexto(item.ubicacion),

    cantidad: normalizarTexto(item.cantidad),

    estado: normalizarTexto(item.estado).toUpperCase(),

    aseo: normalizarTexto(item.aseo).toUpperCase(),

    observaciones: normalizarTexto(item.observaciones),
    evidenciaRuta: normalizarTexto(item.evidenciaRuta),
    evidenciaArchivo: normalizarTexto(item.evidenciaArchivo),
    evidenciaFecha: item.evidenciaFecha || null,
  };
}

/**
 * Normaliza la colección de señalizaciones de una inspección.
 *
 * Devuelve una lista vacía cuando el valor recibido no es un arreglo y,
 * para cada señalización válida, aplica la normalización junto con su índice.
 *
 * @param {Array<Object>} lista - Señalizaciones recibidas en el payload.
 * @returns {Array<Object>} Señalizaciones normalizadas.
 */

function normalizarSenalizaciones(lista) {
  if (!Array.isArray(lista)) return [];

  return lista.map((item, idx) => normalizarSenalizacion(item, idx));
}

/**
 * Valida la información obligatoria de las señalizaciones.
 *
 * Comprueba que cada señalización tenga tipo y ubicación, y que su estado
 * corresponda con una calificación permitida: `B`, `R`, `M`, `NC` o `NA`.
 *
 * Los incumplimientos encontrados se agregan al arreglo de errores recibido.
 *
 * @param {Array<Object>} lista - Señalizaciones previamente normalizadas.
 * @param {string[]} errores - Arreglo donde deben acumularse los errores.
 * @returns {void}
 */

function validarSenalizaciones(lista, errores) {
  lista.forEach((item, idx) => {
    const numero = idx + 1;

    if (!item.tipo) {
      errores.push(`Señalización ${numero}: tipo es obligatorio`);
    }

    if (!item.ubicacion) {
      errores.push(`Señalización ${numero}: ubicación es obligatoria`);
    }

    if (!ESTADOS_VALIDOS.has(item.estado)) {
      errores.push(`Señalización ${numero}: estado inválido`);
    }
  });
}

module.exports = {
  normalizarSenalizaciones,
  validarSenalizaciones,
};
