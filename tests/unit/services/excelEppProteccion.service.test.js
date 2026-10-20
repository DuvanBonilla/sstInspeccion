const test = require("node:test");
const assert = require("node:assert/strict");
const ExcelJS = require("exceljs");

const {
  HOJAS_PROTEGIDAS,
  protegerHojasEpp,
  protegerHojasEppSeguro,
} = require("../../../src/backend/modules/inspecciones-epp/excel/hojas/proteccion.service");

function crearLibro() {
  const workbook = new ExcelJS.Workbook();

  for (const nombre of HOJAS_PROTEGIDAS) {
    workbook.addWorksheet(nombre).getCell("A1").value = "dato";
  }

  workbook.getWorksheet("General").mergeCells("C10:F10");

  return workbook;
}

test("protege las hojas alimentadas por la base de datos, incluida la hoja 03", async () => {
  const workbook = crearLibro();

  const resultado = await protegerHojasEpp(workbook);

  assert.deepEqual(resultado, { hojas: HOJAS_PROTEGIDAS, conClave: false });

  for (const nombre of HOJAS_PROTEGIDAS) {
    assert.equal(workbook.getWorksheet(nombre).sheetProtection.sheet, true, nombre);
  }

  assert.ok(HOJAS_PROTEGIDAS.includes("03 - Planes de Acción"));
});

test("en la hoja 03 solo quedan libres el responsable y la fecha de cierre", async () => {
  const workbook = crearLibro();

  await protegerHojasEpp(workbook);

  const planes = workbook.getWorksheet("03 - Planes de Acción");

  // R = Responsable del Cierre, S = Fecha de Cierre: todas las filas con formato.
  for (const celda of ["R2", "S2", "R3", "S250", "R500", "S500"]) {
    assert.equal(planes.getCell(celda).protection.locked, false, celda);
  }

  // El resto de las columnas, el encabezado y las filas posteriores quedan bloqueados.
  for (const celda of ["A2", "P2", "Q2", "P500", "R1", "S1", "R501"]) {
    assert.notEqual(planes.getCell(celda).protection?.locked, false, celda);
  }
});

test("solo permite filtrar y seleccionar celdas; columnas y filas quedan bloqueadas", async () => {
  const workbook = crearLibro();

  await protegerHojasEpp(workbook);

  const proteccion = workbook.getWorksheet("Inicio").sheetProtection;

  assert.equal(proteccion.autoFilter, true);
  assert.equal(proteccion.selectLockedCells, true);

  // Los íconos del tablero no se pueden mover ni borrar.
  assert.equal(proteccion.objects, false);
  assert.equal(proteccion.scenarios, false);

  for (const accion of [
    "formatColumns",
    "formatRows",
    "insertColumns",
    "insertRows",
    "deleteColumns",
    "deleteRows",
    "formatCells",
  ]) {
    assert.equal(proteccion[accion], undefined, accion);
  }
});

test("en General solo queda libre la celda donde se escribe el ID a buscar", async () => {
  const workbook = crearLibro();

  await protegerHojasEpp(workbook);

  const general = workbook.getWorksheet("General");

  for (const celda of ["C10", "D10", "F10"]) {
    assert.equal(general.getCell(celda).protection.locked, false, celda);
  }

  assert.notEqual(general.getCell("A1").protection?.locked, false);
  assert.notEqual(general.getCell("G10").protection?.locked, false);
});

test("con contraseña guarda su hash y no la clave", async () => {
  const workbook = crearLibro();

  const resultado = await protegerHojasEpp(workbook, { clave: "Clave-EPP_2026" });

  const proteccion = workbook.getWorksheet("Inicio").sheetProtection;

  assert.equal(resultado.conClave, true);
  assert.equal(proteccion.algorithmName, "SHA-512");
  assert.match(proteccion.hashValue, /^[A-Za-z0-9+/=]{88}$/);
  assert.equal(proteccion.spinCount, 100000);
  assert.doesNotMatch(JSON.stringify(proteccion), /Clave-EPP_2026/);
});

test("la protección queda escrita en el archivo", async () => {
  const workbook = crearLibro();

  await protegerHojasEpp(workbook);

  const leido = new ExcelJS.Workbook();

  await leido.xlsx.load(await workbook.xlsx.writeBuffer());

  assert.equal(leido.getWorksheet("Inicio").sheetProtection.sheet, true);
  assert.equal(leido.getWorksheet("General").getCell("C10").protection.locked, false);
  assert.equal(leido.getWorksheet("03 - Planes de Acción").sheetProtection.sheet, true);
  assert.equal(leido.getWorksheet("03 - Planes de Acción").getCell("S2").protection.locked, false);
});

test("una hoja ausente se omite", async () => {
  const workbook = new ExcelJS.Workbook();

  workbook.addWorksheet("General");

  const resultado = await protegerHojasEpp(workbook);

  assert.deepEqual(resultado.hojas, ["General"]);
});

test("toma la contraseña de EXCEL_EPP_CLAVE_PROTECCION", async () => {
  const anterior = process.env.EXCEL_EPP_CLAVE_PROTECCION;

  process.env.EXCEL_EPP_CLAVE_PROTECCION = "otra-clave";

  try {
    const resultado = await protegerHojasEppSeguro(crearLibro());

    assert.equal(resultado.aplicada, true);
    assert.equal(resultado.conClave, true);
  } finally {
    if (anterior === undefined) delete process.env.EXCEL_EPP_CLAVE_PROTECCION;
    else process.env.EXCEL_EPP_CLAVE_PROTECCION = anterior;
  }
});

test("si la protección falla informa el motivo y no interrumpe el libro", async () => {
  const errores = [];

  const original = console.error;

  console.error = (...argumentos) => errores.push(argumentos);

  try {
    const resultado = await protegerHojasEppSeguro({
      getWorksheet() {
        throw new Error("fallo simulado");
      },
    });

    assert.deepEqual(resultado, { aplicada: false, error: "fallo simulado" });
    assert.equal(errores.length, 1);
  } finally {
    console.error = original;
  }
});
