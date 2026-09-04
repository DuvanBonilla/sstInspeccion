const {
  obtenerCatalogoEppActivo,
  obtenerEppPredeterminados,
} = require("../models/catalogoEpp.model");

/**
 * Obtiene el catálogo activo de elementos EPP.
 *
 * Consulta los elementos habilitados que pueden ser seleccionados al realizar
 * una inspección de elementos de protección personal.
 *
 * Corresponde al endpoint GET /api/catalogo-epp.
 *
 * @async
 * @param {Object} req Solicitud HTTP de Express.
 * @param {Object} res Respuesta HTTP de Express.
 * @returns {Promise<Object>} Respuesta con la cantidad y lista de elementos
 * activos, o estado 500 si falla la consulta.
 */

async function listarCatalogoEpp(req, res) {
  try {
    const elementos = await obtenerCatalogoEppActivo();

    return res.status(200).json({
      ok: true,
      total: elementos.length,
      elementos,
    });
  } catch (error) {
    console.error("[catalogo-epp] Error obteniendo catálogo:", error);

    return res.status(500).json({
      ok: false,
      errores: ["Error obteniendo el catálogo EPP"],
    });
  }
}

/**
 * Obtiene los elementos EPP configurados como predeterminados.
 *
 * Devuelve los elementos que deben aparecer seleccionados inicialmente al
 * crear la evaluación de un trabajador.
 *
 * Corresponde al endpoint GET /api/catalogo-epp/predeterminados.
 *
 * @async
 * @param {Object} req Solicitud HTTP de Express.
 * @param {Object} res Respuesta HTTP de Express.
 * @returns {Promise<Object>} Respuesta con la cantidad y lista de elementos
 * predeterminados, o estado 500 si falla la consulta.
 */

async function listarEppPredeterminados(req, res) {
  try {
    const elementos = await obtenerEppPredeterminados();

    return res.status(200).json({
      ok: true,
      total: elementos.length,
      elementos,
    });
  } catch (error) {
    console.error(
      "[catalogo-epp] Error obteniendo elementos predeterminados:",
      error,
    );

    return res.status(500).json({
      ok: false,
      errores: ["Error obteniendo los elementos EPP predeterminados"],
    });
  }
}

module.exports = {
  listarCatalogoEpp,
  listarEppPredeterminados,
};