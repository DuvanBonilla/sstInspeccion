const AdmZip = require("adm-zip");

const { obtenerXml, reemplazarXml } = require("./excelXml.util");

const RUTA_DIBUJO = /^xl\/drawings\/drawing\d+\.xml$/;

/**
 * Bloque de extensión con el identificador de creación que ExcelJS escribe en
 * cada imagen. Es el mismo valor para todas, y Excel en la web, al verlo
 * repetido, muestra una sola imagen. Quitarlo es válido: es opcional.
 */

const IDENTIFICADOR_CREACION =
  /<a:extLst><a:ext uri="\{FF2B5EF4-FFF2-40B4-BE49-F238E27FC236\}"><a16:creationId\b[^>]*\/><\/a:ext><\/a:extLst>/g;

/**
 * Corrige el XML de un dibujo para que Excel, incluida la versión web, muestre
 * todas las imágenes:
 *
 * - quita el identificador de creación repetido de cada imagen;
 * - quita `editAs` de los anclajes de una celda, que el esquema no admite;
 * - copia el tamaño del anclaje al de la forma, que ExcelJS deja en cero.
 *
 * @param {string} dibujoXml Contenido XML del dibujo.
 * @returns {string} XML del dibujo corregido.
 */

function normalizarDibujoXml(dibujoXml) {
  return dibujoXml
    .replace(IDENTIFICADOR_CREACION, "")
    .replace(/<xdr:oneCellAnchor\s+editAs="[^"]*">/g, "<xdr:oneCellAnchor>")
    .replace(
      /(<xdr:oneCellAnchor>[\s\S]*?<xdr:ext cx="(\d+)" cy="(\d+)"\/>[\s\S]*?<a:xfrm>[\s\S]*?<a:ext )cx="0" cy="0"(\/>)/g,
      (coincidencia, antes, ancho, alto, cierre) =>
        `${antes}cx="${ancho}" cy="${alto}"${cierre}`,
    );
}

/**
 * Corrige los dibujos de un libro XLSX generado con ExcelJS.
 *
 * Si el libro no tiene dibujos, lo devuelve sin cambios.
 *
 * @param {Buffer} buffer Contenido binario del libro.
 * @returns {Buffer} Contenido binario del libro con los dibujos corregidos.
 */

function normalizarDibujosXlsx(buffer) {
  const zip = new AdmZip(buffer);

  const dibujos = zip
    .getEntries()
    .map(({ entryName }) => entryName)
    .filter((nombre) => RUTA_DIBUJO.test(nombre));

  if (!dibujos.length) {
    return buffer;
  }

  for (const ruta of dibujos) {
    reemplazarXml(zip, ruta, normalizarDibujoXml(obtenerXml(zip, ruta)));
  }

  return zip.toBuffer();
}

module.exports = {
  normalizarDibujoXml,
  normalizarDibujosXlsx,
};
