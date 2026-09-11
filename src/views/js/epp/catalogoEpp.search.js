/**
 * Normaliza un texto para realizar búsquedas sin distinguir
 * mayúsculas, espacios exteriores ni signos diacríticos.
 *
 * @param {*} valor Valor que debe normalizarse.
 * @returns {string} Texto preparado para búsqueda.
 */
export function normalizarTextoBusqueda(valor) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Filtra los elementos disponibles en el catálogo EPP.
 *
 * Excluye los elementos que el trabajador ya tiene agregados y,
 * cuando existe un término de búsqueda, compara sus nombres
 * normalizados.
 *
 * @param {Object} opciones Opciones del filtro.
 * @param {Array} opciones.elementos Catálogo completo.
 * @param {Set<string>} opciones.idsActuales Identificadores ya agregados.
 * @param {string} [opciones.terminoBusqueda=""] Texto de búsqueda.
 * @returns {Array} Elementos disponibles que coinciden con la búsqueda.
 */
export function filtrarCatalogoEpp({
  elementos,
  idsActuales,
  terminoBusqueda = "",
}) {
  const termino = normalizarTextoBusqueda(
    terminoBusqueda,
  );

  return elementos.filter((elemento) => {
    const elementoEppId = String(elemento.id);

    if (idsActuales.has(elementoEppId)) {
      return false;
    }

    if (!termino) {
      return true;
    }

    const nombreNormalizado = normalizarTextoBusqueda(
      elemento.nombre,
    );

    return nombreNormalizado.includes(termino);
  });
}