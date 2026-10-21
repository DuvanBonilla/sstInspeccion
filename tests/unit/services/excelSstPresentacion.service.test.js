const test = require("node:test");
const assert = require("node:assert/strict");
const AdmZip = require("adm-zip");

const {
  corregirEncabezado,
  corregirEncabezados,
} = require("../../../src/backend/modules/inspecciones-sst/excel/hojas/encabezados.service");

const {
  actualizarInicio,
} = require("../../../src/backend/modules/inspecciones-sst/excel/hojas/inicio.service");

const {
  calcularAnchoEncabezado,
  aplicarFormatoHojaDatos,
} = require("../../../src/backend/modules/inspecciones-sst/excel/hojas/formatoHojas.service");

const {
  buscarRutaHoja,
  obtenerRutaHoja,
  obtenerRutaTabla,
} = require("../../../src/backend/modules/inspecciones-sst/excel/rutasLibroExcel");

function leer(zip, ruta) {
  return zip.getEntry(ruta).getData().toString("utf8");
}

function crearLibroConEncabezados() {
  const zip = new AdmZip();

  zip.addFile(
    "xl/workbook.xml",
    Buffer.from(
      '<workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' +
        '<sheet name="Extintores" sheetId="2" r:id="rId2"/></sheets></workbook>',
    ),
  );

  zip.addFile(
    "xl/_rels/workbook.xml.rels",
    Buffer.from(
      '<Relationships><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/></Relationships>',
    ),
  );

  zip.addFile(
    "xl/sharedStrings.xml",
    Buffer.from(
      '<sst count="4" uniqueCount="3">' +
        "<si><t>Area Trabajo</t></si>" +
        '<si><t xml:space="preserve"> ROTULO</t></si>' +
        "<si><t>Observaciones</t></si>" +
        "</sst>",
    ),
  );

  zip.addFile(
    "xl/worksheets/sheet2.xml",
    Buffer.from(
      "<worksheet><sheetData>" +
        '<row r="1"><c r="A1" s="5" t="s"><v>0</v></c><c r="B1" s="5" t="s"><v>1</v></c><c r="C1" s="5" t="s"><v>2</v></c></row>' +
        '<row r="2"><c r="A2" t="s"><v>0</v></c><c r="B2"><v>7</v></c></row>' +
        "</sheetData></worksheet>",
    ),
  );

  zip.addFile(
    "xl/worksheets/_rels/sheet2.xml.rels",
    Buffer.from(
      '<Relationships><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/table" Target="../tables/table1.xml"/></Relationships>',
    ),
  );

  zip.addFile(
    "xl/tables/table1.xml",
    Buffer.from(
      '<table name="TablaExtintores" ref="A1:C2"><tableColumns count="3">' +
        '<tableColumn id="1" name="Area Trabajo"/>' +
        '<tableColumn id="2" name=" ROTULO"/>' +
        '<tableColumn id="3" name="Observaciones"/>' +
        "</tableColumns></table>",
    ),
  );

  return zip;
}

test("corrige tildes conservando los espacios del encabezado", () => {
  assert.equal(corregirEncabezado(" ROTULO"), " RÓTULO");
  assert.equal(corregirEncabezado("Area Trabajo"), "Área Trabajo");
  assert.equal(corregirEncabezado("SEÑALIZACIÓN _CAMILLA"), "SEÑALIZACIÓN_CAMILLA");
  assert.equal(corregirEncabezado("Observaciones"), null);
});

test("corrige el encabezado y la columna de la tabla sin tocar los datos", () => {
  const zip = crearLibroConEncabezados();

  const resultado = corregirEncabezados(zip);

  const hoja = leer(zip, "xl/worksheets/sheet2.xml");

  const tabla = leer(zip, "xl/tables/table1.xml");

  assert.equal(resultado.total, 2);
  assert.match(hoja, /<c r="A1" s="5" t="inlineStr"><is><t xml:space="preserve">Área Trabajo<\/t><\/is><\/c>/);
  assert.match(hoja, /<c r="B1" s="5" t="inlineStr"><is><t xml:space="preserve"> RÓTULO<\/t><\/is><\/c>/);
  assert.match(hoja, /<c r="C1" s="5" t="s"><v>2<\/v><\/c>/);
  assert.match(hoja, /<row r="2"><c r="A2" t="s"><v>0<\/v><\/c><c r="B2"><v>7<\/v><\/c><\/row>/);
  assert.match(tabla, /name="Área Trabajo"/);
  assert.match(tabla, /name=" RÓTULO"/);
  assert.match(tabla, /name="Observaciones"/);
  assert.match(tabla, /ref="A1:C2"/);
});

test("corregir los encabezados dos veces no cambia el resultado", () => {
  const zip = crearLibroConEncabezados();

  corregirEncabezados(zip);

  const primeraHoja = leer(zip, "xl/worksheets/sheet2.xml");

  const primeraTabla = leer(zip, "xl/tables/table1.xml");

  const segundo = corregirEncabezados(zip);

  assert.equal(segundo.total, 0);
  assert.equal(leer(zip, "xl/worksheets/sheet2.xml"), primeraHoja);
  assert.equal(leer(zip, "xl/tables/table1.xml"), primeraTabla);
});

function crearLibroMinimo(hojaInicioAjena = false) {
  const zip = new AdmZip();

  zip.addFile(
    "xl/workbook.xml",
    Buffer.from(
      '<workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
        '<bookViews><workbookView xWindow="0"/></bookViews><sheets>' +
        (hojaInicioAjena
          ? '<sheet name="Inicio" sheetId="9" r:id="rId9"/>'
          : "") +
        '<sheet name="General" sheetId="1" r:id="rId1"/></sheets>' +
        '<definedNames><definedName name="_xlnm.Print_Titles" localSheetId="0">General!$1:$1</definedName></definedNames>' +
        "</workbook>",
    ),
  );

  zip.addFile(
    "xl/_rels/workbook.xml.rels",
    Buffer.from(
      '<Relationships><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
    ),
  );

  zip.addFile("[Content_Types].xml", Buffer.from("<Types></Types>"));

  zip.addFile(
    "xl/worksheets/sheet1.xml",
    Buffer.from(
      '<worksheet><sheetViews><sheetView tabSelected="1" workbookViewId="0"/></sheetViews><sheetData/></worksheet>',
    ),
  );

  zip.addFile(
    "xl/styles.xml",
    Buffer.from(
      '<styleSheet><fonts count="1"><font><sz val="11"/></font></fonts>' +
        '<fills count="1"><fill><patternFill patternType="none"/></fill></fills>' +
        '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
        '<cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellXfs>' +
        '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
        "</styleSheet>",
    ),
  );

  return zip;
}

test("crea la hoja Inicio como primera pestaña con su gráfico", () => {
  const zip = crearLibroMinimo();

  const resultado = actualizarInicio(zip);

  const libro = leer(zip, "xl/workbook.xml");

  assert.deepEqual(resultado, { creada: true, omitida: false });
  assert.ok(libro.indexOf('name="Inicio"') < libro.indexOf('name="General"'));
  assert.match(libro, /localSheetId="1">General!/);
  assert.ok(zip.getEntry("xl/worksheets/sheetInicio.xml"));
  assert.ok(zip.getEntry("xl/charts/chartInicio.xml"));
  assert.doesNotMatch(leer(zip, "xl/worksheets/sheet1.xml"), /tabSelected/);
});

test("ejecutar Inicio dos veces no duplica la hoja ni crece los estilos", () => {
  const zip = crearLibroMinimo();

  actualizarInicio(zip);

  const hojas = (leer(zip, "xl/workbook.xml").match(/<sheet /g) || []).length;

  const estilos = leer(zip, "xl/styles.xml").match(/<cellXfs count="(\d+)"/)[1];

  const segunda = actualizarInicio(zip);

  assert.deepEqual(segunda, { creada: false, omitida: false });
  assert.equal((leer(zip, "xl/workbook.xml").match(/<sheet /g) || []).length, hojas);
  assert.equal(leer(zip, "xl/styles.xml").match(/<cellXfs count="(\d+)"/)[1], estilos);
  assert.equal((leer(zip, "[Content_Types].xml").match(/sheetInicio/g) || []).length, 1);
});

test("conserva una hoja Inicio existente sin lanzar error", () => {
  const zip = crearLibroMinimo(true);

  const libroAntes = leer(zip, "xl/workbook.xml");

  const resultado = actualizarInicio(zip);

  assert.equal(resultado.creada, false);
  assert.equal(resultado.omitida, true);
  assert.equal(leer(zip, "xl/workbook.xml"), libroAntes);
  assert.equal(zip.getEntry("xl/worksheets/sheetInicio.xml"), null);
});

test("encuentra hojas y tablas por nombre aunque Excel renumere los archivos", () => {
  const zip = new AdmZip();

  zip.addFile(
    "xl/workbook.xml",
    Buffer.from(
      '<workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' +
        '<sheet name="Inicio" sheetId="8" r:id="rId1"/>' +
        '<sheet name="General" sheetId="1" r:id="rId2"/>' +
        '<sheet name="Extintores" sheetId="2" r:id="rId3"/></sheets></workbook>',
    ),
  );

  zip.addFile(
    "xl/_rels/workbook.xml.rels",
    Buffer.from(
      '<Relationships>' +
        '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet3.xml"/>' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="/xl/worksheets/sheet1.xml"/>' +
        '<Relationship Id="rId2" Target="worksheets/sheet2.xml" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet"/></Relationships>',
    ),
  );

  for (const ruta of ["sheet1", "sheet2", "sheet3"]) {
    zip.addFile(`xl/worksheets/${ruta}.xml`, Buffer.from("<worksheet/>"));
  }

  zip.addFile(
    "xl/worksheets/_rels/sheet3.xml.rels",
    Buffer.from(
      '<Relationships><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/table" Target="../tables/table7.xml"/></Relationships>',
    ),
  );

  zip.addFile("xl/tables/table7.xml", Buffer.from("<table/>"));

  assert.equal(obtenerRutaHoja(zip, "Inicio"), "xl/worksheets/sheet1.xml");
  assert.equal(obtenerRutaHoja(zip, "General"), "xl/worksheets/sheet2.xml");
  assert.equal(obtenerRutaHoja(zip, "Extintores"), "xl/worksheets/sheet3.xml");
  assert.equal(obtenerRutaTabla(zip, "xl/worksheets/sheet3.xml"), "xl/tables/table7.xml");
  assert.equal(buscarRutaHoja(zip, "Camillas"), null);
  assert.throws(() => obtenerRutaHoja(zip, "Camillas"), /No se encontró la hoja "Camillas"/);
  assert.throws(() => obtenerRutaTabla(zip, "xl/worksheets/sheet2.xml"), /No se encontró la tabla/);
});

test("el ancho de columna deja caber el título completo y el botón de filtro", () => {
  // Las palabras con guion bajo no se parten: deben caber enteras.
  assert.ok(calcularAnchoEncabezado("INTEGRIDAD_EMPAQUE") >= 27);
  assert.ok(calcularAnchoEncabezado("FECHA_VENCIMIENTO") >= 25);
  assert.ok(calcularAnchoEncabezado("NumInspeccion") >= 20);
  // Los títulos con espacios pueden ocupar dos líneas.
  assert.ok(calcularAnchoEncabezado(" Responsable Inspección ") >= 18);
  assert.ok(calcularAnchoEncabezado(" Responsable Inspección ") < 24);
  // Límites.
  assert.equal(calcularAnchoEncabezado("ASEO"), 12);
  assert.equal(calcularAnchoEncabezado(""), 12);
  assert.equal(calcularAnchoEncabezado("X".repeat(80)), 45);
});

test("extiende el estilo de las celdas de datos hasta la fila final", () => {
  const zip = crearLibroMinimo();

  zip.updateFile(
    "xl/worksheets/sheet1.xml",
    Buffer.from(
      '<worksheet><dimension ref="A1:C3"/><sheetFormatPr defaultRowHeight="15"/><sheetData>' +
        '<row r="1" ht="15" customHeight="1"><c r="A1" t="inlineStr"><is><t>Id</t></is></c><c r="B1" t="inlineStr"><is><t>Fecha</t></is></c><c r="C1" t="inlineStr"><is><t>Estado</t></is></c></row>' +
        '<row r="2" ht="31" customHeight="1"><c r="A2" t="inlineStr"><is><t>INSP-1</t></is></c><c r="C2" t="inlineStr"><is><t>B</t></is></c></row>' +
        '<row r="3"><c r="A3"/></row>' +
        "</sheetData></worksheet>",
    ),
  );

  aplicarFormatoHojaDatos(zip, {
    ruta: "xl/worksheets/sheet1.xml",
    ultimaColumna: "C",
    columnasFecha: ["B"],
    calificaciones: { desde: "C", hasta: "C" },
    filaFinal: 6,
  });

  const hoja = leer(zip, "xl/worksheets/sheet1.xml");

  const filas = hoja.match(/<row r="\d+"[^>]*>/g);

  assert.equal(filas.length, 6);
  assert.match(hoja, /<dimension ref="A1:C6"\/>/);
  assert.match(hoja, /<sheetFormatPr defaultRowHeight="20" customHeight="1"\/>/);

  // Cada fila de datos tiene sus tres celdas con estilo, y el alto es uniforme.
  for (let fila = 2; fila <= 6; fila += 1) {
    const xml = hoja.match(new RegExp(`<row r="${fila}"[^>]*>[\\s\\S]*?</row>`))[0];

    assert.equal((xml.match(/<c r="[A-C]\d+"[^>]*\bs="\d+"/g) || []).length, 3, `fila ${fila}`);
    assert.match(xml.match(/<row[^>]*>/)[0], /ht="20" customHeight="1"/);
  }

  assert.match(hoja, /<c r="A2"[^>]*\bs="\d+"[^>]*><is><t>INSP-1<\/t><\/is><\/c>/);
  assert.match(hoja, /<row r="1" ht="42" customHeight="1">/);
});

test("la hoja Inicio dibuja imágenes de extintores, botiquín y camilla en lugar de emojis", () => {
  const zip = crearLibroMinimo();

  actualizarInicio(zip);

  const hoja = leer(zip, "xl/worksheets/sheetInicio.xml");

  const dibujo = leer(zip, "xl/drawings/drawingInicio.xml");

  const relaciones = leer(zip, "xl/drawings/_rels/drawingInicio.xml.rels");

  const tipos = leer(zip, "[Content_Types].xml");

  assert.doesNotMatch(hoja, /🩹|🚑|🧯/);
  assert.equal((dibujo.match(/<xdr:pic>/g) || []).length, 7);
  assert.match(dibujo, /<xdr:col>6<\/xdr:col>/);
  assert.match(dibujo, /<xdr:col>11<\/xdr:col>/);

  // Un extintor en la tarjeta y uno del color de cada tipo de agente.
  assert.match(dibujo, /<xdr:col>1<\/xdr:col>[^]*?<xdr:row>8<\/xdr:row>/);

  for (const [columna, icono] of [[14, "Solkaflam"], [17, "Co2"], [20, "Multiproposito"], [23, "Agua"]]) {
    assert.match(dibujo, new RegExp(`<xdr:col>${columna}</xdr:col>[^]*?<xdr:row>16</xdr:row>`));
    assert.match(relaciones, new RegExp(`Target="\\.\\./media/iconoExtintor${icono}\\.png"`));
    assert.equal(zip.getEntry(`xl/media/iconoExtintor${icono}.png`).getData().subarray(1, 4).toString(), "PNG");
  }

  assert.match(dibujo, /xmlns:r="http:\/\/schemas\.openxmlformats\.org\/officeDocument\/2006\/relationships"/);
  assert.match(relaciones, /Id="rId2"[^>]*Target="\.\.\/media\/iconoBotiquin\.png"/);
  assert.match(relaciones, /Id="rId3"[^>]*Target="\.\.\/media\/iconoCamilla\.png"/);
  assert.equal(zip.getEntry("xl/media/iconoBotiquin.png").getData().subarray(1, 4).toString(), "PNG");
  assert.equal(zip.getEntry("xl/media/iconoCamilla.png").getData().subarray(1, 4).toString(), "PNG");
  assert.equal((tipos.match(/Extension="png"/g) || []).length, 1);

  // Repetir no duplica la extensión ni las imágenes.
  actualizarInicio(zip);

  assert.equal((leer(zip, "[Content_Types].xml").match(/Extension="png"/g) || []).length, 1);
});

test("la hoja Inicio incluye el crédito de los íconos de Flaticon", () => {
  const zip = crearLibroMinimo();

  actualizarInicio(zip);

  assert.match(leer(zip, "xl/worksheets/sheetInicio.xml"), /apien \(botiquín\) y pongsakornRed \(camilla\) - Flaticon \(www\.flaticon\.es\)/);
  assert.match(leer(zip, "xl/workbook.xml"), /\$A\$1:\$AA\$58/);
});

// Reproduce lo que hace Excel al guardar: renombra los archivos internos de la
// hoja, el dibujo, el gráfico y las imágenes, cambia el identificador de la
// hoja y convierte las cadenas en línea en cadenas compartidas.
function simularGuardadoExcel(zip) {
  const nombres = [
    ["sheetInicio.xml", "sheet1.xml"],
    ["drawingInicio.xml", "drawing1.xml"],
    ["chartInicio.xml", "chart1.xml"],
    ["iconoBotiquin.png", "image1.png"],
    ["iconoCamilla.png", "image2.png"],
    ["rIdInicioSst", "rId1"],
  ];

  const guardado = new AdmZip();

  for (const entrada of zip.getEntries()) {
    let nombre = entrada.entryName;

    let datos = entrada.getData();

    for (const [antes, despues] of nombres) {
      nombre = nombre.split(antes).join(despues);
    }

    if (/\.(xml|rels)$/.test(nombre)) {
      let texto = datos.toString("utf8");

      for (const [antes, despues] of nombres) {
        texto = texto.split(antes).join(despues);
      }

      texto = texto.replace(
        /<c r="AD1"([^>]*) t="inlineStr"><is><t[^>]*>Ext\. clave alerta<\/t><\/is><\/c>/,
        '<c r="AD1"$1 t="s"><v>0</v></c>',
      );

      datos = Buffer.from(texto, "utf8");
    }

    guardado.addFile(nombre, datos);
  }

  guardado.addFile(
    "xl/sharedStrings.xml",
    Buffer.from('<sst count="1" uniqueCount="1"><si><t>Ext. clave alerta</t></si></sst>'),
  );

  return guardado;
}

test("regenera la hoja Inicio en su lugar aunque Excel haya renombrado sus archivos", () => {
  const original = crearLibroMinimo();

  actualizarInicio(original);

  const zip = simularGuardadoExcel(original);

  assert.ok(zip.getEntry("xl/worksheets/sheet1.xml"));
  assert.equal(zip.getEntry("xl/worksheets/sheetInicio.xml"), null);

  const resultado = actualizarInicio(zip);

  const libro = leer(zip, "xl/workbook.xml");

  const tipos = leer(zip, "[Content_Types].xml");

  assert.deepEqual(resultado, { creada: false, omitida: false });
  assert.equal((libro.match(/name="Inicio"/g) || []).length, 1);
  assert.match(leer(zip, "xl/worksheets/sheet1.xml"), /TABLERO DE ELEMENTOS DE EMERGENCIA/);
  assert.match(
    leer(zip, "xl/worksheets/_rels/sheet1.xml.rels"),
    /Target="\.\.\/drawings\/drawingInicio\.xml"/,
  );

  // Se retiran las partes que dejó Excel y se escriben las propias.
  for (const parte of [
    "xl/drawings/drawing1.xml",
    "xl/charts/chart1.xml",
    "xl/media/image1.png",
    "xl/media/image2.png",
  ]) {
    assert.equal(zip.getEntry(parte), null, parte);
  }

  for (const parte of [
    "xl/drawings/drawingInicio.xml",
    "xl/charts/chartInicio.xml",
    "xl/media/iconoBotiquin.png",
    "xl/media/iconoCamilla.png",
  ]) {
    assert.ok(zip.getEntry(parte), parte);
  }

  assert.doesNotMatch(tipos, /drawing1\.xml|chart1\.xml/);
  assert.equal((tipos.match(/drawingInicio\.xml/g) || []).length, 1);
  assert.equal((tipos.match(/Extension="png"/g) || []).length, 1);
});

test("las cinco tarjetas de indicadores tienen el mismo ancho y simetría", () => {
  const zip = crearLibroMinimo();

  actualizarInicio(zip);

  const hoja = leer(zip, "xl/worksheets/sheetInicio.xml");

  // Cada tarjeta ocupa 5 columnas: la etiqueta se combina desde la segunda
  // hasta la última columna de la tarjeta.
  for (const rango of ["C8:F8", "H8:K8", "M8:P8", "R8:U8", "W8:Z8"]) {
    assert.match(hoja, new RegExp(`<mergeCell ref="${rango}"/>`), rango);
  }

  // Todas las columnas de la cuadrícula miden lo mismo.
  assert.match(hoja, /<col min="2" max="26" width="6.2" customWidth="1"\/>/);
  assert.match(hoja, /<hyperlink ref="B6"/);
  assert.match(hoja, /<hyperlink ref="U6"/);
});

test("reconoce y regenera una hoja Inicio con el diseño anterior", () => {
  const zip = crearLibroMinimo(true);

  zip.updateFile(
    "xl/_rels/workbook.xml.rels",
    Buffer.from(
      '<Relationships><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
        '<Relationship Id="rId9" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet9.xml"/></Relationships>',
    ),
  );

  zip.addFile(
    "xl/worksheets/sheet9.xml",
    Buffer.from(
      '<worksheet><sheetData><row r="1"><c r="AD1" t="inlineStr"><is><t>Ext. clave alerta</t></is></c></row></sheetData></worksheet>',
    ),
  );

  const resultado = actualizarInicio(zip);

  assert.deepEqual(resultado, { creada: false, omitida: false });
  assert.match(leer(zip, "xl/worksheets/sheet9.xml"), /<c r="AK1"[^>]*t="inlineStr"><is><t[^>]*>Ext\. clave alerta<\/t>/);
  assert.doesNotMatch(leer(zip, "xl/worksheets/sheet9.xml"), /<c r="AD1"[^>]*>\s*<is><t[^>]*>Ext\. clave alerta/);
});

test("la tabla de datos del gráfico de Inicio tiene formato de tabla y las cantidades centradas", () => {
  const zip = crearLibroMinimo();

  actualizarInicio(zip);

  const hoja = leer(zip, "xl/worksheets/sheetInicio.xml");

  const estilo = (referencia) => {
    const celda = hoja.match(new RegExp(`<c r="${referencia}"[^>]*>`));

    assert.ok(celda, `falta la celda ${referencia}`);

    return celda[0].match(/ s="(\d+)"/)[1];
  };

  // Encabezado: el mismo estilo (verde, centrado) en las cinco columnas.
  for (const columna of ["AC", "AD", "AE", "AF"]) {
    assert.equal(estilo(`${columna}14`), estilo("AB14"), columna);
  }

  // Cantidades: mismo estilo en todas las filas y columnas, distinto del de la
  // sección, que va a la izquierda.
  for (const columna of ["AC", "AD", "AE", "AF"]) {
    for (const fila of [15, 17, 19]) {
      assert.equal(estilo(`${columna}${fila}`), estilo("AC15"), `${columna}${fila}`);
    }
  }

  assert.notEqual(estilo("AC15"), estilo("AB15"));
  assert.equal(estilo("AB15"), estilo("AB19"));
  assert.match(hoja, /<col min="28" max="28" width="18"/);
});
