const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const ExcelJS = require("exceljs");

const raiz = path.resolve(__dirname, "../../../src/backend");

// El servicio descarga el archivo de OneDrive y escribe en la base de datos;
// ambos se reemplazan para probar solo la lectura del Excel.
let archivoDescargado = null;

function reemplazarModulo(ruta, exportaciones) {
  const resuelta = require.resolve(path.join(raiz, ruta));

  require.cache[resuelta] = {
    id: resuelta,
    filename: resuelta,
    loaded: true,
    exports: exportaciones,
  };
}

reemplazarModulo("shared/services/graph.service.js", {
  descargarArchivoOneDrive: async () => archivoDescargado,
});

reemplazarModulo("modules/inspecciones-epp/excel/seguimientoEppExcel.model.js", {
  cerrarPlanesAccionDesdeExcel: async () => ({}),
});

process.env.ONEDRIVE_EPP_EXCEL_PATH = "/Seguimiento.xlsx";

const {
  leerCierresDesdeExcelEpp,
} = require("../../../src/backend/modules/inspecciones-epp/excel/sincronizacionEppExcel.service");

async function crearArchivo(configurar) {
  const workbook = new ExcelJS.Workbook();

  configurar(workbook);

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

function crearHojaPlanes(workbook) {
  const hoja = workbook.addWorksheet("03 - Planes de Acción");

  hoja.addRow(["Código Inspección", "Cumplido", "ID Plan", "Responsable del Cierre"]);
  hoja.addRow(["INSP-1", "☑ CUMPLIDO", "36", "Jonathan Cuello"]);
  hoja.addRow(["INSP-1", "☐ PENDIENTE", "37", ""]);
}

test("un libro en blanco se trata como primera generación al actualizar", async () => {
  archivoDescargado = await crearArchivo((workbook) => workbook.addWorksheet("Hoja1"));

  const lectura = await leerCierresDesdeExcelEpp({ permitirArchivoInexistente: true });

  assert.deepEqual(lectura, {
    rutaExcel: "/Seguimiento.xlsx",
    filasRevisadas: 0,
    cierres: [],
    errores: [],
  });
});

test("fuera de la actualización un libro en blanco sigue siendo un error", async () => {
  archivoDescargado = await crearArchivo((workbook) => workbook.addWorksheet("Hoja1"));

  await assert.rejects(
    leerCierresDesdeExcelEpp(),
    /No existe la hoja "03 - Planes de Acción"/,
  );
});

test("un seguimiento EPP sin la hoja de planes sigue siendo un error", async () => {
  archivoDescargado = await crearArchivo((workbook) => {
    workbook.addWorksheet("01 - Inspecciones");
    workbook.addWorksheet("General");
  });

  await assert.rejects(
    leerCierresDesdeExcelEpp({ permitirArchivoInexistente: true }),
    /No existe la hoja "03 - Planes de Acción"/,
  );
});

test("lee los cierres de un seguimiento EPP", async () => {
  archivoDescargado = await crearArchivo((workbook) => {
    workbook.addWorksheet("Inicio");
    crearHojaPlanes(workbook);
  });

  const lectura = await leerCierresDesdeExcelEpp({ permitirArchivoInexistente: true });

  assert.equal(lectura.filasRevisadas, 2);
  assert.equal(lectura.cierres.length, 1);
  assert.equal(lectura.errores.length, 0);
});

test("sin archivo en OneDrive devuelve una lectura vacía al actualizar", async () => {
  archivoDescargado = null;

  const lectura = await leerCierresDesdeExcelEpp({ permitirArchivoInexistente: true });

  assert.equal(lectura.cierres.length, 0);
});
