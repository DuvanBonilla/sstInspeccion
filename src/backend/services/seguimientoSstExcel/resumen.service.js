const {
  obtenerResumenInspeccionesSstAprobadas,
} = require("../../models/seguimientoSstExcel.model");

const {
  obtenerXml,
  reemplazarXml,
  actualizarFilasHojaXml,
} = require("../../utils/excelXml.util");

const RUTA_HOJA_RESUMEN =
  "xl/worksheets/sheet6.xml";

const ULTIMA_COLUMNA_RESUMEN = "F";

/**
 * Transforma una inspección SST en una fila de la hoja de resumen.
 *
 * Relaciona los datos generales de la inspección con las columnas utilizadas
 * por la hoja `_RESUMEN` del archivo de seguimiento.
 *
 * @param {Object} inspeccion - Inspección SST obtenida desde la base de datos.
 * @returns {{
 *   A: string,
 *   B: string|Date,
 *   C: string,
 *   D: string,
 *   E: string,
 *   F: string
 * }} Fila preparada para ser escrita en la hoja de resumen.
 */

function construirFilaResumen(inspeccion) {
  return {
    A: inspeccion.inspeccion_id ?? "",

    B: inspeccion.fecha ?? "",

    C: inspeccion.sede_operacion ?? "",

    D: inspeccion.area_trabajo ?? "",

    E: inspeccion.responsable_inspeccion ?? "",

    F: inspeccion.cargo_responsable ?? "",
  };
}

/**
 * Obtiene las inspecciones SST aprobadas y las convierte en filas de resumen.
 *
 * Consulta la información consolidada mediante el modelo de seguimiento
 * y transforma cada inspección a la estructura de columnas utilizada
 * por la hoja `_RESUMEN`.
 *
 * @async
 * @returns {Promise<Array<{
 *   A: string,
 *   B: string|Date,
 *   C: string,
 *   D: string,
 *   E: string,
 *   F: string
 * }>>} Filas correspondientes a las inspecciones SST aprobadas.
 */

async function obtenerFilasResumenSstAprobadas() {
  const inspecciones =
    await obtenerResumenInspeccionesSstAprobadas();

  return inspecciones.map(construirFilaResumen);
}

/**
 * Actualiza la hoja `_RESUMEN` del archivo de seguimiento SST.
 *
 * Obtiene las inspecciones aprobadas, actualiza las filas del XML de la hoja
 * y reemplaza su contenido dentro del archivo Excel. La columna de fecha se
 * procesa con el formato correspondiente durante la actualización.
 *
 * @async
 * @param {@param {AdmZip} zip} zip - Archivo Excel abierto como contenedor ZIP.
 * @returns {Promise<{
 *   totalInspecciones: number,
 *   rango: string,
 *   inspecciones: string[]
 * }>} Resultado de la actualización, rango utilizado e identificadores incluidos.
 */

async function actualizarResumen(zip) {
  const filas =
    await obtenerFilasResumenSstAprobadas();

  const hojaXml = obtenerXml(
    zip,
    RUTA_HOJA_RESUMEN,
  );

  const hojaXmlActualizada =
    actualizarFilasHojaXml({
      hojaXml,

      filas,

      ultimaColumna:
        ULTIMA_COLUMNA_RESUMEN,

      nombreHoja:
        "_RESUMEN",

      columnasFecha:
        ["B"],

      columnasNumericas:
        [],
    });

  reemplazarXml(
    zip,
    RUTA_HOJA_RESUMEN,
    hojaXmlActualizada,
  );

  return {
    totalInspecciones:
      filas.length,

    rango:
      `A1:${ULTIMA_COLUMNA_RESUMEN}${filas.length + 1}`,

    inspecciones:
      filas.map((fila) => fila.A),
  };
}

module.exports = {
  obtenerFilasResumenSstAprobadas,
  actualizarResumen,
};