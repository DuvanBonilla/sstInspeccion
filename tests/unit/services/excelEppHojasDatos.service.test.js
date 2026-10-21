const test = require("node:test");
const assert = require("node:assert/strict");
const ExcelJS = require("exceljs");

const {
  construirHojaInspecciones,
} = require("../../../src/backend/modules/inspecciones-epp/excel/hojas/inspecciones.service");

const {
  construirHojaSeguimientoEpp,
} = require("../../../src/backend/modules/inspecciones-epp/excel/hojas/trabajadores.service");

const {
  construirHojaPlanesAccion,
} = require("../../../src/backend/modules/inspecciones-epp/excel/hojas/planesAccion.service");

const {
  COLORES,
  aArgb,
} = require("../../../src/backend/shared/utils/paletaExcel.util");

const inspecciones = [
  {
    inspeccion_id: "INSP-1",
    fecha: "2026-10-01",
    sede_operacion: "Santa Marta",
    area_trabajo: "SST",
    estado: "enviada",
    total_trabajadores: 2,
  },
];

function crearHojas() {
  const workbook = new ExcelJS.Workbook();

  return [
    construirHojaInspecciones(workbook, inspecciones),
    construirHojaSeguimientoEpp(workbook, []),
    construirHojaPlanesAccion(workbook, []),
  ];
}

test("las hojas de datos tienen la pestaña gris y la cuadrícula oculta", () => {
  for (const hoja of crearHojas()) {
    assert.equal(hoja.properties.tabColor.argb, aArgb(COLORES.gris), hoja.name);
    assert.equal(hoja.views[0].showGridLines, false, hoja.name);
    assert.equal(hoja.views[0].xSplit, 1, hoja.name);
    assert.equal(hoja.views[0].ySplit, 1, hoja.name);
  }
});

test("el encabezado es verde con letra blanca, como en las hojas de datos del SST", () => {
  for (const hoja of crearHojas()) {
    const celda = hoja.getCell("A1");

    assert.equal(celda.fill.fgColor.argb, aArgb(COLORES.verde), hoja.name);
    assert.equal(celda.font.color.argb, aArgb(COLORES.blanco), hoja.name);
    assert.equal(celda.font.bold, true, hoja.name);
    assert.equal(hoja.getRow(1).height, 42, hoja.name);
  }
});

test("las filas de datos son crema con bordes finos y alto de 20 puntos", () => {
  const [hoja] = crearHojas();

  const celda = hoja.getCell("A2");

  assert.equal(celda.fill.fgColor.argb, aArgb(COLORES.crema));
  assert.equal(celda.font.color.argb, aArgb(COLORES.texto));
  assert.equal(celda.border.bottom.style, "thin");
  assert.equal(hoja.getRow(2).height, 20);
});

test("el formato crema llega hasta la fila 500 aunque no haya registros", () => {
  for (const hoja of crearHojas()) {
    const ultimaColumna = hoja.getRow(1).cellCount;

    for (const referencia of [`A500`, `${String.fromCharCode(64 + Math.min(ultimaColumna, 26))}500`]) {
      assert.equal(
        hoja.getCell(referencia).fill.fgColor.argb,
        aArgb(COLORES.crema),
        `${hoja.name} ${referencia}`,
      );
    }

    assert.equal(hoja.getRow(501).hasValues, false, hoja.name);
    assert.equal(hoja.getCell("A501").fill?.fgColor?.argb, undefined, hoja.name);
  }
});

test("las hojas se escriben y se vuelven a leer sin perder el formato", async () => {
  const workbook = new ExcelJS.Workbook();

  construirHojaInspecciones(workbook, inspecciones);

  const leido = new ExcelJS.Workbook();

  await leido.xlsx.load(await workbook.xlsx.writeBuffer());

  const hoja = leido.getWorksheet("01 - Inspecciones");

  assert.equal(hoja.getCell("A1").fill.fgColor.argb, aArgb(COLORES.verde));
  assert.equal(hoja.getCell("A300").fill.fgColor.argb, aArgb(COLORES.crema));
});

test("sin planes, la fila vacía de la tabla de la hoja 03 también lleva el formato crema", () => {
  const workbook = new ExcelJS.Workbook();

  const hoja = construirHojaPlanesAccion(workbook, []);

  for (const referencia of ["A2", "J2", "S2"]) {
    assert.equal(hoja.getCell(referencia).fill.fgColor.argb, aArgb(COLORES.crema), referencia);
    assert.equal(hoja.getCell(referencia).border.bottom.style, "thin", referencia);
  }
});

test("la pestaña General es verde, como la de Inicio", () => {
  const {
    construirHojaGeneralEpp,
  } = require("../../../src/backend/modules/inspecciones-epp/excel/hojas/general.service");

  const workbook = new ExcelJS.Workbook();

  construirHojaGeneralEpp(workbook, [], [], []);

  assert.equal(workbook.getWorksheet("General").properties.tabColor.argb, aArgb(COLORES.verde));
});
