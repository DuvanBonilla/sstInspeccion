/**
 * Construye la estructura normalizada de las aprobaciones
 * almacenadas en una inspección.
 *
 * @param {Object} inspeccion Registro de inspección.
 * @returns {Object} Aprobaciones por rol.
 */
function construirAprobaciones(inspeccion) {
  return {
    inspector: {
      nombre: inspeccion.aprobacion_inspector_nombre || "",
    },
    jefe: {
      nombre: inspeccion.aprobacion_jefe_nombre || "",
    },
    copasst: {
      nombre: inspeccion.aprobacion_copasst_nombre || "",
    },
  };
}

module.exports = {
  construirAprobaciones,
};