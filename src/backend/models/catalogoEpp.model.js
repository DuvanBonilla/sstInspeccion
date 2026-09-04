const { query } = require("../db/pool");

/**
 * Consulta todos los elementos activos del catálogo EPP.
 *
 * Devuelve el identificador, nombre, categoría y configuración predeterminada
 * de cada elemento. Los elementos predeterminados aparecen primero y los demás
 * se ordenan alfabéticamente.
 *
 * @async
 * @returns {Promise<Array<Object>>} Elementos activos del catálogo EPP.
 * @throws {Error} Si falla la consulta a la base de datos.
 */

async function obtenerCatalogoEppActivo() {
  const { rows } = await query(`
    SELECT
      id,
      nombre,
      categoria,
      predeterminado
    FROM elementos_epp
    WHERE activo = TRUE
    ORDER BY predeterminado DESC, nombre ASC
  `);

  return rows;
}

/**
 * Consulta los elementos EPP activos configurados como predeterminados.
 *
 * Estos elementos se utilizan como selección inicial al crear la evaluación
 * EPP de un trabajador.
 *
 * @async
 * @returns {Promise<Array<Object>>} Elementos predeterminados ordenados
 * alfabéticamente.
 * @throws {Error} Si falla la consulta a la base de datos.
 */

async function obtenerEppPredeterminados() {
  const { rows } = await query(`
    SELECT
      id,
      nombre,
      categoria,
      predeterminado
    FROM elementos_epp
    WHERE activo = TRUE
      AND predeterminado = TRUE
    ORDER BY nombre ASC
  `);

  return rows;
}

module.exports = {
  obtenerCatalogoEppActivo,
  obtenerEppPredeterminados,
};