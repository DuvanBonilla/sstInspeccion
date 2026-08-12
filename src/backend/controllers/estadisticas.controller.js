/*
  estadisticas.controller.js — Endpoints para resumen y listado de inspecciones.

  Qué hace:
  - GET /api/estadisticas/resumen: devuelve KPIs y distribución por sede.
  - GET /api/estadisticas/inspecciones: devuelve listado paginado con filtros.

  Cómo interactúa:
  - Reutiliza el modelo inspeccion.model.js para ejecutar consultas en Neon.
*/
const {
  obtenerResumenEstadisticas,
  listarInspeccionesConFiltros,
  listarInspeccionesEppConFiltros,
} = require("../models/inspeccion.model");

function normalizarTextoQuery(valor) {
  if (typeof valor !== "string") return "";
  return valor.trim();
}

function leerFiltros(req) {
  return {
    fechaDesde: normalizarTextoQuery(req.query.fechaDesde),
    fechaHasta: normalizarTextoQuery(req.query.fechaHasta),
    sedeOperacion: normalizarTextoQuery(req.query.sedeOperacion),
    estado: normalizarTextoQuery(req.query.estado),
    q: normalizarTextoQuery(req.query.q),
  };
}

async function obtenerResumen(req, res) {
  try {
    const filtros = {
      ...leerFiltros(req),
      tipoInspeccion: "SST",
    };

    const resumen = await obtenerResumenEstadisticas(filtros);

    return res.status(200).json({
      ok: true,
      resumen,
    });
  } catch (error) {
    const mensaje =
      error instanceof Error ? error.message : "Error consultando estadísticas";

    return res.status(500).json({
      ok: false,
      errores: [mensaje],
    });
  }
}

async function listarInspecciones(req, res) {
  try {
    const filtros = {
      ...leerFiltros(req),

      // Este endpoint pertenece exclusivamente a SST
      tipoInspeccion: "SST",
    };

    const paginacion = {
      page: req.query.page,
      pageSize: req.query.pageSize,
      sortBy: req.query.sortBy,
      sortOrder: req.query.sortOrder,
    };

    const resultado = await listarInspeccionesConFiltros(filtros, paginacion);

    return res.json(resultado);
  } catch (error) {
    console.error("Error listando inspecciones SST:", error);

    return res.status(500).json({
      error: "No fue posible listar las inspecciones SST",
    });
  }
}

// =====================================================
// RESUMEN ESTADÍSTICAS EPP
// =====================================================

async function obtenerResumenEpp(req, res) {
  try {
    const filtros = {
      ...leerFiltros(req),

      // Este endpoint pertenece exclusivamente a EPP
      tipoInspeccion: "EPP",
    };

    const resumen = await obtenerResumenEstadisticas(filtros);

    return res.json(resumen);
  } catch (error) {
    console.error("Error obteniendo resumen de estadísticas EPP:", error);

    return res.status(500).json({
      error: "No fue posible obtener el resumen de estadísticas EPP",
    });
  }
}

// =====================================================
// LISTADO ESTADÍSTICAS EPP
// =====================================================

async function listarInspeccionesEpp(req, res) {
  try {
    const filtros = leerFiltros(req);

    const paginacion = {
      page: req.query.page,
      pageSize: req.query.pageSize,
      sortBy: req.query.sortBy,
      sortOrder: req.query.sortOrder,
    };

    const resultado = await listarInspeccionesEppConFiltros(
      filtros,
      paginacion,
    );

    return res.json(resultado);
  } catch (error) {
    console.error("Error listando inspecciones EPP:", error);

    return res.status(500).json({
      error: "No fue posible listar las inspecciones EPP",
    });
  }
}

module.exports = {
  obtenerResumen,
  listarInspecciones,
  obtenerResumenEpp,
  listarInspeccionesEpp,
};
