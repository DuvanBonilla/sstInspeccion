/**
 * Genera el identificador único de una inspección EPP.
 *
 * Conserva el formato `INSP-AAAAMMDD-XXXX`, utilizando la fecha local
 * y cuatro caracteres aleatorios en mayúsculas.
 *
 * @param {Object} [dependencias] Dependencias de generación.
 * @param {Date} [dependencias.fecha=new Date()] Fecha utilizada.
 * @param {Function} [dependencias.aleatorio=Math.random] Generador aleatorio.
 * @returns {string} Identificador de la inspección.
 */
export function generarInspeccionId({
  fecha = new Date(),
  aleatorio = Math.random,
} = {}) {
  const fechaId =
    `${fecha.getFullYear()}` +
    `${String(
      fecha.getMonth() + 1,
    ).padStart(2, "0")}` +
    `${String(
      fecha.getDate(),
    ).padStart(2, "0")}`;

  const segmentoAleatorio = aleatorio()
    .toString(36)
    .slice(2, 6)
    .toUpperCase();

  return `INSP-${fechaId}-${segmentoAleatorio}`;
}