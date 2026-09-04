const { query, pool } = require("../db/pool");

/**
 * Guarda una inspección SST completa en la base de datos.
 *
 * Registra la información general y sus secciones de extintores, camillas,
 * señalizaciones, equipos tecnológicos y botiquines. Los elementos de cada
 * botiquín se almacenan relacionados con su registro principal.
 *
 * Todas las operaciones se ejecutan dentro de una transacción. Si alguna
 * consulta falla, revierte los cambios realizados y libera la conexión.
 * La aprobación del inspector se registra automáticamente.
 *
 * @async
 * @param {Object} data Inspección SST normalizada.
 * @param {Object} data.general Información general de la inspección.
 * @param {Array<Object>} [data.extintores] Extintores inspeccionados.
 * @param {Array<Object>} [data.camillas] Camillas inspeccionadas.
 * @param {Array<Object>} [data.senalizaciones] Señalizaciones inspeccionadas.
 * @param {Array<Object>} [data.equiposTecnologicos] Equipos inspeccionados.
 * @param {Array<Object>} [data.botiquines] Botiquines inspeccionados.
 * @returns {Promise<Object>} Identificador, número consecutivo y tokens de
 * aprobación de la inspección registrada.
 * @throws {Error} Si falla alguna operación de la transacción.
 */

async function guardarInspeccionEnDB(data) {
  const general = data?.general || {};
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // El Inspector es quien diligencia el formulario: su aprobación queda
    // registrada de una vez con los datos de la info general (nombre),
    // sin necesidad de generarle un link aparte como a Jefe de Área y COPASST.
    const { rows } = await client.query(
      `INSERT INTO inspecciones (
        inspeccion_id, fecha, sede_operacion, area_trabajo,
        jefe_responsable, cargo_jefe, responsable_inspeccion, cargo_responsable,
        aprobacion_inspector_nombre, aprobacion_inspector_cedula, aprobacion_inspector_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())
      RETURNING inspecciones_id, token_inspector, token_jefe, token_copasst`,
      [
        general.inspeccionId || "",
        general.fecha || "",
        general.sedeOperacion || "",
        general.areaTrabajo || "",
        general.jefeResponsable || "",
        general.cargoJefe || "",
        general.responsableInspeccion || "",
        general.cargoResponsable || "",
        general.responsableInspeccion || "",
        "",
      ],
    );
    const inspeccion = rows[0];
    const pk = inspeccion.inspecciones_id;

    for (const [idx, e] of (data?.extintores || []).entries()) {
      await client.query(
        `INSERT INTO extintores (inspecciones_id, idx, numero, ubicacion, tipo, capacidad, mes_recarga, ano_recarga, observaciones, evidencia_ruta, evidencia_archivo, evidencia_fecha, condiciones)
        
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [
          pk,
          idx,
          e.numero || "",
          e.ubicacion || "",
          e.tipo || "",
          e.capacidad || "",
          e.mesRecarga || "",
          e.anioRecarga || "",
          e.observaciones || "",
          e.evidenciaRuta || "",
          e.evidenciaArchivo || "",
          e.evidenciaFecha || null,
          JSON.stringify(e.condiciones || {}),
        ],
      );
    }

    for (const [idx, c] of (data?.camillas || []).entries()) {
      await client.query(
        `INSERT INTO camillas (inspecciones_id, idx, numero, ubicacion, observaciones, afectacion_productividad, evidencia_ruta, evidencia_archivo, evidencia_fecha, condiciones)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          pk,
          idx,
          c.numero || "",
          c.ubicacion || "",
          c.observaciones || "",
          c.afectacionProductividad || "",
          c.evidenciaRuta || "",
          c.evidenciaArchivo || "",
          c.evidenciaFecha || null,
          JSON.stringify(c.condiciones || {}),
        ],
      );
    }

    for (const [idx, s] of (data?.senalizaciones || []).entries()) {
      await client.query(
        `INSERT INTO senalizaciones (inspecciones_id, idx, tipo, ubicacion, cantidad, estado, aseo, observaciones, evidencia_ruta, evidencia_archivo, evidencia_fecha)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          pk,
          idx,
          s.tipo || "",
          s.ubicacion || "",
          s.cantidad || "",
          s.estado || "",
          s.aseo || "",
          s.observaciones || "",
          s.evidenciaRuta || "",
          s.evidenciaArchivo || "",
          s.evidenciaFecha || null,
        ],
      );
    }

    for (const [idx, eq] of (data?.equiposTecnologicos || []).entries()) {
      await client.query(
        `INSERT INTO equipos_tecnologicos (inspecciones_id, idx, no, equipo_tecnologico, ubicacion, cantidad, estado, mantenimiento, observaciones, afectacion_servicio, evidencia_ruta, evidencia_archivo, evidencia_fecha)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [
          pk,
          idx,
          eq.no || "",
          eq.equipoTecnologico || "",
          eq.ubicacion || "",
          eq.cantidad || "",
          eq.estado || "",
          eq.mantenimiento || "",
          eq.observaciones || "",
          eq.afectacionServicio || "",
          eq.evidenciaRuta || "",
          eq.evidenciaArchivo || "",
          eq.evidenciaFecha || null,
        ],
      );
    }

    for (const [idx, b] of (data?.botiquines || []).entries()) {
      const { rows: botRows } = await client.query(
        `INSERT INTO botiquines (inspecciones_id, idx, numero, ubicacion, observacion_general, evidencia_ruta, evidencia_archivo, evidencia_fecha)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
        [
          pk,
          idx,
          b.numero || "",
          b.ubicacion || "",
          b.observacionGeneral || "",
          b.evidenciaRuta || "",
          b.evidenciaArchivo || "",
          b.evidenciaFecha || null,
        ],
      );
      const botiquinId = botRows[0].id;

      for (const [itemIdx, item] of (b.items || []).entries()) {
        await client.query(
          `INSERT INTO botiquin_items (botiquin_id, idx, no, item, cantidad_ideal, cantidad_real, integridad_empaque, fecha_vencimiento, plan_intervencion, fecha_intervencion, cumplimiento, observaciones, afectacion_servicio)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
          [
            botiquinId,
            itemIdx,
            item.no || "",
            item.item || "",
            item.cantidadIdeal || "",
            item.cantidadReal || "",
            item.integridadEmpaque || "",
            item.fechaVencimiento || "",
            item.planIntervencion || "",
            item.fechaIntervencion || "",
            item.cumplimiento || "",
            item.observaciones || "",
            item.afectacionServicio || "",
          ],
        );
      }
    }

    await client.query("COMMIT");

    return {
      inspeccionId: general.inspeccionId || "",
      numInspeccion: Number(inspeccion.inspecciones_id),
      tokens: {
        inspector: inspeccion.token_inspector,
        jefe: inspeccion.token_jefe,
        copasst: inspeccion.token_copasst,
      },
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Recupera una inspección completa desde la base de datos.
 *
 * Obtiene la información general y reconstruye la estructura correspondiente
 * según el tipo de inspección. Para EPP recupera los trabajadores y sus
 * evaluaciones; para SST recupera las cinco secciones y los elementos de
 * cada botiquín.
 *
 * @async
 * @param {string} inspeccionId Identificador único de la inspección.
 * @returns {Promise<Object|null>} Inspección completa con su estructura SST
 * o EPP, o `null` cuando el identificador no existe.
 * @throws {Error} Si falla alguna consulta a la base de datos.
 */

async function obtenerInspeccionCompleta(inspeccionId) {
  const { rows } = await query(
    `SELECT * FROM inspecciones WHERE inspeccion_id = $1`,
    [inspeccionId],
  );

  const inspeccion = rows[0];

  if (!inspeccion) {
    return null;
  }

  const pk = inspeccion.inspecciones_id;

  /* =====================================================
     INSPECCIÓN EPP
  ===================================================== */

  if (inspeccion.tipo_inspeccion === "EPP") {
    const { rows: trabajadoresRows } = await query(
      `
    SELECT *
    FROM evaluaciones_epp
    WHERE inspecciones_id = $1
    ORDER BY idx
    `,
      [pk],
    );

    const trabajadores = await Promise.all(
      trabajadoresRows.map(async (trabajador) => {
        const { rows: evaluacionesRows } = await query(
          `
        SELECT
          ee.id,
          ee.evaluacion_epp_id,
          ee.elemento_epp_id,
          e.nombre AS elemento,
          e.categoria AS categoria,
          ee.condicion,
          ee.uso,
          ee.plan_accion,
          ee.fecha_plan_accion
        FROM detalle_evaluacion_epp ee
        INNER JOIN elementos_epp e
          ON e.id = ee.elemento_epp_id
        WHERE ee.evaluacion_epp_id = $1
        `,
          [trabajador.id],
        );

        return {
          id: trabajador.id,
          idx: trabajador.idx,

          nombre: trabajador.nombre || "",
          codigo: trabajador.codigo || "",
          cargo: trabajador.cargo || "",

          observaciones: trabajador.observaciones || "",

          evidenciaRuta: trabajador.evidencia_ruta || "",
          evidenciaArchivo: trabajador.evidencia_archivo || "",
          evidenciaFecha: trabajador.evidencia_fecha || null,

          elementos: evaluacionesRows.map((evaluacion) => ({
            elementoEppId: evaluacion.elemento_epp_id,

            elemento: evaluacion.elemento || "",

            categoria: evaluacion.categoria || "",

            condicion: evaluacion.condicion || "",

            uso: evaluacion.uso || "",

            planAccion: evaluacion.plan_accion || "",

            fechaPlanAccion: evaluacion.fecha_plan_accion || null,
          })),
        };
      }),
    );

    return {
      inspeccion,
      tipoInspeccion: "EPP",
      trabajadores,
    };
  }

  /* =====================================================
     INSPECCIÓN SST
     Se mantiene el comportamiento actual
  ===================================================== */

  const [extRes, camRes, senRes, eqpRes, botRes] = await Promise.all([
    query(
      `SELECT * FROM extintores
         WHERE inspecciones_id = $1
         ORDER BY idx`,
      [pk],
    ),

    query(
      `SELECT * FROM camillas
         WHERE inspecciones_id = $1
         ORDER BY idx`,
      [pk],
    ),

    query(
      `SELECT * FROM senalizaciones
         WHERE inspecciones_id = $1
         ORDER BY idx`,
      [pk],
    ),

    query(
      `SELECT * FROM equipos_tecnologicos
         WHERE inspecciones_id = $1
         ORDER BY idx`,
      [pk],
    ),

    query(
      `SELECT * FROM botiquines
         WHERE inspecciones_id = $1
         ORDER BY idx`,
      [pk],
    ),
  ]);

  const botiquines = await Promise.all(
    botRes.rows.map(async (b) => {
      const { rows: items } = await query(
        `
        SELECT *
        FROM botiquin_items
        WHERE botiquin_id = $1
        ORDER BY idx
        `,
        [b.id],
      );

      return {
        numero: b.numero || "",
        ubicacion: b.ubicacion || "",
        observacionGeneral: b.observacion_general || "",
        evidenciaRuta: b.evidencia_ruta || "",
        evidenciaArchivo: b.evidencia_archivo || "",
        evidenciaFecha: b.evidencia_fecha || null,

        items: items.map((it) => ({
          no: it.no || "",
          item: it.item || "",
          cantidadIdeal: it.cantidad_ideal || "",
          cantidadReal: it.cantidad_real || "",
          integridadEmpaque: it.integridad_empaque || "",
          fechaVencimiento: it.fecha_vencimiento || "",
          planIntervencion: it.plan_intervencion || "",
          fechaIntervencion: it.fecha_intervencion || "",
          cumplimiento: it.cumplimiento || "",
          observaciones: it.observaciones || "",
          afectacionServicio: it.afectacion_servicio || "",
        })),
      };
    }),
  );

  return {
    inspeccion,

    tipoInspeccion: "SST",

    extintores: extRes.rows.map((e) => ({
      numero: e.numero || "",
      ubicacion: e.ubicacion || "",
      tipo: e.tipo || "",
      capacidad: e.capacidad || "",
      mesRecarga: e.mes_recarga || "",
      anioRecarga: e.ano_recarga || "",
      observaciones: e.observaciones || "",
      evidenciaRuta: e.evidencia_ruta || "",
      evidenciaArchivo: e.evidencia_archivo || "",
      evidenciaFecha: e.evidencia_fecha || null,
      condiciones: e.condiciones || {},
    })),

    camillas: camRes.rows.map((c) => ({
      numero: c.numero || "",
      ubicacion: c.ubicacion || "",
      observaciones: c.observaciones || "",
      afectacionProductividad: c.afectacion_productividad || "",
      evidenciaRuta: c.evidencia_ruta || "",
      evidenciaArchivo: c.evidencia_archivo || "",
      evidenciaFecha: c.evidencia_fecha || null,
      condiciones: c.condiciones || {},
    })),

    senalizaciones: senRes.rows.map((s) => ({
      tipo: s.tipo || "",
      ubicacion: s.ubicacion || "",
      cantidad: s.cantidad || "",
      estado: s.estado || "",
      aseo: s.aseo || "",
      observaciones: s.observaciones || "",
      evidenciaRuta: s.evidencia_ruta || "",
      evidenciaArchivo: s.evidencia_archivo || "",
      evidenciaFecha: s.evidencia_fecha || null,
    })),

    equiposTecnologicos: eqpRes.rows.map((eq) => ({
      no: eq.no || "",
      equipoTecnologico: eq.equipo_tecnologico || "",
      ubicacion: eq.ubicacion || "",
      cantidad: eq.cantidad || "",
      estado: eq.estado || "",
      mantenimiento: eq.mantenimiento || "",
      observaciones: eq.observaciones || "",
      afectacionServicio: eq.afectacion_servicio || "",
      evidenciaRuta: eq.evidencia_ruta || "",
      evidenciaArchivo: eq.evidencia_archivo || "",
      evidenciaFecha: eq.evidencia_fecha || null,
    })),

    botiquines,
  };
}

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

/**
 * Obtiene los enlaces de aprobación pendientes de una inspección.
 *
 * Consulta los tokens de aprobación y genera únicamente los enlaces del jefe
 * y COPASST que todavía no hayan aprobado. También devuelve el token utilizado
 * para acceder a la vista previa del documento.
 *
 * Los enlaces se construyen utilizando la variable de entorno `APP_URL` o
 * `http://localhost:3000` cuando esta no se encuentra configurada.
 *
 * @async
 * @param {string} inspeccionId Identificador único de la inspección.
 * @returns {Promise<Object|null>} Datos de la inspección, token de vista
 * previa y enlaces pendientes, o `null` si la inspección no existe.
 * @throws {Error} Si falla la consulta a la base de datos.
 */

async function obtenerLinksInspeccion(inspeccionId) {
  const { rows } = await query(
    `SELECT
      inspeccion_id,
      inspecciones_id,

      token_inspector,
      token_jefe,
      token_copasst,

      aprobacion_inspector_nombre,
      aprobacion_jefe_nombre,
      aprobacion_copasst_nombre

     FROM inspecciones
     WHERE inspeccion_id = $1`,
    [inspeccionId],
  );

  if (!rows.length) {
    return null;
  }

  const inspeccion = rows[0];

  const baseUrl = process.env.APP_URL || "http://localhost:3000";

  // Enlaces para compartir
  const links = {};

  // El jefe solo aparece si aún no ha aprobado
  if (!inspeccion.aprobacion_jefe_nombre) {
    links.jefe = `${baseUrl}/aprobar/${inspeccion.token_jefe}`;
  }

  // El COPASST solo aparece si aún no ha aprobado
  if (!inspeccion.aprobacion_copasst_nombre) {
    links.copasst = `${baseUrl}/aprobar/${inspeccion.token_copasst}`;
  }

  return {
    inspeccionId: inspeccion.inspeccion_id,
    numInspeccion: inspeccion.inspecciones_id,

    // Token exclusivo para generar el PDF
    previewToken: inspeccion.token_inspector,

    // Enlaces que se muestran al usuario
    links,
  };
}

// Exporta funciones y constantes para uso en el controlador.
module.exports = {
  guardarInspeccionEnDB,
  obtenerInspeccionCompleta,
  obtenerResumenEstadisticas,
  listarInspeccionesConFiltros,
  listarInspeccionesEppConFiltros,
  obtenerLinksInspeccion,
};
