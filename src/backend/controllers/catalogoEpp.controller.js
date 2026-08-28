const {
  obtenerCatalogoEppActivo,
  obtenerEppPredeterminados,
} = require("../models/catalogoEpp.model");

/**
 * GET catálogo EPP activo.
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
 * GET elementos EPP predeterminados.
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