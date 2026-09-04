const {
  obtenerSenalizacionesSstAprobadas,
} = require("../../models/seguimientoSstExcel.model");

const {
  obtenerXml,
  reemplazarXml,

  actualizarFilasHojaXml,
  actualizarRangoTablaXml,
} = require("../../utils/excelXml.util");

const RUTA_HOJA_SENALIZACIONES =
  "xl/worksheets/sheet4.xml";

const RUTA_TABLA_SENALIZACIONES =
  "xl/tables/table3.xml";

const ULTIMA_COLUMNA_SENALIZACIONES =
  "P";

  /**
 * Transforma una señalización en una fila de la hoja de seguimiento SST.
 *
 * Combina la información general de la inspección con el tipo, ubicación,
 * cantidad, estado, aseo, observaciones y evidencia de la señalización.
 *
 * @param {Object} inspeccion - Información general de la inspección SST.
 * @param {Object} senalizacion - Señalización que debe incorporarse al seguimiento.
 * @returns {Object<string, string|number|Date>}
 * Fila preparada para escribirse en las columnas `A` hasta `P`.
 */

function mapearSenalizacionAExcel(
  inspeccion,
  senalizacion,
) {
  return {
    A: inspeccion.inspeccion_id || "",

    B: inspeccion.inspecciones_id || "",

    C: inspeccion.fecha || "",

    D: inspeccion.sede_operacion || "",

    E: inspeccion.area_trabajo || "",

    F: inspeccion.jefe_responsable || "",

    G: inspeccion.cargo_jefe || "",

    H: inspeccion.responsable_inspeccion || "",

    I: inspeccion.cargo_responsable || "",

    J: senalizacion.tipo || "",

    K: senalizacion.ubicacion || "",

    L: senalizacion.cantidad || "",

    M: senalizacion.estado || "",

    N: senalizacion.aseo || "",

    O: senalizacion.observaciones || "",

    P: senalizacion.evidencia_archivo || "",
  };
}

/**
 * Obtiene las señalizaciones de inspecciones SST aprobadas y las prepara para Excel.
 *
 * Consulta los registros mediante el modelo de seguimiento y transforma
 * cada resultado en una fila compatible con la hoja `Señalizacion`.
 *
 * @async
 * @returns {Promise<Array<Object>>}
 * Filas de señalizaciones preparadas para el Excel.
 */

async function obtenerFilasSenalizacionesSstAprobadas() {
  const registros =
    await obtenerSenalizacionesSstAprobadas();

  return registros.map((registro) =>
    mapearSenalizacionAExcel(
      registro,
      registro,
    ),
  );
}

/**
 * Actualiza la hoja y la tabla de señalizaciones del seguimiento SST.
 *
 * Obtiene las señalizaciones aprobadas, reemplaza las filas del XML de la
 * hoja, ajusta el rango de la tabla estructurada y guarda ambos contenidos
 * dentro del archivo Excel cargado en memoria.
 *
 * @async
 * @param {@param {AdmZip} zip} zip - Archivo Excel abierto como contenedor ZIP.
 * @returns {Promise<{
 *   totalSenalizaciones: number,
 *   rango: string,
 *   inspecciones: string[]
 * }>} Resultado de la actualización, rango de la tabla e inspecciones incluidas.
 * @throws {Error} Si no se proporciona el archivo Excel cargado en memoria.
 */

async function actualizarSenalizaciones(zip) {
  if (!zip) {
    throw new Error(
      "Se requiere el archivo Excel cargado en memoria",
    );
  }

  const filasSenalizaciones =
    await obtenerFilasSenalizacionesSstAprobadas();

  const hojaXml = obtenerXml(
    zip,
    RUTA_HOJA_SENALIZACIONES,
  );

  const tablaXml = obtenerXml(
    zip,
    RUTA_TABLA_SENALIZACIONES,
  );

  const hojaActualizada =
    actualizarFilasHojaXml({
      hojaXml,

      filas: filasSenalizaciones,

      ultimaColumna:
        ULTIMA_COLUMNA_SENALIZACIONES,

      nombreHoja:
        "Señalizacion",

      columnasFecha:
        ["C"],

      columnasNumericas:
        ["B", "L"],
    });

  const tablaActualizada =
    actualizarRangoTablaXml({
      tablaXml,

      ultimaColumna:
        ULTIMA_COLUMNA_SENALIZACIONES,

      cantidadFilas:
        filasSenalizaciones.length,
    });

  reemplazarXml(
    zip,
    RUTA_HOJA_SENALIZACIONES,
    hojaActualizada,
  );

  reemplazarXml(
    zip,
    RUTA_TABLA_SENALIZACIONES,
    tablaActualizada.xml,
  );

  return {
    totalSenalizaciones:
      filasSenalizaciones.length,

    rango:
      tablaActualizada.rango,

    inspecciones:
      filasSenalizaciones.map(
        (fila) => fila.A,
      ),
  };
}

module.exports = {
  mapearSenalizacionAExcel,

  obtenerFilasSenalizacionesSstAprobadas,

  actualizarSenalizaciones,
};