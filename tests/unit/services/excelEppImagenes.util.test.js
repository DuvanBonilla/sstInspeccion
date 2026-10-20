const test = require("node:test");
const assert = require("node:assert/strict");
const AdmZip = require("adm-zip");
const ExcelJS = require("exceljs");

const {
  normalizarDibujoXml,
  normalizarDibujosXlsx,
} = require("../../../src/backend/shared/utils/imagenesExcel.util");

const {
  construirHojaInicioEpp,
} = require("../../../src/backend/modules/inspecciones-epp/excel/hojas/inicio.service");

const PNG_MINIMO = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

async function generarLibroConImagenes() {
  const workbook = new ExcelJS.Workbook();

  const hoja = workbook.addWorksheet("Hoja");

  const imagen = workbook.addImage({ buffer: PNG_MINIMO, extension: "png" });

  for (const columna of [1, 4, 8]) {
    hoja.addImage(imagen, {
      tl: { col: columna, row: 2 },
      ext: { width: 40, height: 40 },
      editAs: "oneCell",
    });
  }

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

test("ExcelJS repite el identificador de creación de las imágenes", async () => {
  const zip = new AdmZip(await generarLibroConImagenes());

  const identificadores = zip
    .readAsText("xl/drawings/drawing1.xml")
    .match(/creationId[^>]*id="(\{[^}]*\})"/g);

  assert.equal(identificadores.length, 3);
  assert.equal(new Set(identificadores).size, 1);
});

test("la normalización quita el identificador repetido y el atributo no válido", async () => {
  const zip = new AdmZip(normalizarDibujosXlsx(await generarLibroConImagenes()));

  const dibujo = zip.readAsText("xl/drawings/drawing1.xml");

  assert.doesNotMatch(dibujo, /creationId/);
  assert.doesNotMatch(dibujo, /editAs/);
  assert.equal((dibujo.match(/<xdr:pic>/g) || []).length, 3);
  assert.equal((dibujo.match(/<xdr:oneCellAnchor>/g) || []).length, 3);
});

test("la forma de cada imagen toma el tamaño del anclaje", () => {
  const dibujo = normalizarDibujoXml(
    '<xdr:oneCellAnchor editAs="oneCell"><xdr:from/><xdr:ext cx="381000" cy="381000"/>' +
      '<xdr:pic><xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></a:xfrm></xdr:spPr></xdr:pic>' +
      "</xdr:oneCellAnchor>",
  );

  assert.match(dibujo, /<a:ext cx="381000" cy="381000"\/><\/a:xfrm>/);
  assert.doesNotMatch(dibujo, /cx="0"/);
});

test("el libro se puede volver a leer y conserva sus imágenes", async () => {
  const leido = new ExcelJS.Workbook();

  await leido.xlsx.load(normalizarDibujosXlsx(await generarLibroConImagenes()));

  assert.equal(leido.getWorksheet("Hoja").getImages().length, 3);
});

test("un libro sin dibujos se devuelve sin cambios", async () => {
  const workbook = new ExcelJS.Workbook();

  workbook.addWorksheet("Hoja").getCell("A1").value = 1;

  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

  assert.equal(normalizarDibujosXlsx(buffer), buffer);
});

test("el tablero Inicio, una vez normalizado, tiene los nueve íconos con identificadores distintos", async () => {
  const workbook = new ExcelJS.Workbook();

  for (const nombre of ["01 - Inspecciones", "02 - Seguimiento EPP", "03 - Planes de Acción", "_RESUMEN", "General"]) {
    workbook.addWorksheet(nombre);
  }

  construirHojaInicioEpp(workbook, { inspecciones: [], planes: [] });

  const zip = new AdmZip(normalizarDibujosXlsx(Buffer.from(await workbook.xlsx.writeBuffer())));

  const dibujo = zip.readAsText("xl/drawings/drawing1.xml");

  const nombres = [...dibujo.matchAll(/<xdr:cNvPr id="(\d+)" name="([^"]*)"/g)].map((m) => m[1]);

  assert.equal(nombres.length, 9);
  assert.equal(new Set(nombres).size, 9);
  assert.doesNotMatch(dibujo, /creationId/);
});
