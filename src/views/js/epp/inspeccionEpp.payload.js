/**
 * Construye el payload de una inspección EPP.
 *
 * Mantiene la estructura esperada por el backend y transforma los nombres
 * de los campos de la interfaz en las propiedades de información general.
 *
 * @param {Object} parametros Datos necesarios para construir la inspección.
 * @param {string|null} [parametros.inspeccionId=null] Identificador.
 * @param {Function} parametros.obtenerValor Lector de campos generales.
 * @param {Array<Object>} [parametros.trabajadores=[]] Trabajadores registrados.
 * @returns {Object} Payload estructurado de la inspección EPP.
 */
export function construirInspeccionEpp({
  inspeccionId = null,
  obtenerValor,
  trabajadores = [],
} = {}) {
  const informacionGeneral = {
    fecha: obtenerValor("fecha"),

    sede: obtenerValor("sedeOperacion"),

    area: obtenerValor("areaTrabajo"),

    jefeArea: obtenerValor("jefeResponsable"),

    cargoJefe: obtenerValor("cargoJefe"),

    responsableInspeccion: obtenerValor("responsableInspeccion"),

    cargoResponsable: obtenerValor("cargoResponsable"),
  };

  return {
    tipoInspeccion: "EPP",

    inspeccionId,

    informacionGeneral,

    trabajadores,
  };
}