const test = require("node:test");
const assert = require("node:assert/strict");
const AdmZip = require("adm-zip");

const {
  calcularHashClave,
  construirElementoProteccion,
  insertarProteccionXml,
  protegerHojas,
} = require("../../../src/backend/modules/inspecciones-sst/excel/hojas/proteccion.service");

function leer(zip, ruta) {
  return zip.getEntry(ruta).getData().toString("utf8");
}

function crearLibro() {
  const zip = new AdmZip();

  zip.addFile(
    "xl/workbook.xml",
    Buffer.from(
      '<workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' +
        '<sheet name="General" sheetId="1" r:id="rId1"/>' +
        '<sheet name="Extintores" sheetId="2" r:id="rId2"/></sheets></workbook>',
    ),
  );

  zip.addFile(
    "xl/_rels/workbook.xml.rels",
    Buffer.from(
      '<Relationships>' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
        '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/></Relationships>',
    ),
  );

  zip.addFile(
    "xl/worksheets/sheet1.xml",
    Buffer.from(
      '<worksheet><sheetData>' +
        '<row r="11"><c r="B11" s="1" t="inlineStr"><is><t>ID a buscar:</t></is></c><c r="C11" s="2"/></row>' +
        "</sheetData><mergeCells count=\"1\"><mergeCell ref=\"B2:C2\"/></mergeCells></worksheet>",
    ),
  );

  zip.addFile(
    "xl/worksheets/sheet2.xml",
    Buffer.from(
      '<worksheet><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>Id</t></is></c></row></sheetData>' +
        '<sheetProtection sheet="1"/><autoFilter ref="A1:A2"/></worksheet>',
    ),
  );

  zip.addFile(
    "xl/styles.xml",
    Buffer.from(
      '<styleSheet><fonts count="1"><font><sz val="11"/></font></fonts>' +
        '<fills count="1"><fill><patternFill patternType="none"/></fill></fills>' +
        '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
        '<cellXfs count="3">' +
        '<xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>' +
        '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" applyFont="1"/>' +
        '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" applyAlignment="1"><alignment horizontal="left"/></xf>' +
        "</cellXfs>" +
        '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
        "</styleSheet>",
    ),
  );

  return zip;
}

test("el hash de la contraseña coincide con el que genera Excel", () => {
  // Valores tomados de un libro cuya hoja protegió Excel con la contraseña "password".
  const sal = Buffer.from("2UJ0h0DedLhesOCVbUlEQA==", "base64");

  assert.equal(
    calcularHashClave("password", sal),
    "45K7LjWAZwmf08tRb6DH6rgExqHW1pppcfsDb0iu7egRsSMh85nGG58sIsv18Fzftq1qhJAwHBWVSUr5spYsjA==",
  );
});

test("sin contraseña protege la hoja, permite filtrar y bloquea columnas y filas", () => {
  const elemento = construirElementoProteccion();

  assert.match(elemento, /sheet="1" objects="1" scenarios="1"/);
  assert.match(elemento, /autoFilter="0"/);
  // Sin formatColumns, formatRows, insert* ni delete*: Excel los bloquea por defecto.
  assert.doesNotMatch(elemento, /format(Columns|Rows)|insert|delete/);
  assert.doesNotMatch(elemento, /hashValue/);
});

test("con contraseña incluye el hash, la sal y las iteraciones", () => {
  const elemento = construirElementoProteccion("Clave-SST_2026", Buffer.alloc(16, 7));

  assert.match(elemento, /algorithmName="SHA-512"/);
  assert.match(elemento, /hashValue="[A-Za-z0-9+/=]{88}"/);
  assert.match(elemento, /saltValue="[A-Za-z0-9+/=]{24}"/);
  assert.match(elemento, /spinCount="100000"/);
});

test("inserta la protección después de los datos y antes de los filtros", () => {
  const xml = insertarProteccionXml(
    '<worksheet><sheetData/><sheetProtection sheet="1"/><autoFilter ref="A1:B2"/></worksheet>',
    '<sheetProtection sheet="1" objects="1"/>',
  );

  assert.equal(
    xml,
    '<worksheet><sheetData/><sheetProtection sheet="1" objects="1"/><autoFilter ref="A1:B2"/></worksheet>',
  );

  assert.throws(() => insertarProteccionXml("<worksheet/>", "<sheetProtection/>"), /sheetData/);
});

test("protege las hojas y deja libre solo la celda del identificador en General", () => {
  const zip = crearLibro();

  const resultado = protegerHojas(zip, { incluirInicio: false });

  const general = leer(zip, "xl/worksheets/sheet1.xml");

  const extintores = leer(zip, "xl/worksheets/sheet2.xml");

  const estilos = leer(zip, "xl/styles.xml");

  assert.deepEqual(resultado, { hojas: ["Extintores", "General"], conClave: false });

  // La protección queda tras los datos y antes de las celdas combinadas.
  assert.match(general, /<\/sheetData><sheetProtection [^>]*\/><mergeCells/);
  assert.equal((extintores.match(/<sheetProtection/g) || []).length, 1);
  assert.match(extintores, /<sheetProtection [^>]*objects="1"[^>]*\/><autoFilter/);

  // C11 usa un formato nuevo con la celda desbloqueada; B11 conserva el suyo.
  const estiloC11 = Number(general.match(/<c r="C11" s="(\d+)"/)[1]);

  const formatos = estilos.match(/<xf\b[^>]*?(?:\/>|>[\s\S]*?<\/xf>)/g);

  assert.ok(estiloC11 >= 3);
  assert.match(formatos[estiloC11], /applyProtection="1"/);
  assert.match(formatos[estiloC11], /<alignment horizontal="left"\/><protection locked="0"\/>/);
  assert.match(general, /<c r="B11" s="1"/);
  assert.match(estilos, /<cellXfs count="4">/);
});

test("proteger dos veces no duplica la protección ni los estilos", () => {
  const zip = crearLibro();

  protegerHojas(zip, { incluirInicio: false });

  const estilos = leer(zip, "xl/styles.xml").match(/<cellXfs count="(\d+)"/)[1];

  protegerHojas(zip, { clave: "abc", incluirInicio: false });

  assert.equal((leer(zip, "xl/worksheets/sheet1.xml").match(/<sheetProtection/g) || []).length, 1);
  assert.equal((leer(zip, "xl/worksheets/sheet2.xml").match(/<sheetProtection/g) || []).length, 1);
  assert.match(leer(zip, "xl/worksheets/sheet2.xml"), /hashValue=/);
  assert.equal(leer(zip, "xl/styles.xml").match(/<cellXfs count="(\d+)"/)[1], estilos);
});
