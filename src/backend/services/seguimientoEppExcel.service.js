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

const { subirArchivoOneDrive } = require("./graph.service");

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

/* =========================================================
   04 - PLANES DE ACCIÓN
========================================================= */

/* =========================================================
   GENERADOR
========================================================= */
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

async function actualizarExcelSeguimientoEppEnOneDrive() {
  const rutaExcel = obtenerRutaExcelEpp();

  // Antes de regenerar el archivo, guardar en la BD
  // los cierres realizados manualmente desde Excel.
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
