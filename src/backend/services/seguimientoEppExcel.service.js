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

function obtenerRutaExcelEpp() {
  const ruta = String(process.env.ONEDRIVE_EPP_EXCEL_PATH || "").trim();

  if (!ruta) {
    throw new Error(
      "Falta configurar ONEDRIVE_EPP_EXCEL_PATH en el archivo .env",
    );
  }

  if (!ruta.toLowerCase().endsWith(".xlsx")) {
    throw new Error("ONEDRIVE_EPP_EXCEL_PATH debe terminar en .xlsx");
  }

  return ruta;
}

async function actualizarExcelSeguimientoEppEnOneDrive() {
  const rutaExcel = obtenerRutaExcelEpp();

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
  };
}

module.exports = {
  generarExcelSeguimientoEpp,
  obtenerRutaExcelEpp,
  actualizarExcelSeguimientoEppEnOneDrive,
};
