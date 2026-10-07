const exifr = require("exifr");

/**
 * Extrae la fecha de captura almacenada en los metadatos EXIF de una imagen.
 *
 * Busca primero `DateTimeOriginal` y utiliza `DateTime` como alternativa.
 * La fecha encontrada se devuelve con formato `YYYY-MM-DD HH:mm`.
 *
 * @async
 * @param {Buffer} buffer Contenido binario de la imagen.
 * @returns {Promise<string|null>} Fecha obtenida de los metadatos o `null`
 * cuando no existe, es inválida o no puede ser procesada.
 */

async function extraerFechaExif(buffer) {
  if (!buffer?.length) return null;
  try {
    const data = await exifr.parse(buffer, ["DateTimeOriginal", "DateTime"]);
    const raw = data?.DateTimeOriginal || data?.DateTime;
    if (!raw) return null;
    const d = raw instanceof Date ? raw : new Date(raw);
    if (isNaN(d)) return null;
    const p = n => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  } catch {
    return null;
  }
}

/**
 * Convierte una marca de tiempo en milisegundos a una fecha legible.
 *
 * @param {number|string} ms Marca de tiempo en milisegundos.
 * @returns {string|null} Fecha con formato `YYYY-MM-DD HH:mm`, o `null`
 * cuando el valor recibido no representa una fecha válida.
 */

function formatearFechaMs(ms) {
  const d = new Date(Number(ms));
  if (isNaN(d)) return null;
  const p = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/**
 * Determina la fecha asociada a una evidencia fotográfica.
 *
 * Utiliza primero la fecha de captura registrada en los metadatos EXIF. Cuando
 * esta no está disponible, utiliza la fecha de última modificación enviada
 * desde el navegador. Si ninguna opción es válida, devuelve `null`.
 *
 * @async
 * @param {Object} file Archivo de evidencia recibido mediante Multer.
 * @param {Buffer} file.buffer Contenido binario de la imagen.
 * @param {number|string} lastModMs Fecha de última modificación en milisegundos.
 * @returns {Promise<string|null>} Fecha determinada con formato
 * `YYYY-MM-DD HH:mm`, o `null` cuando no puede establecerse.
 */

async function resolverFechaEvidencia(file, lastModMs) {
  const fechaExif = await extraerFechaExif(file?.buffer);
  if (fechaExif) return fechaExif;
  if (lastModMs) return formatearFechaMs(lastModMs);
  return null;
}

module.exports = { extraerFechaExif, formatearFechaMs, resolverFechaEvidencia };
