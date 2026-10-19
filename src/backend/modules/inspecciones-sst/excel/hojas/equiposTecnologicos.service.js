const {
  obtenerEquiposTecnologicosSstAprobados,
} = require("../seguimientoSstExcel.model");

const {
  obtenerXml,
  reemplazarXml,
  actualizarFilasHojaXml,
  actualizarRangoTablaXml,
} = require("../../../../shared/utils/excelXml.util");

const { aplicarFormatoHojaDatos } = require("./formatoHojas.service");

const {
  obtenerRutaHoja,
  obtenerRutaTabla,
} = require("../rutasLibroExcel");

const NOMBRE_HOJA_EQUIPOS_TECNOLOGICOS = "Equipo_T.A.D.E";

const ULTIMA_COLUMNA_EQUIPOS_TECNOLOGICOS = "Q";

/**
 * Transforma un equipo tecnológico en una fila del seguimiento SST.
 *
 * Distribuye la información de la inspección y del equipo entre las columnas
 * utilizadas por la hoja `Equipo_T.A.D.E`.
 *
 * @param {Object} equipo - Registro de equipo tecnológico obtenido desde la base de datos.
 * @returns {Object<string, string|number|Date>}
 * Fila preparada para escribirse en las columnas `A` hasta `Q`.
 */

function construirFilaEquipoTecnologico(equipo) {
  return {
    A: equipo.inspeccion_id ?? "",
    B: equipo.inspecciones_id ?? "",
    C: equipo.fecha ?? "",
    D: equipo.sede_operacion ?? "",
    E: equipo.area_trabajo ?? "",
    F: equipo.jefe_responsable ?? "",
    G: equipo.cargo_jefe ?? "",
    H: equipo.responsable_inspeccion ?? "",
    I: equipo.cargo_responsable ?? "",
    J: equipo.equipo_tecnologico ?? "",
    K: equipo.ubicacion ?? "",
    L: equipo.cantidad ?? "",
    M: equipo.estado ?? "",
    N: equipo.mantenimiento ?? "",
    O: equipo.observaciones ?? "",
    P: equipo.afectacion_servicio ?? "",
    Q: equipo.evidencia_archivo ?? "",
  };
}

/**
 * Obtiene los equipos tecnológicos de inspecciones SST aprobadas.
 *
 * Consulta los registros mediante el modelo de seguimiento y transforma
 * cada equipo en una fila compatible con la hoja `Equipo_T.A.D.E`.
 *
 * @async
 * @returns {Promise<Array<Object>>}
 * Filas de equipos tecnológicos preparadas para el Excel.
 */

async function obtenerFilasEquiposTecnologicosSstAprobados() {
  const equiposTecnologicos = await obtenerEquiposTecnologicosSstAprobados();

  return equiposTecnologicos.map(construirFilaEquipoTecnologico);
}

/**
 * Actualiza la hoja y la tabla de equipos tecnológicos del seguimiento SST.
 *
 * Obtiene los registros aprobados, reemplaza las filas del XML de la hoja,
 * ajusta el rango de la tabla estructurada y guarda ambos contenidos dentro
 * del archivo Excel cargado en memoria.
 *
 * @async
 * @param {@param {AdmZip} zip} zip - Archivo Excel abierto como contenedor ZIP.
 * @returns {Promise<{
 *   totalEquiposTecnologicos: number,
 *   rango: string,
 *   inspecciones: string[]
 * }>} Resultado de la actualización, rango de la tabla e identificadores
 * únicos de las inspecciones incluidas.
 */

async function actualizarEquiposTecnologicos(zip) {
  const filas = await obtenerFilasEquiposTecnologicosSstAprobados();

  const rutaHoja = obtenerRutaHoja(zip, NOMBRE_HOJA_EQUIPOS_TECNOLOGICOS);

  const rutaTabla = obtenerRutaTabla(zip, rutaHoja);

  const hojaXml = obtenerXml(zip, rutaHoja);

  const tablaXml = obtenerXml(zip, rutaTabla);

  const hojaXmlActualizada = actualizarFilasHojaXml({
    hojaXml,
    filas,
    ultimaColumna: ULTIMA_COLUMNA_EQUIPOS_TECNOLOGICOS,
    nombreHoja: "Equipo_T.A.D.E",
    columnasFecha: ["C"],
    columnasNumericas: ["B", "L"],
  });

  const { xml: tablaXmlActualizada, rango } = actualizarRangoTablaXml({
    tablaXml,
    ultimaColumna: ULTIMA_COLUMNA_EQUIPOS_TECNOLOGICOS,
    cantidadFilas: filas.length,
  });

  reemplazarXml(zip, rutaHoja, hojaXmlActualizada);

  reemplazarXml(zip, rutaTabla, tablaXmlActualizada);

  aplicarFormatoHojaDatos(zip, {
    ruta: rutaHoja,
    ultimaColumna: ULTIMA_COLUMNA_EQUIPOS_TECNOLOGICOS,
    columnasFecha: ["C"],
    calificaciones: { desde: "M", hasta: "N" },
    filaFinal: 1000,
  });

  return {
    totalEquiposTecnologicos: filas.length,
    rango,
    inspecciones: [...new Set(filas.map((fila) => fila.A))],
  };
}

module.exports = {
  obtenerFilasEquiposTecnologicosSstAprobados,
  actualizarEquiposTecnologicos,
};
