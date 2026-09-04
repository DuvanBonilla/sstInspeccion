
const {
  obtenerResumenEstadisticas,
  listarInspeccionesConFiltros,
  listarInspeccionesEppConFiltros,
} = require("../models/inspeccion.model");

function normalizarTextoQuery(valor) {
  if (typeof valor !== "string") return "";
  return valor.trim();
}

/**
 * Obtiene y normaliza los filtros enviados en la consulta HTTP.
 *
 * Extrae el rango de fechas, sede, estado y texto de búsqueda utilizados por
 * los endpoints de estadísticas SST y EPP.
 *
 * @param {Object} req Solicitud HTTP de Express.
 * @param {Object} req.query Parámetros recibidos en la URL.
 * @returns {Object} Filtros normalizados para consultar las inspecciones.
 */

function leerFiltros(req) {
  return {
    fechaDesde: normalizarTextoQuery(req.query.fechaDesde),
    fechaHasta: normalizarTextoQuery(req.query.fechaHasta),
    sedeOperacion: normalizarTextoQuery(req.query.sedeOperacion),
    estado: normalizarTextoQuery(req.query.estado),
    q: normalizarTextoQuery(req.query.q),
  };
}

/**
 * Obtiene el resumen estadístico de las inspecciones SST.
 *
 * Lee los filtros enviados en la URL, fuerza el tipo de inspección SST y
 * consulta los indicadores y la distribución por sede.
 *
 * Corresponde al endpoint GET /api/estadisticas/resumen.
 *
 * @async
 * @param {Object} req Solicitud HTTP de Express.
 * @param {Object} res Respuesta HTTP de Express.
 * @returns {Promise<Object>} Respuesta con el resumen estadístico o estado 500
 * si falla la consulta.
 */

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

/**
 * Obtiene el listado paginado de inspecciones SST.
 *
 * Aplica filtros, paginación y ordenamiento a la consulta, limitando los
 * resultados exclusivamente a inspecciones SST.
 *
 * Corresponde al endpoint GET /api/estadisticas/inspecciones.
 *
 * @async
 * @param {Object} req Solicitud HTTP de Express.
 * @param {Object} req.query Filtros y opciones de paginación.
 * @param {Object} res Respuesta HTTP de Express.
 * @returns {Promise<Object>} Listado paginado de inspecciones o estado 500
 * si falla la consulta.
 */

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

/**
 * Obtiene el resumen estadístico de las inspecciones EPP.
 *
 * Lee los filtros enviados en la URL, fuerza el tipo de inspección EPP y
 * consulta sus indicadores y distribución por sede.
 *
 * Corresponde al endpoint GET /api/estadisticas-epp/resumen.
 *
 * @async
 * @param {Object} req Solicitud HTTP de Express.
 * @param {Object} res Respuesta HTTP de Express.
 * @returns {Promise<Object>} Resumen estadístico EPP o estado 500 si falla
 * la consulta.
 */

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

/**
 * Obtiene el listado paginado de inspecciones EPP.
 *
 * Procesa los filtros, paginación y ordenamiento recibidos y delega la consulta
 * del listado EPP al modelo de inspecciones.
 *
 * Corresponde al endpoint GET /api/estadisticas-epp/inspecciones.
 *
 * @async
 * @param {Object} req Solicitud HTTP de Express.
 * @param {Object} req.query Filtros y opciones de paginación.
 * @param {Object} res Respuesta HTTP de Express.
 * @returns {Promise<Object>} Listado paginado de inspecciones EPP o estado 500
 * si falla la consulta.
 */

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
