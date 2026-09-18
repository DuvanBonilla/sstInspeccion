/**
 * Genera un identificador único para una inspección SST.
 *
 * @param {Object} [opciones] Dependencias utilizadas para generar el ID.
 * @param {Date} [opciones.fechaActual] Fecha utilizada en el identificador.
 * @param {Function} [opciones.generarAleatorio] Generador del componente aleatorio.
 * @returns {string} Identificador con formato `INSP-YYYYMMDD-XXXX`.
 */
export function generarInspeccionId({
  fechaActual = new Date(),
  generarAleatorio = Math.random,
} = {}) {
  const fecha =
    `${fechaActual.getFullYear()}` +
    `${String(fechaActual.getMonth() + 1).padStart(2, "0")}` +
    `${String(fechaActual.getDate()).padStart(2, "0")}`;

  const aleatorio = generarAleatorio()
    .toString(36)
    .slice(2, 6)
    .toUpperCase();

  return `INSP-${fecha}-${aleatorio}`;
}