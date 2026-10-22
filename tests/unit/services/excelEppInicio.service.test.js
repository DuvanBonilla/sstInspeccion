const test = require("node:test");
const assert = require("node:assert/strict");
const ExcelJS = require("exceljs");

const {
  construirHojaInicioEpp,
} = require("../../../src/backend/modules/inspecciones-epp/excel/hojas/inicio.service");

const {
  COLORES,
  FUENTES,
  aArgb,
} = require("../../../src/backend/shared/utils/paletaExcel.util");

const estilosSst = require("../../../src/backend/modules/inspecciones-sst/excel/seguimientoSstExcel.estilos");

const HOJAS = [
  "01 - Inspecciones",
  "02 - Seguimiento EPP",
  "03 - Planes de Acción",
  "_RESUMEN",
  "General",
];

function crearLibro(inspecciones, planes) {
  const workbook = new ExcelJS.Workbook();

  for (const nombre of HOJAS) {
    workbook.addWorksheet(nombre);
  }

  const hoja = construirHojaInicioEpp(workbook, { inspecciones, planes });

  return { workbook, hoja };
}

const inspecciones = [
  { sede_operacion: "Santa Marta" },
  { sede_operacion: "Urabá" },
  { sede_operacion: "Santa Marta" },
  { sede_operacion: "" },
];

const planes = [{}, {}, {}];

function formula(hoja, referencia) {
  return hoja.getCell(referencia).value.formula;
}

test("la paleta del tablero SST es la misma que usa el tablero EPP", () => {
  assert.equal(estilosSst.COLORES, COLORES);
  assert.equal(estilosSst.FUENTES, FUENTES);
  assert.equal(aArgb("1E9E57"), "FF1E9E57");
  assert.equal(aArgb(COLORES.verde), `FF${COLORES.verde}`);
});

test("Inicio es la primera pestaña y usa la cuadrícula del tablero SST", () => {
  const { workbook, hoja } = crearLibro(inspecciones, planes);

  assert.equal(workbook.worksheets[0].name, "Inicio");
  assert.equal(hoja.getColumn("A").width, 2);
  assert.equal(hoja.getColumn("B").width, 6.2);
  assert.equal(hoja.getColumn("Z").width, 6.2);
  assert.equal(hoja.getCell("B2").value, "TABLERO DE INSPECCIONES EPP");
  assert.equal(hoja.getCell("B2").fill.fgColor.argb, aArgb(COLORES.verde));
  assert.equal(hoja.properties.tabColor.argb, aArgb(COLORES.verde));
});

test("las cinco tarjetas ocupan cinco columnas cada una", () => {
  const { hoja } = crearLibro(inspecciones, planes);

  const etiquetas = ["C8", "H8", "M8", "R8", "W8"].map((celda) => hoja.getCell(celda).value);

  assert.deepEqual(etiquetas, [
    "INSPECCIONES",
    "TRABAJADORES EVALUADOS",
    "EPP EVALUADOS",
    "PLANES PENDIENTES",
    "CUMPLIMIENTO DE PLANES",
  ]);

  for (const rango of ["C8:F8", "H8:K8", "M8:P8", "R8:U8", "W8:Z8"]) {
    assert.ok(hoja.model.merges.includes(rango), `falta combinar ${rango}`);
  }
});

test("los íconos son imágenes a color ancladas a las tarjetas y a los bloques de estado", () => {
  const { workbook, hoja } = crearLibro(inspecciones, planes);

  const imagenes = hoja.getImages();

  // Cinco tarjetas y cuatro bloques de estado; cada archivo se guarda una vez.
  assert.equal(imagenes.length, 9);
  assert.equal(workbook.model.media.length, 6);

  for (const { type, range } of imagenes) {
    assert.equal(type, "image");
    assert.ok(range.tl.nativeCol >= 1 && range.tl.nativeCol <= 25);
  }

  // Las tarjetas llevan el ícono en su primera columna, fila 9.
  const columnasTarjetas = imagenes.slice(0, 5).map(({ range }) => range.tl.nativeCol);

  assert.deepEqual(columnasTarjetas, [1, 6, 11, 16, 21]);
  assert.ok(imagenes.slice(0, 5).every(({ range }) => range.tl.nativeRow === 8));

  // Los bloques de estado llevan el ícono en la columna central, fila 17.
  const columnasBloques = imagenes.slice(5).map(({ range }) => range.tl.nativeCol);

  assert.deepEqual(columnasBloques, [2, 5, 8, 11]);
  assert.ok(imagenes.slice(5).every(({ range }) => range.tl.nativeRow === 16));
});

test("las celdas de los íconos no llevan emojis ni glifos de texto", () => {
  const { hoja } = crearLibro(inspecciones, planes);

  for (const celda of ["B9", "G9", "L9", "Q9", "V9", "B17", "E17", "H17", "K17"]) {
    assert.equal(hoja.getCell(celda).value, null, celda);
  }
});

test("las fórmulas usan rangos del tamaño de los datos del libro", () => {
  const { hoja } = crearLibro(inspecciones, planes);

  assert.equal(formula(hoja, "C9"), "COUNTA(_RESUMEN!$A$2:$A$5)");
  assert.equal(formula(hoja, "H9"), "SUM(_RESUMEN!$G$2:$G$5)");
  assert.match(
    formula(hoja, "R9"),
    /COUNTA\('03 - Planes de Acción'!\$A\$2:\$A\$4\)-COUNTIF\('03 - Planes de Acción'!\$O\$2:\$O\$4,"CUMPLIDO"\)/,
  );
});

test("sin inspecciones ni planes los rangos siguen siendo válidos", () => {
  const { hoja } = crearLibro([], []);

  assert.equal(formula(hoja, "C9"), "COUNTA(_RESUMEN!$A$2:$A$2)");
  assert.match(formula(hoja, "R9"), /'03 - Planes de Acción'!\$A\$2:\$A\$2/);
});

test("las sedes se listan de más a menos inspecciones y sin vacías", () => {
  const { hoja } = crearLibro(inspecciones, planes);

  assert.equal(hoja.getCell("O17").value, "Santa Marta");
  assert.equal(hoja.getCell("O18").value, "Urabá");
  assert.equal(hoja.getCell("O19").value, null);
});

test("las columnas auxiliares ordenan planes e inspecciones y están ocultas", () => {
  const { hoja } = crearLibro(inspecciones, planes);

  for (const columna of ["AH", "AI", "AJ", "AK"]) {
    assert.equal(hoja.getColumn(columna).hidden, true, columna);
  }

  assert.match(
    formula(hoja, "AH2"),
    /^IF\(OR\('03 - Planes de Acción'!\$A2="",'03 - Planes de Acción'!\$O2="CUMPLIDO"\),"",/,
  );
  assert.equal(
    formula(hoja, "AK45"),
    "IFERROR(MOD(LARGE($AI$2:$AI$5,1),10000),0)",
  );
  assert.equal(
    formula(hoja, "AJ40"),
    "IFERROR(MOD(SMALL($AH$2:$AH$4,10),10000),0)",
  );
});

test("la hoja se escribe y se vuelve a leer sin errores", async () => {
  const { workbook } = crearLibro(inspecciones, planes);

  const buffer = await workbook.xlsx.writeBuffer();

  const leido = new ExcelJS.Workbook();

  await leido.xlsx.load(buffer);

  assert.equal(leido.worksheets[0].name, "Inicio");
  assert.equal(
    leido.getWorksheet("Inicio").getCell("B2").value,
    "TABLERO DE INSPECCIONES EPP",
  );
});
