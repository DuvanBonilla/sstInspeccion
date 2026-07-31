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
  listarInspeccionesConFiltros
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
    q: normalizarTextoQuery(req.query.q)
  };
}

async function obtenerResumen(req, res) {
  try {
    const filtros = leerFiltros(req);
    const resumen = await obtenerResumenEstadisticas(filtros);
    return res.status(200).json({ ok: true, resumen });
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : "Error consultando estadísticas";
    return res.status(500).json({ ok: false, errores: [mensaje] });
  }
}

async function listarInspecciones(req, res) {
  try {
    const filtros = leerFiltros(req);
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 10;
    const sortBy = req.query.sortBy || null;
    const sortOrder = req.query.sortOrder || "asc";

    const listado = await listarInspeccionesConFiltros(filtros, { page, pageSize, sortBy, sortOrder });
    return res.status(200).json({ ok: true, ...listado });
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : "Error consultando inspecciones";
    return res.status(500).json({ ok: false, errores: [mensaje] });
  }
}

module.exports = {
  obtenerResumen,
  listarInspecciones
};
