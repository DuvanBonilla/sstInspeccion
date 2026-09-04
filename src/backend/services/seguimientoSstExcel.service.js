const AdmZip = require("adm-zip");

const {
  descargarArchivoOneDrive,
  subirArchivoOneDrive,
} = require("./graph.service");

const { generarBufferExcel } = require("../utils/excelXml.util");

const {
  actualizarExtintores,

  diagnosticarTablaExtintores: diagnosticarTablaExtintoresModulo,
} = require("./seguimientoSstExcel/extintores.service");

const {
  actualizarCamillas,
} = require("./seguimientoSstExcel/camillas.service");

const {
  actualizarSenalizaciones,
} = require("./seguimientoSstExcel/senalizaciones.service");

const {
  actualizarEquiposTecnologicos,
} = require("./seguimientoSstExcel/equiposTecnologicos.service");

const {
  actualizarBotiquines,
} = require("./seguimientoSstExcel/botiquines.service");

const { actualizarResumen } = require("./seguimientoSstExcel/resumen.service");

const { actualizarGeneral } = require("./seguimientoSstExcel/general.service");

const CONTENT_TYPE_XLSM = "application/vnd.ms-excel.sheet.macroEnabled.12";

/**
 * Obtiene la ruta del archivo de seguimiento SST en OneDrive.
 *
 * @returns {string} Ruta configurada en `ONEDRIVE_EXCEL_PATH`.
 * @throws {Error} Si la variable de entorno no está configurada.
 */

function obtenerRutaExcelSst() {
  const ruta = process.env.ONEDRIVE_EXCEL_PATH;

  if (!ruta) {
    throw new Error("La variable ONEDRIVE_EXCEL_PATH no está configurada");
  }

  return ruta;
}

/**
 * Descarga y carga en memoria el archivo de seguimiento SST.
 *
 * Obtiene el archivo XLSM desde OneDrive y lo representa como un contenedor ZIP
 * para permitir la modificación directa de sus archivos XML internos.
 *
 * @async
 * @returns {Promise<AdmZip>} Archivo XLSM cargado en memoria.
 * @throws {Error} Si no existe la ruta configurada o no se puede descargar.
 */

async function cargarExcelSst() {
  const rutaExcel = obtenerRutaExcelSst();

  const buffer = await descargarArchivoOneDrive(rutaExcel);

  if (!buffer) {
    throw new Error(
      `No fue posible descargar el Excel SST desde OneDrive: ${rutaExcel}`,
    );
  }

  return new AdmZip(buffer);
}

function validarMacrosExcel(zip) {
  const macrosConservadas = Boolean(zip.getEntry("xl/vbaProject.bin"));

  if (!macrosConservadas) {
    throw new Error("El archivo XLSM perdió su proyecto de macros VBA");
  }

  return macrosConservadas;
}

/**
 * Verifica que el archivo XLSM conserve su proyecto de macros VBA.
 *
 * Comprueba la existencia de `xl/vbaProject.bin` antes de generar o publicar
 * la nueva versión del archivo.
 *
 * @param {AdmZip} zip - Archivo XLSM cargado como contenedor ZIP.
 * @returns {boolean} `true` cuando el proyecto de macros está presente.
 * @throws {Error} Si el archivo no contiene el proyecto VBA.
 */

async function diagnosticarTablaExtintores() {
  const zip = await cargarExcelSst();

  return diagnosticarTablaExtintoresModulo(zip);
}

async function actualizarExtintoresEnMemoria() {
  const zip = await cargarExcelSst();

  const resultadoExtintores = await actualizarExtintores(zip);

  const macrosConservadas = validarMacrosExcel(zip);

  return {
    buffer: generarBufferExcel(zip),

    totalExtintores: resultadoExtintores.totalExtintores,

    rango: resultadoExtintores.rango,

    macrosConservadas,

    inspecciones: resultadoExtintores.inspecciones,
  };
}

async function actualizarExtintoresEnOneDrive() {
  const rutaExcel = obtenerRutaExcelSst();

  const resultado = await actualizarExtintoresEnMemoria();

  await subirArchivoOneDrive({
    ruta: rutaExcel,

    buffer: resultado.buffer,

    contentType: CONTENT_TYPE_XLSM,
  });

  return {
    rutaExcel,

    totalExtintores: resultado.totalExtintores,

    rango: resultado.rango,

    macrosConservadas: resultado.macrosConservadas,

    inspecciones: resultado.inspecciones,
  };
}

/**
 * Actualiza en memoria todas las secciones del seguimiento SST.
 *
 * Descarga el archivo XLSM y actualiza los módulos de extintores, camillas,
 * señalizaciones, equipos tecnológicos, botiquines, resumen y hoja general.
 * Antes de devolver el resultado, verifica que las macros permanezcan intactas.
 *
 * Esta función no reemplaza el archivo almacenado en OneDrive.
 *
 * @async
 * @returns {Promise<Object>} Buffer actualizado, estado de conservación de
 * macros y resultados individuales de cada módulo.
 * @throws {Error} Si falla la descarga, alguna actualización o la validación
 * de las macros.
 */

async function actualizarExcelSeguimientoSstEnMemoria() {
  const zip = await cargarExcelSst();

  const extintores = await actualizarExtintores(zip);

  const camillas = await actualizarCamillas(zip);

  const senalizaciones = await actualizarSenalizaciones(zip);

  const equiposTecnologicos = await actualizarEquiposTecnologicos(zip);

  const botiquines = await actualizarBotiquines(zip);

  const resumen = await actualizarResumen(zip);

  const general = await actualizarGeneral(zip);

  const macrosConservadas = validarMacrosExcel(zip);

  return {
    buffer: generarBufferExcel(zip),

    macrosConservadas,

    extintores,

    camillas,

    senalizaciones,

    equiposTecnologicos,

    botiquines,

    resumen,

    general,
  };
}

/**
 * Actualiza y reemplaza el archivo de seguimiento SST en OneDrive.
 *
 * Ejecuta la actualización completa del archivo XLSM en memoria y posteriormente
 * carga el resultado en la misma ruta configurada, conservando su formato
 * habilitado para macros.
 *
 * @async
 * @returns {Promise<Object>} Ruta del archivo, estado de las macros y resultados
 * de actualización de cada módulo SST.
 * @throws {Error} Si falla la generación o la carga del archivo en OneDrive.
 */

async function actualizarExcelSeguimientoSstEnOneDrive() {
  const rutaExcel = obtenerRutaExcelSst();

  const resultado = await actualizarExcelSeguimientoSstEnMemoria();

  await subirArchivoOneDrive({
    ruta: rutaExcel,

    buffer: resultado.buffer,

    contentType: CONTENT_TYPE_XLSM,
  });

  return {
    rutaExcel,

    macrosConservadas: resultado.macrosConservadas,

    extintores: resultado.extintores,

    camillas: resultado.camillas,

    senalizaciones: resultado.senalizaciones,

    equiposTecnologicos: resultado.equiposTecnologicos,

    botiquines: resultado.botiquines,

    resumen: resultado.resumen,

    general: resultado.general,
  };
}

module.exports = {
  obtenerRutaExcelSst,

  cargarExcelSst,

  validarMacrosExcel,

  diagnosticarTablaExtintores,

  actualizarExtintoresEnMemoria,

  actualizarExtintoresEnOneDrive,

  actualizarExcelSeguimientoSstEnMemoria,

  actualizarExcelSeguimientoSstEnOneDrive,
};
