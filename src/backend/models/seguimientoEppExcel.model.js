const { pool } = require("../db/pool");

function construirFiltrosExcelEpp(filtros = {}) {
  const condiciones = [`i.tipo_inspeccion = 'EPP'`];
  const valores = [];

  const agregarParametro = (valor) => {
    valores.push(valor);
    return `$${valores.length}`;
  };

  // =====================================================
  // FECHA DESDE
  // Misma fecha utilizada por Estadísticas EPP
  // =====================================================

  if (filtros.fechaDesde) {
    const parametro = agregarParametro(filtros.fechaDesde);

    condiciones.push(`
      i.created_at::date >= ${parametro}::date
    `);
  }

  // =====================================================
  // FECHA HASTA
  // Misma fecha utilizada por Estadísticas EPP
  // =====================================================

  if (filtros.fechaHasta) {
    const parametro = agregarParametro(filtros.fechaHasta);

    condiciones.push(`
      i.created_at::date <= ${parametro}::date
    `);
  }

  // =====================================================
  // SEDE
  // =====================================================

  if (filtros.sedeOperacion) {
    const parametro = agregarParametro(filtros.sedeOperacion);

    condiciones.push(`
      i.sede_operacion = ${parametro}
    `);
  }

  // =====================================================
  // ESTADO
  // =====================================================

  if (filtros.estado) {
    const parametro = agregarParametro(filtros.estado);

    condiciones.push(`
      i.estado = ${parametro}
    `);
  }

  // =====================================================
  // BÚSQUEDA GENERAL
  // Misma lógica utilizada por Estadísticas EPP
  // =====================================================

  if (filtros.q) {
    const parametro = agregarParametro(`%${filtros.q}%`);

    condiciones.push(`
      (
        i.inspeccion_id ILIKE ${parametro}
        OR i.responsable_inspeccion ILIKE ${parametro}
        OR i.jefe_responsable ILIKE ${parametro}
        OR i.area_trabajo ILIKE ${parametro}
      )
    `);
  }

  return {
    where: condiciones.join("\n AND "),
    valores,
  };
}

async function obtenerInspecciones(filtros = {}) {
  const { where, valores } = construirFiltrosExcelEpp(filtros);

  const result = await pool.query(
    `
    SELECT
      i.inspeccion_id,
      i.fecha,
      i.sede_operacion,
      i.area_trabajo,
      i.estado,

      i.responsable_inspeccion,
      i.cargo_responsable,
      i.jefe_responsable,
      i.cargo_jefe,

      COUNT(DISTINCT t.id)::int AS total_trabajadores,

      COUNT(DISTINCT t.id) FILTER (
        WHERE EXISTS (
          SELECT 1
          FROM detalle_evaluacion_epp dx
          WHERE dx.evaluacion_epp_id = t.id
            AND (
              dx.condicion IN ('R', 'M')
              OR dx.uso IN ('R', 'M')
            )
        )
      )::int AS trabajadores_con_novedad,

      COUNT(d.id)::int AS total_epp_evaluados,

      COUNT(d.id) FILTER (
        WHERE
          d.condicion IN ('R', 'M')
          OR d.uso IN ('R', 'M')
      )::int AS epp_con_novedad,

      i.aprobacion_inspector_nombre,
      i.aprobacion_inspector_at,

      i.aprobacion_jefe_nombre,
      i.aprobacion_jefe_at,

      i.aprobacion_copasst_nombre,
      i.aprobacion_copasst_at

    FROM inspecciones i

    LEFT JOIN evaluaciones_epp t
      ON t.inspecciones_id = i.inspecciones_id

    LEFT JOIN detalle_evaluacion_epp d
      ON d.evaluacion_epp_id = t.id

      

    WHERE ${where}

    GROUP BY
      i.inspecciones_id,
      i.inspeccion_id,
      i.fecha,
      i.sede_operacion,
      i.area_trabajo,
      i.estado,
      i.responsable_inspeccion,
      i.cargo_responsable,
      i.jefe_responsable,
      i.cargo_jefe,
      i.aprobacion_inspector_nombre,
      i.aprobacion_inspector_at,
      i.aprobacion_jefe_nombre,
      i.aprobacion_jefe_at,
      i.aprobacion_copasst_nombre,
      i.aprobacion_copasst_at

    ORDER BY
      i.inspecciones_id ASC
    `,
    valores,
  );

  return result.rows;
}

async function obtenerSeguimientoEpp(filtros = {}) {
  const { where, valores } = construirFiltrosExcelEpp(filtros);

  const result = await pool.query(
    `
    SELECT
      t.id AS evaluacion_epp_id,

      i.inspecciones_id,
      i.inspeccion_id,
      i.fecha,
      i.sede_operacion,
      i.area_trabajo,

      t.codigo AS codigo_trabajador,
      t.nombre AS nombre_trabajador,
      t.cargo,

      COUNT(d.id)::int AS total_epp_evaluados,

      COUNT(d.id) FILTER (
        WHERE
          d.condicion IN ('R', 'M')
          OR d.uso IN ('R', 'M')
      )::int AS epp_con_novedad,

      CASE
        WHEN COUNT(d.id) = 0
          THEN 'SIN EVALUACIÓN'

        WHEN COUNT(d.id) FILTER (
          WHERE
            d.condicion IN ('R', 'M')
            OR d.uso IN ('R', 'M')
        ) > 0
          THEN 'CON NOVEDAD'

        ELSE 'SIN NOVEDAD'
      END AS resultado_general,

      COALESCE(
        STRING_AGG(
          CASE
            WHEN
              d.condicion IN ('R', 'M')
              OR d.uso IN ('R', 'M')
            THEN
              CONCAT(
                e.nombre,
                ' — ',
                CASE
                  WHEN d.condicion IN ('R', 'M')
                    AND d.uso IN ('R', 'M')
                  THEN CONCAT(
                    'Condición: ',
                    d.condicion,
                    ' / Uso: ',
                    d.uso
                  )

                  WHEN d.condicion IN ('R', 'M')
                  THEN CONCAT(
                    'Condición: ',
                    d.condicion
                  )

                  WHEN d.uso IN ('R', 'M')
                  THEN CONCAT(
                    'Uso: ',
                    d.uso
                  )

                  ELSE NULL
                END
              )
          END,
          E'\\n'
          ORDER BY d.id
        ),
        ''
      ) AS hallazgos_epp,

      t.observaciones,
      t.evidencia_url,
      t.evidencia_fecha

      FROM evaluaciones_epp t

      INNER JOIN inspecciones i
        ON i.inspecciones_id = t.inspecciones_id

      LEFT JOIN detalle_evaluacion_epp d
        ON d.evaluacion_epp_id = t.id

      LEFT JOIN elementos_epp e
        ON e.id = d.elemento_epp_id

      WHERE ${where}

    GROUP BY
      t.id,
      t.inspecciones_id,
      t.idx,
      i.inspecciones_id,
      i.inspeccion_id,
      i.fecha,
      i.sede_operacion,
      i.area_trabajo,
      t.codigo,
      t.nombre,
      t.cargo,
      t.observaciones,
      t.evidencia_url,
      t.evidencia_fecha

    ORDER BY
      i.inspecciones_id ASC,
      t.idx ASC
    `,
    valores,
  );

  return result.rows;
}
async function obtenerPlanesAccion(filtros = {}) {
  const { where, valores } = construirFiltrosExcelEpp(filtros);
  const result = await pool.query(
    `
    SELECT
      d.id AS detalle_epp_id,

      i.inspecciones_id,
      i.inspeccion_id,
      i.fecha,
      i.sede_operacion,
      i.area_trabajo,

      t.codigo AS codigo_trabajador,
      t.nombre AS nombre_trabajador,
      t.cargo,

      e.nombre AS elemento_epp,
      e.categoria,

      d.condicion,
      d.uso,

      d.plan_accion,
      d.fecha_plan_accion,
      d.estado_plan,
      d.fecha_cierre,
      d.responsable_cierre

    FROM detalle_evaluacion_epp d

    INNER JOIN evaluaciones_epp t
      ON t.id = d.evaluacion_epp_id

    INNER JOIN inspecciones i
      ON i.inspecciones_id = t.inspecciones_id

    INNER JOIN elementos_epp e
      ON e.id = d.elemento_epp_id

    WHERE
      ${where}
      AND (
        d.condicion IN ('R', 'M')
        OR d.uso IN ('R', 'M')
      )
      AND NULLIF(TRIM(d.plan_accion), '') IS NOT NULL

    ORDER BY
      d.fecha_plan_accion ASC NULLS LAST,
      i.inspecciones_id ASC,
      t.idx ASC,
      e.nombre ASC
  `,
    valores,
  );

  return result.rows;
}

async function cerrarPlanesAccionDesdeExcel(cierres = []) {
  if (!Array.isArray(cierres) || cierres.length === 0) {
    return {
      solicitados: 0,
      actualizados: [],
      yaCumplidos: [],
      noEncontrados: [],
    };
  }

  const client = await pool.connect();

  const actualizados = [];
  const yaCumplidos = [];
  const noEncontrados = [];

  try {
    await client.query("BEGIN");

    for (const cierre of cierres) {
      const detalleEppId = String(cierre.detalleEppId || "").trim();

      const responsableCierre = String(cierre.responsableCierre || "").trim();

      if (!/^\d+$/.test(detalleEppId)) {
        throw new Error(`ID de plan no válido: ${detalleEppId || "vacío"}`);
      }

      if (!responsableCierre) {
        throw new Error(
          `El responsable es obligatorio para el plan ${detalleEppId}`,
        );
      }

      const resultado = await client.query(
        `
        UPDATE detalle_evaluacion_epp d
        SET
          estado_plan = 'CUMPLIDO',
          fecha_cierre = now(),
          responsable_cierre = $2
        WHERE
          d.id = $1
          AND COALESCE(
            UPPER(TRIM(d.estado_plan)),
            'PENDIENTE'
          ) <> 'CUMPLIDO'
          AND EXISTS (
            SELECT 1
            FROM evaluaciones_epp t
            INNER JOIN inspecciones i
              ON i.inspecciones_id = t.inspecciones_id
            WHERE
              t.id = d.evaluacion_epp_id
              AND i.tipo_inspeccion = 'EPP'
              AND i.estado = 'enviada'
          )
        RETURNING
          d.id,
          d.estado_plan,
          d.fecha_cierre,
          d.responsable_cierre
        `,
        [detalleEppId, responsableCierre],
      );

      if (resultado.rowCount > 0) {
        actualizados.push(resultado.rows[0]);
        continue;
      }

      const existente = await client.query(
        `
        SELECT
          d.id,
          d.estado_plan
        FROM detalle_evaluacion_epp d
        INNER JOIN evaluaciones_epp t
          ON t.id = d.evaluacion_epp_id
        INNER JOIN inspecciones i
          ON i.inspecciones_id = t.inspecciones_id
        WHERE
          d.id = $1
          AND i.tipo_inspeccion = 'EPP'
          AND i.estado = 'enviada'
        `,
        [detalleEppId],
      );

      if (existente.rowCount === 0) {
        noEncontrados.push(detalleEppId);
      } else if (
        String(existente.rows[0].estado_plan || "")
          .trim()
          .toUpperCase() === "CUMPLIDO"
      ) {
        yaCumplidos.push(detalleEppId);
      }
    }

    await client.query("COMMIT");

    return {
      solicitados: cierres.length,
      actualizados,
      yaCumplidos,
      noEncontrados,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  construirFiltrosExcelEpp,
  obtenerInspecciones,
  obtenerSeguimientoEpp,
  obtenerPlanesAccion,
  cerrarPlanesAccionDesdeExcel,
};
