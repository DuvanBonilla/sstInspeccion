const { escaparXml } = require("../../../shared/utils/excelXml.util");

/**
 * Paleta, tipografías y dimensiones utilizadas en la presentación visual del
 * libro de seguimiento SST.
 *
 * Todos los colores se expresan en hexadecimal RGB sin el canal alfa.
 */

const COLORES = {
  verde: "1E9E57",
  verdeOscuro: "137A42",
  verdeSuave: "D9F2E3",
  crema: "FFF7DC",
  blanco: "FFFFFF",
  texto: "1F2937",
  textoSecundario: "6B7280",
  borde: "D5DBE1",
  gris: "9CA3AF",
  grisSuave: "EDEFF2",
  ambar: "F2C94C",
  ambarTexto: "9A6700",
  ambarSuave: "FFF0C2",
  rojo: "D64545",
  rojoTexto: "B42318",
  rojoSuave: "FAD4D4",
  verdeAgua: "2E9E5B",
  serieBueno: "1E9E57",
  serieRegular: "F2B33D",
  serieMalo: "E0533D",
  serieNoCumple: "8B1E1E",
};

const FUENTES = {
  principal: "Calibri",
  iconos: "Segoe UI Emoji",
};

const FORMATOS = {
  fecha: "dd/mm/yyyy",
  porcentaje: "0%",
  conformidad: '"Conformidad "0%',
};

/**
 * Colores de las pestañas según el rol de cada hoja.
 */

const COLORES_PESTANA = {
  inicio: COLORES.verde,
  general: COLORES.verdeOscuro,
  datos: COLORES.gris,
};

/**
 * Formato condicional aplicado a las calificaciones `B`, `R`, `M`, `NC` y
 * `NA` de las hojas de datos.
 */

const ESTILOS_CALIFICACION = [
  { valor: "B", fondo: COLORES.verdeSuave, texto: COLORES.verdeOscuro },
  { valor: "R", fondo: COLORES.ambarSuave, texto: COLORES.ambarTexto },
  { valor: "M", fondo: COLORES.rojoSuave, texto: COLORES.rojoTexto },
  { valor: "NC", fondo: COLORES.rojoSuave, texto: COLORES.rojoTexto },
  { valor: "NA", fondo: COLORES.grisSuave, texto: COLORES.textoSecundario },
];

/**
 * Formato condicional aplicado a los estados calculados en la hoja Inicio.
 */

const ESTILOS_ESTADO = [
  { valor: "Conforme", fondo: COLORES.verdeSuave, texto: COLORES.verdeOscuro },
  { valor: "Por vencer", fondo: COLORES.ambarSuave, texto: COLORES.ambarTexto },
  {
    valor: "Con observaciones",
    fondo: COLORES.ambarSuave,
    texto: COLORES.ambarTexto,
  },
  { valor: "Vencido", fondo: COLORES.rojoSuave, texto: COLORES.rojoTexto },
  { valor: "No conforme", fondo: COLORES.rojoSuave, texto: COLORES.rojoTexto },
  {
    valor: "Sin fecha",
    fondo: COLORES.grisSuave,
    texto: COLORES.textoSecundario,
  },
];



const RUTA_ESTILOS = "xl/styles.xml";

/**
 * Colecciones de `styles.xml` que administra el registro, con la expresión
 * que identifica cada uno de sus elementos hijos.
 */

const COLECCIONES = {
  numFmts: /<numFmt\b[^>]*\/>/g,
  fonts: /<font\b[^>]*\/>|<font\b[^>]*>[\s\S]*?<\/font>/g,
  fills: /<fill\b[^>]*\/>|<fill\b[^>]*>[\s\S]*?<\/fill>/g,
  borders: /<border\b[^>]*\/>|<border\b[^>]*>[\s\S]*?<\/border>/g,
  cellXfs: /<xf\b[^>]*\/>|<xf\b[^>]*>[\s\S]*?<\/xf>/g,
  dxfs: /<dxf\b[^>]*\/>|<dxf\b[^>]*>[\s\S]*?<\/dxf>/g,
};

function argb(color) {
  return `FF${String(color).replace(/^#/, "").toUpperCase()}`;
}

function construirFuenteXml({
  nombre = "Calibri",
  tamano = 11,
  negrita = false,
  color = null,
} = {}) {
  return (
    "<font>" +
    (negrita ? "<b/>" : "") +
    `<sz val="${tamano}"/>` +
    (color ? `<color rgb="${argb(color)}"/>` : '<color theme="1"/>') +
    `<name val="${escaparXml(nombre)}"/>` +
    '<family val="2"/>' +
    "</font>"
  );
}

function construirRellenoXml(color) {
  if (!color) {
    return '<fill><patternFill patternType="none"/></fill>';
  }

  return (
    "<fill>" +
    '<patternFill patternType="solid">' +
    `<fgColor rgb="${argb(color)}"/>` +
    '<bgColor indexed="64"/>' +
    "</patternFill>" +
    "</fill>"
  );
}

function construirLadoBordeXml(nombre, lado) {
  if (!lado) {
    return `<${nombre}/>`;
  }

  return (
    `<${nombre} style="${lado.estilo || "thin"}">` +
    `<color rgb="${argb(lado.color)}"/>` +
    `</${nombre}>`
  );
}

function construirBordeXml(borde = {}) {
  return (
    "<border>" +
    construirLadoBordeXml("left", borde.izquierdo) +
    construirLadoBordeXml("right", borde.derecho) +
    construirLadoBordeXml("top", borde.superior) +
    construirLadoBordeXml("bottom", borde.inferior) +
    "<diagonal/>" +
    "</border>"
  );
}

function construirDxfXml({ fondo, texto, negrita = true }) {
  return (
    "<dxf>" +
    "<font>" +
    (negrita ? "<b/>" : "") +
    `<color rgb="${argb(texto)}"/>` +
    "</font>" +
    "<fill>" +
    '<patternFill patternType="solid">' +
    `<fgColor rgb="${argb(fondo)}"/>` +
    `<bgColor rgb="${argb(fondo)}"/>` +
    "</patternFill>" +
    "</fill>" +
    "</dxf>"
  );
}

/**
 * Administra la incorporación de estilos al archivo `styles.xml` de un libro.
 *
 * Cada estilo se describe con un objeto declarativo (fuente, relleno, borde,
 * alineación y formato numérico). El registro reutiliza los elementos
 * idénticos ya existentes, de modo que aplicar la presentación varias veces
 * no hace crecer el archivo.
 */

class RegistroEstilos {
  /**
   * @param {AdmZip} zip Archivo Excel abierto como contenedor ZIP.
   */

  constructor(zip) {
    this.zip = zip;

    this.xml = zip.getEntry(RUTA_ESTILOS).getData().toString("utf8");

    if (!/<numFmts\b/.test(this.xml)) {
      this.xml = this.xml.replace(
        /(<styleSheet\b[^>]*>)/,
        '$1<numFmts count="0"></numFmts>',
      );
    }

    if (!/<dxfs\b[^>]*>[\s\S]*?<\/dxfs>/.test(this.xml)) {
      this.xml = this.xml
        .replace(/<dxfs\b[^>]*\/>/, "")
        .replace(/(<\/cellStyles>)/, '$1<dxfs count="0"></dxfs>');
    }

    this.elementos = {};

    for (const [coleccion, expresion] of Object.entries(COLECCIONES)) {
      const contenido = this.obtenerContenidoColeccion(coleccion);

      this.elementos[coleccion] = contenido.match(expresion) || [];
    }

    this.cacheXf = new Map();
  }

  obtenerContenidoColeccion(coleccion) {
    const expresion = new RegExp(
      `<${coleccion}\\b[^>]*>([\\s\\S]*?)<\\/${coleccion}>`,
    );

    return this.xml.match(expresion)?.[1] || "";
  }

  agregar(coleccion, elementoXml) {
    const lista = this.elementos[coleccion];

    const indice = lista.indexOf(elementoXml);

    if (indice !== -1) {
      return indice;
    }

    lista.push(elementoXml);

    return lista.length - 1;
  }

  /**
   * Obtiene el identificador de un formato numérico, registrándolo si no existe.
   *
   * @param {string|null} codigo Código del formato, por ejemplo `dd/mm/yyyy`.
   * @returns {number} Identificador `numFmtId`.
   */

  formatoNumerico(codigo) {
    if (!codigo || codigo === "General") {
      return 0;
    }

    const codigoXml = escaparXml(codigo);

    for (const elemento of this.elementos.numFmts) {
      if (elemento.includes(`formatCode="${codigoXml}"`)) {
        return Number(elemento.match(/numFmtId="(\d+)"/)[1]);
      }
    }

    const identificadores = this.elementos.numFmts.map((elemento) =>
      Number(elemento.match(/numFmtId="(\d+)"/)?.[1] || 0),
    );

    const nuevoId = Math.max(163, ...identificadores) + 1;

    this.elementos.numFmts.push(
      `<numFmt numFmtId="${nuevoId}" formatCode="${codigoXml}"/>`,
    );

    return nuevoId;
  }

  /**
   * Obtiene el índice `s` de un estilo de celda descrito declarativamente.
   *
   * @param {Object} estilo Descripción del estilo.
   * @param {Object} [estilo.fuente] Nombre, tamaño, negrita y color.
   * @param {string|null} [estilo.relleno] Color de fondo.
   * @param {Object} [estilo.borde] Lados izquierdo, derecho, superior e inferior.
   * @param {Object} [estilo.alineacion] Horizontal, vertical y ajuste de texto.
   * @param {string} [estilo.formato] Código de formato numérico.
   * @returns {number} Índice dentro de `cellXfs`.
   */

  celda(estilo = {}) {
    const clave = JSON.stringify(estilo);

    if (this.cacheXf.has(clave)) {
      return this.cacheXf.get(clave);
    }

    const fuenteId = this.agregar("fonts", construirFuenteXml(estilo.fuente));

    const rellenoId = this.agregar(
      "fills",
      construirRellenoXml(estilo.relleno),
    );

    const bordeId = this.agregar("borders", construirBordeXml(estilo.borde));

    const formatoId = this.formatoNumerico(estilo.formato);

    const alineacion = estilo.alineacion || {};

    const atributosAlineacion = [
      alineacion.horizontal ? `horizontal="${alineacion.horizontal}"` : "",
      alineacion.vertical ? `vertical="${alineacion.vertical}"` : "",
      alineacion.ajustar ? 'wrapText="1"' : "",
      alineacion.reducir ? 'shrinkToFit="1"' : "",
    ]
      .filter(Boolean)
      .join(" ");

    const xf =
      `<xf numFmtId="${formatoId}" fontId="${fuenteId}" fillId="${rellenoId}" ` +
      `borderId="${bordeId}" xfId="0" applyNumberFormat="1" applyFont="1" ` +
      'applyFill="1" applyBorder="1" applyAlignment="1">' +
      `<alignment ${atributosAlineacion}/>` +
      "</xf>";

    const indice = this.agregar("cellXfs", xf);

    this.cacheXf.set(clave, indice);

    return indice;
  }

  /**
   * Obtiene el índice de un formato diferencial utilizado por el formato
   * condicional.
   *
   * @param {Object} estilo Colores de fondo y texto.
   * @returns {number} Índice dentro de `dxfs`.
   */

  diferencial(estilo) {
    return this.agregar("dxfs", construirDxfXml(estilo));
  }

  /**
   * Escribe en el libro el `styles.xml` actualizado.
   *
   * @returns {void}
   */

  guardar() {
    let xml = this.xml;

    for (const coleccion of Object.keys(COLECCIONES)) {
      const lista = this.elementos[coleccion];

      xml = xml.replace(
        new RegExp(`<${coleccion}\\b[^>]*>[\\s\\S]*?<\\/${coleccion}>`),
        `<${coleccion} count="${lista.length}">${lista.join("")}</${coleccion}>`,
      );
    }

    this.zip.updateFile(RUTA_ESTILOS, Buffer.from(xml, "utf8"));
  }
}

module.exports = {
  COLORES,
  FUENTES,
  FORMATOS,
  COLORES_PESTANA,
  ESTILOS_CALIFICACION,
  ESTILOS_ESTADO,
  RegistroEstilos,
};
