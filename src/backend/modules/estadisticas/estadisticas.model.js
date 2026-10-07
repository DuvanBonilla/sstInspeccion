/*
  estadisticas.model.js — Consultas de estadísticas de inspecciones SST y EPP.

  Qué hace:
  - obtenerResumenEstadisticas(): indicadores generales y distribución por sede.
  - listarInspeccionesConFiltros(): listado paginado de inspecciones SST.
  - listarInspeccionesEppConFiltros(): listado paginado de inspecciones EPP.

  Cómo interactúa:
  - Es la capa Modelo del módulo de estadísticas: único lugar con el SQL de
    estos reportes. Lo usa estadisticas.controller.js.
  - Las consultas se trasladaron sin cambios desde models/inspeccion.model.js.
*/
const { query } = require("../../config/database");

/**
 * Construye las condiciones y parámetros SQL para filtrar inspecciones.
 *
 * Genera una cláusula parametrizada a partir del tipo de inspección, rango
 * de fechas, sede, estado y texto de búsqueda. Si no se reciben filtros,
 * devuelve una condición que incluye todos los registros.
 *
 * @param {Object} filtros Criterios aplicados a la consulta.
 * @param {string} [filtros.fechaDesde] Fecha inicial del rango.
 * @param {string} [filtros.fechaHasta] Fecha final del rango.
 * @param {string} [filtros.sedeOperacion] Sede operacional.
 * @param {string} [filtros.estado] Estado de la inspección.
 * @param {string} [filtros.q] Texto de búsqueda general.
 * @param {string} [filtros.tipoInspeccion] Tipo de inspección.
 * @returns {{whereSql: string, valores: Array<*>}} Condición SQL y valores
 * parametrizados utilizados por las consultas.
 */

function construirFiltrosInspecciones({
  fechaDesde,
  fechaHasta,
  sedeOperacion,
  estado,
  q,
  tipoInspeccion,
}) {
  const condiciones = [];
  const valores = [];

  // =====================================================
  // TIPO DE INSPECCIÓN
  // =====================================================

  if (tipoInspeccion) {
    valores.push(tipoInspeccion);

    condiciones.push(`i.tipo_inspeccion = $${valores.length}`);
  }

  // =====================================================
  // FECHA DESDE
  // =====================================================

  if (fechaDesde) {
    valores.push(fechaDesde);

    condiciones.push(`i.created_at::date >= $${valores.length}`);
  }

  // =====================================================
  // FECHA HASTA
  // =====================================================

  if (fechaHasta) {
    valores.push(fechaHasta);

    condiciones.push(`i.created_at::date <= $${valores.length}`);
  }

  // =====================================================
  // SEDE
  // =====================================================

  if (sedeOperacion) {
    valores.push(sedeOperacion);

    condiciones.push(`i.sede_operacion = $${valores.length}`);
  }

  // =====================================================
  // ESTADO
  // =====================================================

  if (estado) {
    valores.push(estado);

    condiciones.push(`i.estado = $${valores.length}`);
  }

  // =====================================================
  // BÚSQUEDA GENERAL
  // =====================================================

  if (q) {
    valores.push(`%${q}%`);

    condiciones.push(`
      (
        i.inspeccion_id ILIKE $${valores.length}
        OR i.responsable_inspeccion ILIKE $${valores.length}
        OR i.jefe_responsable ILIKE $${valores.length}
        OR i.area_trabajo ILIKE $${valores.length}
      )
    `);
  }

  return {
    whereSql: condiciones.length > 0 ? condiciones.join(" AND ") : "1=1",

    valores,
  };
}

/**
 * Obtiene el resumen estadístico de las inspecciones.
 *
 * Calcula el total de inspecciones, sus cantidades por estado, las creadas
 * durante el mes actual y la distribución de registros por sede. Aplica los
 * filtros recibidos a todas las consultas del resumen.
 *
 * @async
 * @param {Object} [filtros={}] Criterios de búsqueda de inspecciones.
 * @param {string} [filtros.fechaDesde] Fecha inicial del rango.
 * @param {string} [filtros.fechaHasta] Fecha final del rango.
 * @param {string} [filtros.sedeOperacion] Sede operacional.
 * @param {string} [filtros.estado] Estado de la inspección.
 * @param {string} [filtros.q] Texto de búsqueda general.
 * @param {string} [filtros.tipoInspeccion] Tipo de inspección.
 * @returns {Promise<Object>} Totales por estado, registros del mes actual y
 * distribución de inspecciones por sede.
 * @throws {Error} Si falla alguna consulta a la base de datos.
 */

async function obtenerResumenEstadisticas(filtros = {}) {
  const { whereSql, valores } = construirFiltrosInspecciones(filtros);

  const resumenSql = `
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE i.estado = 'pendiente_aprobacion')::int AS pendientes,
      COUNT(*) FILTER (WHERE i.estado = 'aprobada')::int AS aprobadas,
      COUNT(*) FILTER (WHERE i.estado = 'enviada')::int AS enviadas,
      COUNT(*) FILTER (WHERE i.created_at >= date_trunc('month', now()))::int AS este_mes
    FROM inspecciones i
    WHERE ${whereSql}
  `;

  const sedesSql = `
    SELECT
      COALESCE(NULLIF(TRIM(i.sede_operacion), ''), 'Sin sede') AS sede,
      COUNT(*)::int AS cantidad
    FROM inspecciones i
    WHERE ${whereSql}
    GROUP BY 1
    ORDER BY cantidad DESC, sede ASC
    LIMIT 8
  `;

  const [resResumen, resSedes] = await Promise.all([
    query(resumenSql, valores),
    query(sedesSql, valores),
  ]);

  return {
    total: Number(resResumen.rows?.[0]?.total || 0),
    pendientes: Number(resResumen.rows?.[0]?.pendientes || 0),
    aprobadas: Number(resResumen.rows?.[0]?.aprobadas || 0),
    enviadas: Number(resResumen.rows?.[0]?.enviadas || 0),
    esteMes: Number(resResumen.rows?.[0]?.este_mes || 0),
    porSede: resSedes.rows || [],
  };
}

/**
 * Consulta una lista paginada de inspecciones y sus cantidades de elementos.
 *
 * Aplica filtros, ordenamiento y paginación. Para cada inspección incluye la
 * cantidad registrada de extintores, camillas, señalizaciones, equipos
 * tecnológicos y botiquines.
 *
 * @async
 * @param {Object} [filtros={}] Criterios de búsqueda de inspecciones.
 * @param {Object} [paginacion={}] Configuración de la página solicitada.
 * @param {number} [paginacion.page=1] Número de página.
 * @param {number} [paginacion.pageSize=10] Registros por página.
 * @param {string} [paginacion.sortBy] Campo utilizado para ordenar.
 * @param {string} [paginacion.sortOrder] Dirección del ordenamiento.
 * @returns {Promise<Object>} Total de registros, información de paginación
 * y lista de inspecciones encontradas.
 * @throws {Error} Si falla alguna consulta a la base de datos.
 */

async function listarInspeccionesConFiltros(filtros = {}, paginacion = {}) {
  const page = Math.max(1, Number(paginacion.page) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, Number(paginacion.pageSize) || 10),
  );
  const offset = (page - 1) * pageSize;
  const sortBy = paginacion.sortBy;
  const sortOrder = paginacion.sortOrder === "desc" ? "DESC" : "ASC";

  const columnasOrdenables = {
    numero: "i.inspecciones_id",
    codigo: "i.inspeccion_id",
    registro: "i.created_at",
    sedeOperacion: "i.sede_operacion",
    area: "i.area_trabajo",
    responsable: "i.responsable_inspeccion",
    estado: "i.estado",
    items: `
    (
      COALESCE(ext.cantidad,0) +
      COALESCE(cam.cantidad,0) +
      COALESCE(sen.cantidad,0) +
      COALESCE(eqp.cantidad,0) +
      COALESCE(bot.cantidad,0)
    )
  `,
  };

  const columnaOrden = columnasOrdenables[sortBy] || "i.created_at";
  const { whereSql, valores } = construirFiltrosInspecciones(filtros);

  const totalSql = `SELECT COUNT(*)::int AS total FROM inspecciones i WHERE ${whereSql}`;

  const datosSql = `
    SELECT
      i.inspeccion_id,
      i.inspecciones_id,
      i.fecha,
      i.created_at,
      i.sede_operacion,
      i.area_trabajo,
      i.jefe_responsable,
      i.responsable_inspeccion,
      i.estado,
      COALESCE(ext.cantidad, 0)::int AS extintores,
      COALESCE(cam.cantidad, 0)::int AS camillas,
      COALESCE(sen.cantidad, 0)::int AS senalizaciones,
      COALESCE(eqp.cantidad, 0)::int AS equipos,
      COALESCE(bot.cantidad, 0)::int AS botiquines
    FROM inspecciones i
      LEFT JOIN (
        SELECT inspecciones_id, COUNT(*)::int AS cantidad FROM extintores GROUP BY inspecciones_id
      ) ext ON ext.inspecciones_id = i.inspecciones_id
      LEFT JOIN (
        SELECT inspecciones_id, COUNT(*)::int AS cantidad FROM camillas GROUP BY inspecciones_id
      ) cam ON cam.inspecciones_id = i.inspecciones_id
      LEFT JOIN (
        SELECT inspecciones_id, COUNT(*)::int AS cantidad FROM senalizaciones GROUP BY inspecciones_id
      ) sen ON sen.inspecciones_id = i.inspecciones_id
      LEFT JOIN (
        SELECT inspecciones_id, COUNT(*)::int AS cantidad FROM equipos_tecnologicos GROUP BY inspecciones_id
      ) eqp ON eqp.inspecciones_id = i.inspecciones_id
      LEFT JOIN (
        SELECT inspecciones_id, COUNT(*)::int AS cantidad FROM botiquines GROUP BY inspecciones_id
      ) bot ON bot.inspecciones_id = i.inspecciones_id
    WHERE ${whereSql}
    ORDER BY ${columnaOrden} ${sortOrder}
    LIMIT $${valores.length + 1}
    OFFSET $${valores.length + 2}
  `;

  const [resTotal, resDatos] = await Promise.all([
    query(totalSql, valores),
    query(datosSql, [...valores, pageSize, offset]),
  ]);

  const total = Number(resTotal.rows?.[0]?.total || 0);

  return {
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    items: resDatos.rows || [],
  };
}

/**
 * Consulta una lista paginada de inspecciones EPP.
 *
 * Fuerza el filtro de tipo EPP y aplica los demás criterios de búsqueda,
 * ordenamiento y paginación. Cada registro incluye la cantidad de trabajadores
 * relacionados con la inspección.
 *
 * @async
 * @param {Object} [filtros={}] Criterios de búsqueda de inspecciones EPP.
 * @param {Object} [paginacion={}] Configuración de la página solicitada.
 * @param {number} [paginacion.page=1] Número de página.
 * @param {number} [paginacion.pageSize=10] Registros por página.
 * @param {string} [paginacion.sortBy] Campo utilizado para ordenar.
 * @param {string} [paginacion.sortOrder] Dirección del ordenamiento.
 * @returns {Promise<Object>} Total de registros, información de paginación
 * y lista de inspecciones EPP encontradas.
 * @throws {Error} Si falla alguna consulta a la base de datos.
 */

async function listarInspeccionesEppConFiltros(filtros = {}, paginacion = {}) {
  const page = Math.max(1, Number(paginacion.page) || 1);

  const pageSize = Math.min(
    100,
    Math.max(1, Number(paginacion.pageSize) || 10),
  );

  const offset = (page - 1) * pageSize;

  const sortBy = paginacion.sortBy;

  const sortOrder = paginacion.sortOrder === "desc" ? "DESC" : "ASC";

  // =====================================================
  // COLUMNAS ORDENABLES
  // =====================================================

  const columnasOrdenables = {
    numero: "i.inspecciones_id",

    codigo: "i.inspeccion_id",

    registro: "i.created_at",

    sedeOperacion: "i.sede_operacion",

    area: "i.area_trabajo",

    responsable: "i.responsable_inspeccion",

    estado: "i.estado",

    trabajadores: "COALESCE(tra.cantidad, 0)",
  };

  const columnaOrden = columnasOrdenables[sortBy] || "i.created_at";

  // =====================================================
  // FORZAR TIPO EPP
  // =====================================================

  const filtrosEpp = {
    ...filtros,

    tipoInspeccion: "EPP",
  };

  const { whereSql, valores } = construirFiltrosInspecciones(filtrosEpp);

  // =====================================================
  // TOTAL
  // =====================================================

  const totalSql = `
    SELECT
      COUNT(*)::int AS total

    FROM inspecciones i

    WHERE ${whereSql}
  `;

  // =====================================================
  // DATOS
  // =====================================================

  const datosSql = `
    SELECT
      i.inspeccion_id,
      i.inspecciones_id,
      i.fecha,
      i.created_at,
      i.sede_operacion,
      i.area_trabajo,
      i.jefe_responsable,
      i.responsable_inspeccion,
      i.estado,

      COALESCE(
        tra.cantidad,
        0
      )::int AS trabajadores

    FROM inspecciones i

    LEFT JOIN (
      SELECT
        inspecciones_id,
        COUNT(*)::int AS cantidad

      FROM evaluaciones_epp

      GROUP BY inspecciones_id
    ) tra
      ON tra.inspecciones_id = i.inspecciones_id

    WHERE ${whereSql}

    ORDER BY
      ${columnaOrden}
      ${sortOrder}

    LIMIT $${valores.length + 1}

    OFFSET $${valores.length + 2}
  `;

  // =====================================================
  // EJECUTAR CONSULTAS
  // =====================================================

  const [resTotal, resDatos] = await Promise.all([
    query(totalSql, valores),

    query(datosSql, [...valores, pageSize, offset]),
  ]);

  const total = Number(resTotal.rows?.[0]?.total || 0);

  // =====================================================
  // RESPUESTA
  // =====================================================

  return {
    total,

    page,

    pageSize,

    totalPages: Math.max(1, Math.ceil(total / pageSize)),

    items: resDatos.rows || [],
  };
}

module.exports = {
  obtenerResumenEstadisticas,
  listarInspeccionesConFiltros,
  listarInspeccionesEppConFiltros,
};
