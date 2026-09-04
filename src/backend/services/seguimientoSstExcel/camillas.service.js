const {
  obtenerCamillasSstAprobadas,
} = require("../../models/seguimientoSstExcel.model");

const {
  obtenerXml,
  reemplazarXml,

  actualizarFilasHojaXml,
  actualizarRangoTablaXml,
} = require("../../utils/excelXml.util");

const RUTA_HOJA_CAMILLAS = "xl/worksheets/sheet3.xml";

const RUTA_TABLA_CAMILLAS = "xl/tables/table2.xml";

const ULTIMA_COLUMNA_CAMILLAS = "U";

const COLUMNAS_CONDICION_CAMILLA = [
  ["L", "senalizacion"],
  ["M", "acceso"],
  ["N", "estadoSoporte"],
  ["O", "instalacionPared"],
  ["P", "correasSeguridad"],
  ["Q", "limpieza"],
  ["R", "inmovilizador"],
];

/**
 * Transforma una camilla en una fila de la hoja de seguimiento SST.
 *
 * Combina la información general de la inspección con los datos de la camilla
 * y distribuye cada condición evaluada en la columna correspondiente de la
 * hoja `Camillas`.
 *
 * @param {Object} inspeccion - Información general de la inspección SST.
 * @param {Object} camilla - Camilla que debe incorporarse al seguimiento.
 * @returns {Object<string, string|number|Date>}
 * Fila preparada para escribirse en las columnas `A` hasta `U`.
 */

function mapearCamillaAExcel(inspeccion, camilla) {
  const fila = {
    A: inspeccion.inspeccion_id || "",
    B: inspeccion.inspecciones_id || "",
    C: inspeccion.fecha || "",
    D: inspeccion.sede_operacion || "",
    E: inspeccion.area_trabajo || "",
    F: inspeccion.jefe_responsable || "",
    G: inspeccion.cargo_jefe || "",
    H: inspeccion.responsable_inspeccion || "",
    I: inspeccion.cargo_responsable || "",

    J: camilla.numero || "",
    K: camilla.ubicacion || "",

    S: camilla.observaciones || "",

    T: camilla.afectacion_productividad || "",

    U: camilla.evidencia_archivo || "",
  };

  const condiciones = camilla.condiciones || {};

  for (const [columna, campo] of COLUMNAS_CONDICION_CAMILLA) {
    fila[columna] = condiciones[campo] || "";
  }

  return fila;
}

/**
 * Obtiene las camillas de inspecciones SST aprobadas y las prepara para Excel.
 *
 * Consulta los registros mediante el modelo de seguimiento y transforma
 * cada resultado en una fila compatible con la hoja `Camillas`.
 *
 * @async
 * @returns {Promise<Array<Object>>} Filas de camillas preparadas para el Excel.
 */

async function obtenerFilasCamillasSstAprobadas() {
  const registros = await obtenerCamillasSstAprobadas();

  return registros.map((registro) => mapearCamillaAExcel(registro, registro));
}

async function actualizarCamillas(zip) {
  if (!zip) {
    throw new Error("Se requiere el archivo Excel cargado en memoria");
  }

  const filasCamillas = await obtenerFilasCamillasSstAprobadas();

  const hojaXml = obtenerXml(zip, RUTA_HOJA_CAMILLAS);

  const tablaXml = obtenerXml(zip, RUTA_TABLA_CAMILLAS);

  const hojaActualizada = actualizarFilasHojaXml({
    hojaXml,

    filas: filasCamillas,

    ultimaColumna: ULTIMA_COLUMNA_CAMILLAS,

    nombreHoja: "Camillas",

    columnasFecha: ["C"],

    columnasNumericas: ["B"],
  });

  const tablaActualizada = actualizarRangoTablaXml({
    tablaXml,

    ultimaColumna: ULTIMA_COLUMNA_CAMILLAS,

    cantidadFilas: filasCamillas.length,
  });

  reemplazarXml(zip, RUTA_HOJA_CAMILLAS, hojaActualizada);

  reemplazarXml(zip, RUTA_TABLA_CAMILLAS, tablaActualizada.xml);

  return {
    totalCamillas: filasCamillas.length,

    rango: tablaActualizada.rango,

    inspecciones: filasCamillas.map((fila) => fila.A),
  };
}

/**
 * Actualiza la hoja y la tabla de camillas del seguimiento SST.
 *
 * Obtiene las camillas aprobadas, reemplaza las filas del XML de la hoja,
 * ajusta el rango de la tabla estructurada y guarda ambos contenidos dentro
 * del archivo Excel cargado en memoria.
 *
 * @async
 * @param {@param {AdmZip} zip} zip - Archivo Excel abierto como contenedor ZIP.
 * @returns {Promise<{
 *   totalCamillas: number,
 *   rango: string,
 *   inspecciones: string[]
 * }>} Resultado de la actualización, rango de la tabla e inspecciones incluidas.
 * @throws {Error} Si no se proporciona el archivo Excel cargado en memoria.
 */

module.exports = {
  mapearCamillaAExcel,
  obtenerFilasCamillasSstAprobadas,
  actualizarCamillas,
};
