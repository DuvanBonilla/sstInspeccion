const { normalizarTexto } = require("../utils/texto.util");
const ESTADOS_VALIDOS = new Set(["B", "R", "M", "NC", "NA"]);
const AFECTACION_SERVICIO_VALIDOS = new Set(["SI", "NO"]);

// Lista de equipos tecnológicos fijos que se esperan en el payload
const EQUIPOS_TECNOLOGICOS = [
  "Sensor de humo",
  "Sensor de movimiento",
  "Camaras de seguridad",
  "Alarma de emergencia",
];
/**
 * Normaliza la información de un equipo tecnológico.
 *
 * Limpia los campos de texto, normaliza las calificaciones en mayúsculas
 * y admite nombres alternativos para el tipo, la afectación y la evidencia.
 * Cuando el número o el tipo no están disponibles, utiliza la posición y
 * el catálogo fijo de equipos como valores predeterminados.
 *
 * @param {Object} equipoTecnologico - Equipo recibido en el payload.
 * @param {number} index - Posición del equipo dentro de la colección.
 * @returns {{
 *   no: string,
 *   equipoTecnologico: string,
 *   ubicacion: string,
 *   cantidad: string,
 *   estado: string,
 *   mantenimiento: string,
 *   observaciones: string,
 *   afectacionServicio: string,
 *   evidenciaArchivo: string,
 *   evidenciaRuta: string
 * }|null} Equipo normalizado, o `null` si el valor recibido no es un objeto.
 */

function normalizarEquipoTecnologico(equipoTecnologico, index) {
  if (!equipoTecnologico || typeof equipoTecnologico !== "object") return null;

  // Si el campo 'no' no es un número válido, se asigna el índice + 1 como valor predeterminado.
  return {
    no: Number.isFinite(Number(equipoTecnologico.no))
      ? String(equipoTecnologico.no)
      : String(index + 1),
    equipoTecnologico: normalizarTexto(
      equipoTecnologico.equipoTecnologico ||
        equipoTecnologico.tipo ||
        EQUIPOS_TECNOLOGICOS[index] ||
        "",
    ),
    ubicacion: normalizarTexto(equipoTecnologico.ubicacion),
    cantidad: normalizarTexto(equipoTecnologico.cantidad),
    estado: normalizarTexto(equipoTecnologico.estado).toUpperCase(),
    mantenimiento: normalizarTexto(
      equipoTecnologico.mantenimiento,
    ).toUpperCase(),
    observaciones: normalizarTexto(equipoTecnologico.observaciones),
    afectacionServicio: normalizarTexto(
      equipoTecnologico.afectacionServicio || equipoTecnologico.afectacion,
    ).toUpperCase(),
    evidenciaArchivo: normalizarTexto(
      equipoTecnologico.evidenciaArchivo || equipoTecnologico.evidenciaNombre,
    ),
    evidenciaRuta: normalizarTexto(equipoTecnologico.evidenciaRuta),
  };
}
/**
 * Obtiene y normaliza los equipos tecnológicos presentes en el payload.
 *
 * Admite tanto la colección `equiposTecnologicos` como el objeto individual
 * `equipoTecnologico` y devuelve siempre una lista uniforme, descartando
 * los valores inválidos.
 *
 * @param {Object} payload - Payload recibido para la inspección SST.
 * @returns {Array<Object>} Equipos tecnológicos normalizados.
 */

function normalizarEquiposTecnologicos(payload) {
  if (Array.isArray(payload?.equiposTecnologicos)) {
    return payload.equiposTecnologicos
      .map((equipoTecnologico, index) =>
        normalizarEquipoTecnologico(equipoTecnologico, index),
      )
      .filter(Boolean);
  }

  const unico = normalizarEquipoTecnologico(payload?.equipoTecnologico, 0);
  return unico ? [unico] : [];
}
/**
 * Valida la información de los equipos tecnológicos.
 *
 * Comprueba el tipo de equipo, la ubicación y la cantidad. También verifica
 * que el estado y el mantenimiento correspondan con una calificación válida,
 * y que la afectación al servicio sea `SI` o `NO`.
 *
 * Los incumplimientos encontrados se agregan al arreglo de errores recibido.
 *
 * @param {Array<Object>} equiposTecnologicos
 * Equipos previamente normalizados.
 * @param {string[]} errores - Arreglo donde deben acumularse los errores.
 * @returns {Array<Object>} Equipos tecnológicos validados.
 */

function validarEquiposTecnologicos(equiposTecnologicos, errores) {
  return equiposTecnologicos.map((equipoTecnologico, index) => {
    if (!equipoTecnologico.equipoTecnologico) {
      errores.push(
        `Equipo tecnologico es obligatorio en registro ${index + 1}`,
      );
    }

    if (!equipoTecnologico.ubicacion) {
      errores.push(
        `Ubicacion es obligatoria en equipo tecnologico ${index + 1}`,
      );
    }

    if (!equipoTecnologico.cantidad) {
      errores.push(
        `Cantidad es obligatoria en equipo tecnologico ${index + 1}`,
      );
    }

    if (!ESTADOS_VALIDOS.has(equipoTecnologico.estado)) {
      errores.push(`Estado invalido en equipo tecnologico ${index + 1}`);
    }

    if (!ESTADOS_VALIDOS.has(equipoTecnologico.mantenimiento)) {
      errores.push(`Mantenimiento invalido en equipo tecnologico ${index + 1}`);
    }

    if (
      !AFECTACION_SERVICIO_VALIDOS.has(equipoTecnologico.afectacionServicio)
    ) {
      errores.push(
        `Afectacion al servicio debe ser SI o NO en equipo tecnologico ${index + 1}`,
      );
    }

    return equipoTecnologico;
  });
}

module.exports = {
  normalizarEquiposTecnologicos,
  validarEquiposTecnologicos,
};
