const path = require("path");

const { obtenerXml } = require("../../../shared/utils/excelXml.util");

const RUTA_WORKBOOK = "xl/workbook.xml";

const RUTA_RELACIONES_WORKBOOK = "xl/_rels/workbook.xml.rels";

function desescaparAtributo(valor) {
  return String(valor)
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function obtenerAtributo(elemento, nombre) {
  const valor = elemento.match(new RegExp(`\\b${nombre}="([^"]*)"`))?.[1];

  return valor == null ? null : desescaparAtributo(valor);
}

function normalizarDestino(destino, directorioBase) {
  return destino.startsWith("/")
    ? destino.slice(1)
    : path.posix.normalize(path.posix.join(directorioBase, destino));
}

function leerRelaciones(zip, rutaRelaciones) {
  if (!zip.getEntry(rutaRelaciones)) {
    return [];
  }

  return (obtenerXml(zip, rutaRelaciones).match(/<Relationship\b[^>]*\/>/g) || [])
    .map((elemento) => ({
      id: obtenerAtributo(elemento, "Id"),
      tipo: obtenerAtributo(elemento, "Type") || "",
      destino: obtenerAtributo(elemento, "Target"),
    }))
    .filter((relacion) => relacion.id && relacion.destino);
}

/**
 * Busca la ruta interna de una hoja a partir de su nombre.
 *
 * Excel renumera los archivos de las hojas (`sheet1.xml`, `sheet2.xml`...)
 * según el orden de las pestañas cada vez que guarda el libro, por lo que la
 * ruta no puede darse por fija. El nombre de la hoja sí es estable.
 *
 * @param {AdmZip} zip Archivo Excel abierto como contenedor ZIP.
 * @param {string} nombreHoja Nombre de la pestaña.
 * @returns {string|null} Ruta interna de la hoja, o `null` si no existe.
 */

function buscarRutaHoja(zip, nombreHoja) {
  const hojas = obtenerXml(zip, RUTA_WORKBOOK).match(/<sheet\b[^>]*\/>/g) || [];

  const hoja = hojas.find(
    (elemento) => obtenerAtributo(elemento, "name") === nombreHoja,
  );

  const idRelacion = hoja ? obtenerAtributo(hoja, "r:id") : null;

  if (!idRelacion) {
    return null;
  }

  const relacion = leerRelaciones(zip, RUTA_RELACIONES_WORKBOOK).find(
    ({ id }) => id === idRelacion,
  );

  return relacion ? normalizarDestino(relacion.destino, "xl") : null;
}

/**
 * Obtiene la ruta interna de una hoja a partir de su nombre.
 *
 * @param {AdmZip} zip Archivo Excel abierto como contenedor ZIP.
 * @param {string} nombreHoja Nombre de la pestaña.
 * @returns {string} Ruta interna de la hoja.
 * @throws {Error} Si el libro no tiene una hoja con ese nombre.
 */

function obtenerRutaHoja(zip, nombreHoja) {
  const ruta = buscarRutaHoja(zip, nombreHoja);

  if (!ruta || !zip.getEntry(ruta)) {
    throw new Error(`No se encontró la hoja "${nombreHoja}" en el libro de Excel`);
  }

  return ruta;
}

/**
 * Busca la ruta interna de la tabla estructurada de una hoja.
 *
 * @param {AdmZip} zip Archivo Excel abierto como contenedor ZIP.
 * @param {string} rutaHoja Ruta interna de la hoja.
 * @returns {string|null} Ruta interna de la tabla, o `null` si no tiene.
 */

function buscarRutaTabla(zip, rutaHoja) {
  const directorio = path.posix.dirname(rutaHoja);

  const relacion = leerRelaciones(
    zip,
    path.posix.join(directorio, "_rels", `${path.posix.basename(rutaHoja)}.rels`),
  ).find(({ tipo }) => tipo.endsWith("/table"));

  return relacion ? normalizarDestino(relacion.destino, directorio) : null;
}

/**
 * Obtiene la ruta interna de la tabla estructurada de una hoja.
 *
 * @param {AdmZip} zip Archivo Excel abierto como contenedor ZIP.
 * @param {string} rutaHoja Ruta interna de la hoja.
 * @returns {string} Ruta interna de la tabla.
 * @throws {Error} Si la hoja no tiene una tabla asociada.
 */

function obtenerRutaTabla(zip, rutaHoja) {
  const ruta = buscarRutaTabla(zip, rutaHoja);

  if (!ruta || !zip.getEntry(ruta)) {
    throw new Error(`No se encontró la tabla de la hoja ${rutaHoja}`);
  }

  return ruta;
}

module.exports = {
  leerRelaciones,
  normalizarDestino,
  buscarRutaHoja,
  obtenerRutaHoja,
  buscarRutaTabla,
  obtenerRutaTabla,
};
