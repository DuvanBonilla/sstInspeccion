const {
  obtenerInspecciones,
  obtenerSeguimientoEpp,
  obtenerPlanesAccion,
} = require("../models/seguimientoEppExcel.model");

const {
  construirHojaInspecciones,
} = require("./seguimientoEppExcel/inspecciones.service");

const {
  construirHojaSeguimientoEpp,
} = require("./seguimientoEppExcel/trabajadores.service");

const {
  construirHojaPlanesAccion,
} = require("./seguimientoEppExcel/planesAccion.service");

const { crearWorkbook, generarBuffer } = require("./excel.service");

const {
  subirArchivoOneDrive,
  descartarCheckoutOneDrive,
  hacerCheckinOneDrive,
} = require("./graph.service");

const {
  construirHojaResumenEpp,
} = require("./seguimientoEppExcel/resumen.service");

const {
  construirHojaGeneralEpp,
} = require("./seguimientoEppExcel/general.service");

const { obtenerRutaExcelEpp } = require("./seguimientoEppExcel/ruta.service");

const {
  sincronizarCierresDesdeExcelEpp,
} = require("./sincronizacionEppExcel.service");

const CONTENT_TYPE_XLSX =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";


/**
 * Genera el archivo completo de seguimiento de inspecciones EPP.
 *
 * Consulta en paralelo las inspecciones, los trabajadores evaluados y los
 * planes de acción. Con esta información construye las hojas de inspecciones,
 * seguimiento por trabajador, planes de acción, resumen e información general.
 *
 * Esta función crea el archivo en memoria, pero no lo carga en OneDrive.
 *
 * @async
 * @param {Object} [filtros={}] Criterios aplicados a las consultas del seguimiento.
 * @returns {Promise<Buffer>} Contenido binario del archivo XLSX generado.
 * @throws {Error} Si falla alguna consulta o la generación del libro.
 */

async function generarExcelSeguimientoEpp(filtros = {}) {
  const [inspecciones, seguimiento, planes] = await Promise.all([
    obtenerInspecciones(filtros),
    obtenerSeguimientoEpp(filtros),
    obtenerPlanesAccion(filtros),
  ]);

  console.log("[EPP Excel] Filtros:", filtros);
  console.log("[EPP Excel] Inspecciones:", inspecciones.length);
  console.log("[EPP Excel] Trabajadores:", seguimiento.length);
  console.log("[EPP Excel] Planes:", planes.length);
  console.dir(planes, { depth: null });

  const workbook = crearWorkbook();

  workbook.creator = "Sistema de Inspecciones SST";
  workbook.company = "CARGOBAN";
  workbook.created = new Date();
  workbook.modified = new Date();

  construirHojaInspecciones(workbook, inspecciones);
  construirHojaSeguimientoEpp(workbook, seguimiento);
  construirHojaPlanesAccion(workbook, planes);
  const resumen = construirHojaResumenEpp(
    workbook,
    inspecciones,
    seguimiento,
    planes,
  );

  const general = construirHojaGeneralEpp(
    workbook,
    inspecciones,
    seguimiento,
    planes,
  );

  console.log("[EPP Excel] Resumen generado:", {
    totalInspecciones: resumen.totalInspecciones,
    totalTrabajadores: resumen.totalTrabajadores,
    totalPlanes: resumen.totalPlanes,
    rango: resumen.rango,
  });

  return generarBuffer(workbook);
}

/**
 * Sincroniza y reemplaza el archivo de seguimiento EPP en OneDrive.
 *
 * Antes de generar la nueva versión, recupera los cierres registrados
 * manualmente en el Excel existente y los sincroniza con la base de datos.
 * Posteriormente genera el libro utilizando únicamente inspecciones enviadas
 * y lo carga en la ruta configurada de OneDrive.
 *
 * Si el archivo anterior no existe, permite continuar con la generación.
 * Si contiene filas de cierre inválidas, detiene el reemplazo.
 *
 * @async
 * @returns {Promise<Object>} Ruta del archivo, estado utilizado para filtrar
 * las inspecciones, tamaño del archivo y resumen de la sincronización.
 * @throws {Error} Si falla la sincronización, generación o carga en OneDrive.
 */

async function actualizarExcelSeguimientoEppEnOneDrive() {
  const rutaExcel = obtenerRutaExcelEpp();

  const sincronizacion = await sincronizarCierresDesdeExcelEpp({
    detenerSiHayErrores: true,
    permitirArchivoInexistente: true,
  });

  const buffer = await generarExcelSeguimientoEpp({
    estado: "enviada",
  });

  await subirArchivoOneDrive({
    ruta: rutaExcel,
    buffer,
    contentType: CONTENT_TYPE_XLSX,
  });

  return {
    rutaExcel,
    estadoInspecciones: "enviada",
    tamañoBytes: buffer.length,
    sincronizacion: {
      actualizados: sincronizacion.actualizados.length,
      yaCumplidos: sincronizacion.yaCumplidos.length,
      erroresExcel: sincronizacion.erroresExcel.length,
    },
  };
}

module.exports = {
  generarExcelSeguimientoEpp,
  obtenerRutaExcelEpp,
  actualizarExcelSeguimientoEppEnOneDrive,
};
