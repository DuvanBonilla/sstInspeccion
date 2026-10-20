const { COLORES } = require("../seguimientoSstExcel.estilos");

/**
 * Columnas de la tabla de datos del gráfico: sección, bueno, regular, malo y
 * no cumple. Están a la derecha de la cuadrícula del tablero.
 */

const COLUMNAS_DATOS_GRAFICO = ["AB", "AC", "AD", "AE", "AF"];

const SERIES = [
  { titulo: "AC14", valores: "AC", color: COLORES.serieBueno },
  { titulo: "AD14", valores: "AD", color: COLORES.serieRegular },
  { titulo: "AE14", valores: "AE", color: COLORES.serieMalo },
  { titulo: "AF14", valores: "AF", color: COLORES.serieNoCumple },
];

const PROPIEDADES_TEXTO =
  "<c:txPr><a:bodyPr/><a:lstStyle/><a:p><a:pPr>" +
  `<a:defRPr sz="900"><a:solidFill><a:srgbClr val="${COLORES.texto}"/></a:solidFill>` +
  '<a:latin typeface="Calibri"/></a:defRPr>' +
  '</a:pPr><a:endParaRPr lang="es-CO"/></a:p></c:txPr>';

/**
 * Construye el gráfico de barras 100 % apiladas con el estado general por
 * sección, alimentado por la tabla `U14:Y19` de la hoja Inicio.
 *
 * @param {string} nombreHoja Nombre de la hoja que contiene los datos.
 * @returns {string} Contenido XML del gráfico.
 */

function construirGraficoXml(nombreHoja) {
  const hoja = `'${nombreHoja}'`;

  const seriesXml = SERIES.map(
    ({ titulo, valores, color }, indice) =>
      "<c:ser>" +
      `<c:idx val="${indice}"/><c:order val="${indice}"/>` +
      `<c:tx><c:strRef><c:f>${hoja}!$${titulo.replace(/(\d+)/, "$$$1")}</c:f></c:strRef></c:tx>` +
      `<c:spPr><a:solidFill><a:srgbClr val="${color}"/></a:solidFill><a:ln><a:noFill/></a:ln></c:spPr>` +
      '<c:invertIfNegative val="0"/>' +
      `<c:cat><c:strRef><c:f>${hoja}!$AB$15:$AB$19</c:f></c:strRef></c:cat>` +
      `<c:val><c:numRef><c:f>${hoja}!$${valores}$15:$${valores}$19</c:f></c:numRef></c:val>` +
      "</c:ser>",
  ).join("");

  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" ' +
    'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    '<c:roundedCorners val="0"/>' +
    "<c:chart>" +
    '<c:autoTitleDeleted val="1"/>' +
    "<c:plotArea><c:layout/>" +
    "<c:barChart>" +
    '<c:barDir val="bar"/><c:grouping val="percentStacked"/><c:varyColors val="0"/>' +
    seriesXml +
    '<c:gapWidth val="60"/><c:overlap val="100"/>' +
    '<c:axId val="10"/><c:axId val="100"/>' +
    "</c:barChart>" +
    "<c:catAx>" +
    '<c:axId val="10"/><c:scaling><c:orientation val="maxMin"/></c:scaling>' +
    '<c:delete val="0"/><c:axPos val="l"/>' +
    '<c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/>' +
    '<c:spPr><a:ln><a:noFill/></a:ln></c:spPr>' +
    PROPIEDADES_TEXTO +
    '<c:crossAx val="100"/><c:crosses val="autoZero"/><c:auto val="1"/>' +
    '<c:lblAlgn val="ctr"/><c:lblOffset val="100"/><c:noMultiLvlLbl val="0"/>' +
    "</c:catAx>" +
    "<c:valAx>" +
    '<c:axId val="100"/><c:scaling><c:orientation val="minMax"/></c:scaling>' +
    '<c:delete val="0"/><c:axPos val="t"/>' +
    `<c:majorGridlines><c:spPr><a:ln w="6350"><a:solidFill><a:srgbClr val="${COLORES.borde}"/></a:solidFill></a:ln></c:spPr></c:majorGridlines>` +
    '<c:numFmt formatCode="0%" sourceLinked="0"/>' +
    '<c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/>' +
    '<c:spPr><a:ln><a:noFill/></a:ln></c:spPr>' +
    PROPIEDADES_TEXTO +
    '<c:crossAx val="10"/><c:crosses val="autoZero"/><c:crossBetween val="between"/>' +
    "</c:valAx>" +
    '<c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr>' +
    "</c:plotArea>" +
    '<c:legend><c:legendPos val="b"/><c:overlay val="0"/>' +
    PROPIEDADES_TEXTO +
    "</c:legend>" +
    '<c:plotVisOnly val="1"/><c:dispBlanksAs val="gap"/>' +
    "</c:chart>" +
    '<c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr>' +
    "</c:chartSpace>"
  );
}

const EMU_POR_PIXEL = 9525;

/**
 * Construye el anclaje de una imagen dentro de una celda. Por defecto la
 * imagen mide 40 x 40 píxeles y queda a 4 píxeles de los bordes superior e
 * izquierdo de la celda; se mueve con ella.
 *
 * @param {Object} imagen Datos de la imagen.
 * @param {string} imagen.idRelacion Identificador de la relación con el archivo.
 * @param {string} imagen.nombre Nombre de la imagen en el dibujo.
 * @param {string} imagen.descripcion Texto alternativo.
 * @param {number} imagen.columna Columna de la celda, a partir de 0.
 * @param {number} imagen.fila Fila de la celda, a partir de 0.
 * @param {number} [imagen.tamano=40] Lado de la imagen en píxeles.
 * @param {number} [imagen.margenX=4] Píxeles desde el borde izquierdo de la celda.
 * @param {number} [imagen.margenY=4] Píxeles desde el borde superior de la celda.
 * @param {number} indice Posición de la imagen, para numerar su identificador.
 * @returns {string} Contenido XML del anclaje.
 */

function construirImagenXml(imagen, indice) {
  const identificador = 10 + indice;

  const { tamano = 40, margenX = 4, margenY = 4 } = imagen;

  const lado = tamano * EMU_POR_PIXEL;

  return (
    "<xdr:oneCellAnchor>" +
    `<xdr:from><xdr:col>${imagen.columna}</xdr:col><xdr:colOff>${margenX * EMU_POR_PIXEL}</xdr:colOff>` +
    `<xdr:row>${imagen.fila}</xdr:row><xdr:rowOff>${margenY * EMU_POR_PIXEL}</xdr:rowOff></xdr:from>` +
    `<xdr:ext cx="${lado}" cy="${lado}"/>` +
    "<xdr:pic>" +
    "<xdr:nvPicPr>" +
    `<xdr:cNvPr id="${identificador}" name="${imagen.nombre}" descr="${imagen.descripcion}"/>` +
    '<xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr>' +
    "</xdr:nvPicPr>" +
    `<xdr:blipFill><a:blip r:embed="${imagen.idRelacion}"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill>` +
    '<xdr:spPr><a:xfrm><a:off x="0" y="0"/>' +
    `<a:ext cx="${lado}" cy="${lado}"/></a:xfrm>` +
    '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr>' +
    "</xdr:pic>" +
    "<xdr:clientData/>" +
    "</xdr:oneCellAnchor>"
  );
}

/**
 * Construye el dibujo que ubica el gráfico dentro del panel de estado general.
 *
 * @returns {string} Contenido XML del dibujo.
 */

function construirDibujoXml(imagenes = []) {
  const desde = { columna: 1, fila: 14 };

  const hasta = { columna: 13, fila: 26 };

  const marcador = (nombre, { columna, fila }, desplazamiento) =>
    `<xdr:${nombre}><xdr:col>${columna}</xdr:col><xdr:colOff>${desplazamiento}</xdr:colOff>` +
    `<xdr:row>${fila}</xdr:row><xdr:rowOff>${desplazamiento}</xdr:rowOff></xdr:${nombre}>`;

  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" ' +
    'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    '<xdr:twoCellAnchor editAs="oneCell">' +
    marcador("from", desde, 38100) +
    marcador("to", hasta, 0) +
    '<xdr:graphicFrame macro="">' +
    '<xdr:nvGraphicFramePr><xdr:cNvPr id="2" name="Estado general"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr>' +
    '<xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm>' +
    '<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart">' +
    '<c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="rId1"/>' +
    "</a:graphicData></a:graphic>" +
    "</xdr:graphicFrame>" +
    "<xdr:clientData/>" +
    "</xdr:twoCellAnchor>" +
    imagenes.map(construirImagenXml).join("") +
    "</xdr:wsDr>"
  );
}

module.exports = {
  COLUMNAS_DATOS_GRAFICO,
  construirGraficoXml,
  construirDibujoXml,
};
