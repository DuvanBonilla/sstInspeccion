const AdmZip = require("adm-zip");

const {
  descargarArchivoOneDrive,
  subirArchivoOneDrive,
} = require("./graph.service");

const {
  generarBufferExcel,
} = require("../utils/excelXml.util");

const {
  actualizarExtintores,

  diagnosticarTablaExtintores:
    diagnosticarTablaExtintoresModulo,
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

const {
  actualizarResumen,
} = require("./seguimientoSstExcel/resumen.service");

const {
  actualizarGeneral,
} = require("./seguimientoSstExcel/general.service");

const CONTENT_TYPE_XLSM =
  "application/vnd.ms-excel.sheet.macroEnabled.12";

function obtenerRutaExcelSst() {
  const ruta = process.env.ONEDRIVE_EXCEL_PATH;

  if (!ruta) {
    throw new Error(
      "La variable ONEDRIVE_EXCEL_PATH no está configurada",
    );
  }

  return ruta;
}

async function cargarExcelSst() {
  const rutaExcel = obtenerRutaExcelSst();

  const buffer = await descargarArchivoOneDrive(
    rutaExcel,
  );

  if (!buffer) {
    throw new Error(
      `No fue posible descargar el Excel SST desde OneDrive: ${rutaExcel}`,
    );
  }

  return new AdmZip(buffer);
}

function validarMacrosExcel(zip) {
  const macrosConservadas = Boolean(
    zip.getEntry("xl/vbaProject.bin"),
  );

  if (!macrosConservadas) {
    throw new Error(
      "El archivo XLSM perdió su proyecto de macros VBA",
    );
  }

  return macrosConservadas;
}

async function diagnosticarTablaExtintores() {
  const zip = await cargarExcelSst();

  return diagnosticarTablaExtintoresModulo(zip);
}

async function actualizarExtintoresEnMemoria() {
  const zip = await cargarExcelSst();

  const resultadoExtintores =
    await actualizarExtintores(zip);

  const macrosConservadas =
    validarMacrosExcel(zip);

  return {
    buffer: generarBufferExcel(zip),

    totalExtintores:
      resultadoExtintores.totalExtintores,

    rango: resultadoExtintores.rango,

    macrosConservadas,

    inspecciones:
      resultadoExtintores.inspecciones,
  };
}

async function actualizarExtintoresEnOneDrive() {
  const rutaExcel = obtenerRutaExcelSst();

  const resultado =
    await actualizarExtintoresEnMemoria();

  await subirArchivoOneDrive({
    ruta: rutaExcel,

    buffer: resultado.buffer,

    contentType: CONTENT_TYPE_XLSM,
  });

  return {
    rutaExcel,

    totalExtintores:
      resultado.totalExtintores,

    rango: resultado.rango,

    macrosConservadas:
      resultado.macrosConservadas,

    inspecciones:
      resultado.inspecciones,
  };
}

async function actualizarExcelSeguimientoSstEnMemoria() {
  const zip = await cargarExcelSst();

  const extintores =
    await actualizarExtintores(zip);

  const camillas =
    await actualizarCamillas(zip);

  const senalizaciones =
    await actualizarSenalizaciones(zip);

  const equiposTecnologicos =
    await actualizarEquiposTecnologicos(zip);

  const botiquines =
    await actualizarBotiquines(zip);

  const resumen =
    await actualizarResumen(zip);

  const general =
    await actualizarGeneral(zip);  

  const macrosConservadas =
    validarMacrosExcel(zip);
  
  return {
    buffer:
      generarBufferExcel(zip),

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

async function actualizarExcelSeguimientoSstEnOneDrive() {
  const rutaExcel =
    obtenerRutaExcelSst();

  const resultado =
    await actualizarExcelSeguimientoSstEnMemoria();

  await subirArchivoOneDrive({
    ruta:
      rutaExcel,

    buffer:
      resultado.buffer,

    contentType:
      CONTENT_TYPE_XLSM,
  });

  return {
    rutaExcel,

    macrosConservadas:
      resultado.macrosConservadas,

    extintores:
      resultado.extintores,

    camillas:
      resultado.camillas,

    senalizaciones:
      resultado.senalizaciones, 
    
    equiposTecnologicos:
      resultado.equiposTecnologicos,

    botiquines:
      resultado.botiquines,

    resumen:
      resultado.resumen,

    general:
      resultado.general,
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