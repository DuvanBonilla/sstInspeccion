const {
  obtenerBotiquinItemsSstAprobados,
} = require("../../models/seguimientoSstExcel.model");

const {
  obtenerXml,
  reemplazarXml,
  actualizarFilasHojaXml,
  actualizarRangoTablaXml,
} = require("../../utils/excelXml.util");

const RUTA_HOJA_BOTIQUINES =
  "xl/worksheets/sheet7.xml";

const RUTA_TABLA_BOTIQUINES =
  "xl/tables/table5.xml";

const ULTIMA_COLUMNA_BOTIQUINES = "W";

/**
 * Transforma un insumo de botiquín en una fila del seguimiento SST.
 *
 * Distribuye la información de la inspección, el botiquín y el insumo entre
 * las columnas utilizadas por la hoja `Botiquin`, incluyendo cantidades,
 * integridad, vencimiento, intervención, cumplimiento y evidencia.
 *
 * @param {Object} itemBotiquin
 * Registro de un insumo de botiquín obtenido desde la base de datos.
 * @returns {Object<string, string|number|Date>}
 * Fila preparada para escribirse en las columnas `A` hasta `W`.
 */

function construirFilaBotiquin(itemBotiquin) {
  return {
    A: itemBotiquin.inspeccion_id ?? "",

    B: itemBotiquin.inspecciones_id ?? "",

    C: itemBotiquin.numero_item ?? "",

    D: itemBotiquin.fecha ?? "",

    E: itemBotiquin.sede_operacion ?? "",

    F: itemBotiquin.area_trabajo ?? "",

    G: itemBotiquin.jefe_responsable ?? "",

    H: itemBotiquin.cargo_jefe ?? "",

    I: itemBotiquin.responsable_inspeccion ?? "",

    J: itemBotiquin.cargo_responsable ?? "",

    K: itemBotiquin.numero_botiquin ?? "",

    L: itemBotiquin.item ?? "",

    M: itemBotiquin.cantidad_ideal ?? "",

    N: itemBotiquin.cantidad_real ?? "",

    O: itemBotiquin.integridad_empaque ?? "",

    P: itemBotiquin.fecha_vencimiento ?? "",

    Q: itemBotiquin.plan_intervencion ?? "",

    R: itemBotiquin.fecha_intervencion ?? "",

    S: itemBotiquin.cumplimiento ?? "",

    T: itemBotiquin.observaciones ?? "",

    U: itemBotiquin.afectacion_servicio ?? "",

    V: itemBotiquin.evidencia_archivo ?? "",

    W: itemBotiquin.evidencia_ruta ?? "",
  };
}

/**
 * Obtiene los insumos de botiquines pertenecientes a inspecciones SST aprobadas.
 *
 * Consulta los registros mediante el modelo de seguimiento y transforma
 * cada insumo en una fila compatible con la hoja `Botiquin`.
 *
 * @async
 * @returns {Promise<Array<Object>>}
 * Filas de insumos de botiquines preparadas para el Excel.
 */

async function obtenerFilasBotiquinesSstAprobados() {
  const itemsBotiquin =
    await obtenerBotiquinItemsSstAprobados();

  return itemsBotiquin.map(construirFilaBotiquin);
}

/**
 * Actualiza la hoja y la tabla de botiquines del seguimiento SST.
 *
 * Obtiene los insumos aprobados, reemplaza las filas del XML de la hoja,
 * ajusta el rango de la tabla estructurada y guarda ambos contenidos dentro
 * del archivo Excel cargado en memoria.
 *
 * Durante la actualización identifica las columnas de fecha y las columnas
 * numéricas para que sean escritas con el tipo correspondiente.
 *
 * @async
 * @param {@param {AdmZip} zip} zip - Archivo Excel abierto como contenedor ZIP.
 * @returns {Promise<{
 *   totalBotiquinItems: number,
 *   rango: string,
 *   inspecciones: string[],
 *   botiquines: string[]
 * }>} Resultado de la actualización, rango utilizado e identificadores
 * únicos de inspecciones y botiquines incluidos.
 */
async function actualizarBotiquines(zip) {
  const filas =
    await obtenerFilasBotiquinesSstAprobados();

  const hojaXml = obtenerXml(
    zip,
    RUTA_HOJA_BOTIQUINES,
  );

  const tablaXml = obtenerXml(
    zip,
    RUTA_TABLA_BOTIQUINES,
  );

  const hojaXmlActualizada = actualizarFilasHojaXml({
    hojaXml,

    filas,

    ultimaColumna: ULTIMA_COLUMNA_BOTIQUINES,

    nombreHoja: "Botiquin",

    columnasFecha: ["D", "P", "R"],

    columnasNumericas: ["B", "C", "M", "N"],
  });

  const {
    xml: tablaXmlActualizada,
    rango,
  } = actualizarRangoTablaXml({
    tablaXml,

    ultimaColumna: ULTIMA_COLUMNA_BOTIQUINES,

    cantidadFilas: filas.length,
  });

  reemplazarXml(
    zip,
    RUTA_HOJA_BOTIQUINES,
    hojaXmlActualizada,
  );

  reemplazarXml(
    zip,
    RUTA_TABLA_BOTIQUINES,
    tablaXmlActualizada,
  );

  return {
    totalBotiquinItems: filas.length,

    rango,

    inspecciones: [
      ...new Set(filas.map((fila) => fila.A)),
    ],

    botiquines: [
      ...new Set(filas.map((fila) => fila.K)),
    ],
  };
}

module.exports = {
  obtenerFilasBotiquinesSstAprobados,

  actualizarBotiquines,
};