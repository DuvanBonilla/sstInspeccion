const { query } = require("../db/pool");

/**
 * Obtiene todos los elementos EPP activos.
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
 * Obtiene únicamente los elementos configurados como
 * predeterminados para una inspección EPP.
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