const ExcelJS = require("exceljs");

const { descargarArchivoOneDrive } = require("./graph.service");

const { obtenerRutaExcelEpp } = require("./seguimientoEppExcel/ruta.service");

const {
  cerrarPlanesAccionDesdeExcel,
} = require("../models/seguimientoEppExcel.model");

const NOMBRE_HOJA_PLANES = "03 - Planes de Acción";

function normalizarTextoExcel(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

function obtenerValorCelda(celda) {
  const valor = celda?.value;

  if (valor == null) {
    return "";
  }

  if (typeof valor !== "object") {
    return valor;
  }

  if (Array.isArray(valor.richText)) {
    return valor.richText.map((fragmento) => fragmento.text || "").join("");
  }

  if (Object.hasOwn(valor, "result")) {
    return valor.result ?? "";
  }

  if (Object.hasOwn(valor, "text")) {
    return valor.text ?? "";
  }

  return "";
}

function obtenerColumnasPorEncabezado(hoja) {
  const encabezados = new Map();
  const filaEncabezados = hoja.getRow(1);

  filaEncabezados.eachCell(
    {
      includeEmpty: false,
    },
    (celda, numeroColumna) => {
      const nombre = normalizarTextoExcel(obtenerValorCelda(celda));

      if (nombre) {
        encabezados.set(nombre, numeroColumna);
      }
    },
  );

  return encabezados;
}

function exigirColumna(encabezados, nombre) {
  const numeroColumna = encabezados.get(normalizarTextoExcel(nombre));

  if (!numeroColumna) {
    throw new Error(
      `El Excel EPP no contiene la columna obligatoria "${nombre}"`,
    );
  }

  return numeroColumna;
}

/**
 * Lee y valida los cierres registrados en el Excel de seguimiento EPP.
 *
 * Descarga el archivo desde OneDrive, abre la hoja `03 - Planes de Acción` e
 * identifica las filas marcadas como cumplidas. Para cada cierre valida el
 * identificador del plan, el responsable y la ausencia de identificadores
 * repetidos.
 *
 * Esta función solamente interpreta el Excel y construye la lista de cierres;
 * no actualiza la base de datos.
 *
 * @async
 * @param {Object} [opciones={}] Configuración de la lectura.
 * @param {boolean} [opciones.permitirArchivoInexistente=false] Permite devolver
 * un resultado vacío cuando el archivo no está disponible.
 * @returns {Promise<Object>} Ruta del archivo, cantidad de filas revisadas,
 * cierres válidos encontrados y errores de validación.
 * @throws {Error} Si no se puede descargar el archivo, falta la hoja requerida
 * o no existen las columnas obligatorias.
 */

async function leerCierresDesdeExcelEpp({
  permitirArchivoInexistente = false,
} = {}) {
  const rutaExcel = obtenerRutaExcelEpp();

  const buffer = await descargarArchivoOneDrive(rutaExcel);

  if (!buffer) {
    if (permitirArchivoInexistente) {
      return {
        rutaExcel,
        filasRevisadas: 0,
        cierres: [],
        errores: [],
      };
    }

    throw new Error(`No se pudo descargar el Excel EPP desde ${rutaExcel}`);
  }

  const workbook = new ExcelJS.Workbook();

  await workbook.xlsx.load(buffer);

  const hoja = workbook.getWorksheet(NOMBRE_HOJA_PLANES);

  if (!hoja) {
    throw new Error(
      `No existe la hoja "${NOMBRE_HOJA_PLANES}" en el Excel EPP`,
    );
  }

  const encabezados = obtenerColumnasPorEncabezado(hoja);

  const columnaInspeccion = exigirColumna(encabezados, "Código Inspección");

  const columnaEstado = exigirColumna(encabezados, "Cumplido");

  const columnaIdPlan = exigirColumna(encabezados, "ID Plan");

  const columnaResponsable = exigirColumna(
    encabezados,
    "Responsable del Cierre",
  );

  const cierres = [];
  const errores = [];
  const idsProcesados = new Set();

  for (let numeroFila = 2; numeroFila <= hoja.rowCount; numeroFila += 1) {
    const fila = hoja.getRow(numeroFila);

    const estado = normalizarTextoExcel(
      obtenerValorCelda(fila.getCell(columnaEstado)),
    );

    if (!estado.includes("CUMPLIDO")) {
      continue;
    }

    const detalleEppId = String(
      obtenerValorCelda(fila.getCell(columnaIdPlan)) || "",
    ).trim();

    const responsableCierre = String(
      obtenerValorCelda(fila.getCell(columnaResponsable)) || "",
    ).trim();

    const inspeccionId = String(
      obtenerValorCelda(fila.getCell(columnaInspeccion)) || "",
    ).trim();

    if (!/^\d+$/.test(detalleEppId)) {
      errores.push({
        fila: numeroFila,
        inspeccionId,
        mensaje: "La fila no contiene un ID Plan válido.",
      });

      continue;
    }

    if (!responsableCierre) {
      errores.push({
        fila: numeroFila,
        inspeccionId,
        detalleEppId,
        mensaje: "Debe escribir el responsable del cierre.",
      });

      continue;
    }

    if (idsProcesados.has(detalleEppId)) {
      errores.push({
        fila: numeroFila,
        inspeccionId,
        detalleEppId,
        mensaje: "El ID Plan está repetido en el Excel.",
      });

      continue;
    }

    idsProcesados.add(detalleEppId);

    cierres.push({
      detalleEppId,
      responsableCierre,
      inspeccionId,
      filaExcel: numeroFila,
    });
  }

  return {
    rutaExcel,
    filasRevisadas: Math.max(hoja.rowCount - 1, 0),
    cierres,
    errores,
  };
}

/**
 * Sincroniza con la base de datos los cierres registrados en el Excel EPP.
 *
 * Lee los planes marcados como cumplidos y delega su cierre en el modelo de
 * seguimiento. Puede detener completamente el proceso cuando se encuentran
 * filas inválidas o continuar sincronizando únicamente los cierres válidos.
 *
 * @async
 * @param {Object} [opciones={}] Configuración de la sincronización.
 * @param {boolean} [opciones.detenerSiHayErrores=false] Impide actualizar la
 * base de datos cuando el Excel contiene errores.
 * @param {boolean} [opciones.permitirArchivoInexistente=false] Permite continuar
 * con un resultado vacío cuando el archivo todavía no existe.
 * @returns {Promise<Object>} Resumen con las filas revisadas, cierres detectados,
 * errores del Excel, registros actualizados, planes ya cumplidos y planes no
 * encontrados.
 * @throws {Error} Si falla la lectura, se solicita detener ante errores o no
 * se pueden actualizar los planes de acción.
 */

async function sincronizarCierresDesdeExcelEpp({
  detenerSiHayErrores = false,
  permitirArchivoInexistente = false,
} = {}) {
  const lectura = await leerCierresDesdeExcelEpp({
    permitirArchivoInexistente,
  });

  if (detenerSiHayErrores && lectura.errores.length > 0) {
    const error = new Error(
      `El Excel EPP contiene ${lectura.errores.length} fila(s) inválida(s). No se reemplazó el archivo.`,
    );

    error.erroresExcel = lectura.errores;

    throw error;
  }

  const resultado = await cerrarPlanesAccionDesdeExcel(lectura.cierres);

  return {
    rutaExcel: lectura.rutaExcel,
    filasRevisadas: lectura.filasRevisadas,
    cierresDetectados: lectura.cierres.length,
    erroresExcel: lectura.errores,
    solicitados: resultado.solicitados,
    actualizados: resultado.actualizados,
    yaCumplidos: resultado.yaCumplidos,
    noEncontrados: resultado.noEncontrados,
  };
}

module.exports = {
  leerCierresDesdeExcelEpp,
  sincronizarCierresDesdeExcelEpp,
};
