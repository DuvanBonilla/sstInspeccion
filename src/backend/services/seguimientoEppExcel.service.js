const { pool } = require("../db/pool");

const {
  crearWorkbook,
  generarBuffer,
  obtenerOCrearHoja,
  congelarEncabezado,
  configurarColumnas,
  activarFiltro,
  aplicarFormatoFecha,
} = require("./excel.service");

/* =========================================================
   CONSULTAS
========================================================= */
async function obtenerResumenInspecciones() {
  const result = await pool.query(`
    SELECT
      i.id AS inspeccion_pk,
      i.num_inspeccion,
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
          FROM detalle_trabajador_epp dx
          WHERE dx.trabajador_epp_id = t.id
            AND (
              dx.condicion IN ('R', 'M')
              OR dx.uso IN ('R', 'M')
            )
        )
      )::int AS trabajadores_con_novedad,

      (
        COUNT(DISTINCT t.id)
        -
        COUNT(DISTINCT t.id) FILTER (
          WHERE EXISTS (
            SELECT 1
            FROM detalle_trabajador_epp dx
            WHERE dx.trabajador_epp_id = t.id
              AND (
                dx.condicion IN ('R', 'M')
                OR dx.uso IN ('R', 'M')
              )
          )
        )
      )::int AS trabajadores_sin_novedad,

      COUNT(d.id)::int AS total_epp_evaluados,

      COUNT(d.id) FILTER (
        WHERE
          d.condicion IN ('R', 'M')
          OR d.uso IN ('R', 'M')
      )::int AS epp_con_novedad,

      COUNT(d.id) FILTER (
        WHERE NOT (
          d.condicion IN ('R', 'M')
          OR d.uso IN ('R', 'M')
        )
      )::int AS epp_sin_novedad,

      i.aprobacion_inspector_nombre,
      i.aprobacion_inspector_at,

      i.aprobacion_jefe_nombre,
      i.aprobacion_jefe_at,

      i.aprobacion_copasst_nombre,
      i.aprobacion_copasst_at,

      i.pdf_url

    FROM inspecciones i

    LEFT JOIN trabajadores_epp t
      ON t.inspeccion_pk = i.id

    LEFT JOIN detalle_trabajador_epp d
      ON d.trabajador_epp_id = t.id

    WHERE i.tipo_inspeccion = 'EPP'

    GROUP BY
      i.id,
      i.num_inspeccion,
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
      i.aprobacion_copasst_at,
      i.pdf_url

    ORDER BY
      i.num_inspeccion ASC
  `);

  return result.rows;
}

/* =========================================================
   UTILIDADES
========================================================= */

/* =========================================================
   01 - RESUMEN INSPECCIONES
========================================================= */
function construirHojaResumenInspecciones(workbook, inspecciones) {
  const hoja = obtenerOCrearHoja(workbook, "01 - Resumen Inspecciones");

  configurarColumnas(hoja, [
    // IDENTIFICACIÓN
    { header: "N° Inspección", key: "numInspeccion", width: 14 },
    { header: "Código Inspección", key: "inspeccionId", width: 24 },
    { header: "Fecha", key: "fecha", width: 16 },
    { header: "Sede", key: "sede", width: 18 },
    { header: "Área", key: "area", width: 22 },
    { header: "Estado", key: "estado", width: 22 },

    // RESPONSABLES
    {
      header: "Responsable Inspección",
      key: "responsableInspeccion",
      width: 25,
    },
    {
      header: "Cargo Responsable",
      key: "cargoResponsable",
      width: 22,
    },
    {
      header: "Jefe Responsable",
      key: "jefeResponsable",
      width: 25,
    },
    {
      header: "Cargo Jefe",
      key: "cargoJefe",
      width: 22,
    },

    // RESULTADOS
    {
      header: "Total Trabajadores",
      key: "totalTrabajadores",
      width: 18,
    },
    {
      header: "Trabajadores con Novedad",
      key: "trabajadoresConNovedad",
      width: 24,
    },
    {
      header: "Trabajadores sin Novedad",
      key: "trabajadoresSinNovedad",
      width: 24,
    },
    {
      header: "Total EPP Evaluados",
      key: "totalEppEvaluados",
      width: 20,
    },
    {
      header: "EPP con Novedad",
      key: "eppConNovedad",
      width: 18,
    },
    {
      header: "EPP sin Novedad",
      key: "eppSinNovedad",
      width: 18,
    },

    // APROBACIONES
    {
      header: "Aprobación Inspector",
      key: "aprobacionInspector",
      width: 25,
    },
    {
      header: "Fecha Aprobación Inspector",
      key: "fechaAprobacionInspector",
      width: 24,
    },
    {
      header: "Aprobación Jefe",
      key: "aprobacionJefe",
      width: 25,
    },
    {
      header: "Fecha Aprobación Jefe",
      key: "fechaAprobacionJefe",
      width: 22,
    },
    {
      header: "Aprobación COPASST",
      key: "aprobacionCopasst",
      width: 25,
    },
    {
      header: "Fecha Aprobación COPASST",
      key: "fechaAprobacionCopasst",
      width: 25,
    },
    {
      header: "PDF",
      key: "pdf",
      width: 40,
    },
  ]);

  inspecciones.forEach((fila) => {
    hoja.addRow({
      numInspeccion: Number(fila.num_inspeccion),
      inspeccionId: fila.inspeccion_id || "",
      fecha: fila.fecha || "",
      sede: fila.sede_operacion || "",
      area: fila.area_trabajo || "",
      estado: fila.estado || "",

      responsableInspeccion: fila.responsable_inspeccion || "",
      cargoResponsable: fila.cargo_responsable || "",
      jefeResponsable: fila.jefe_responsable || "",
      cargoJefe: fila.cargo_jefe || "",

      totalTrabajadores: Number(fila.total_trabajadores || 0),
      trabajadoresConNovedad: Number(fila.trabajadores_con_novedad || 0),
      trabajadoresSinNovedad: Number(fila.trabajadores_sin_novedad || 0),

      totalEppEvaluados: Number(fila.total_epp_evaluados || 0),
      eppConNovedad: Number(fila.epp_con_novedad || 0),
      eppSinNovedad: Number(fila.epp_sin_novedad || 0),

      aprobacionInspector: fila.aprobacion_inspector_nombre || "",
      fechaAprobacionInspector: fila.aprobacion_inspector_at || null,

      aprobacionJefe: fila.aprobacion_jefe_nombre || "",
      fechaAprobacionJefe: fila.aprobacion_jefe_at || null,

      aprobacionCopasst: fila.aprobacion_copasst_nombre || "",
      fechaAprobacionCopasst: fila.aprobacion_copasst_at || null,

      pdf: fila.pdf_url || "",
    });
  });

  const ultimaFila = Math.max(hoja.rowCount, 2);

  congelarEncabezado(hoja, 1);

  activarFiltro(hoja, `A1:W${ultimaFila}`);

  aplicarFormatoFecha(hoja, "R", 2, ultimaFila);
  aplicarFormatoFecha(hoja, "T", 2, ultimaFila);
  aplicarFormatoFecha(hoja, "V", 2, ultimaFila);

  return hoja;
}

/* =========================================================
   02 - TRABAJADORES
========================================================= */
async function obtenerTrabajadores() {
  const result = await pool.query(`
    SELECT
      t.id AS trabajador_epp_id,

      i.num_inspeccion,
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

      COUNT(d.id) FILTER (
        WHERE NOT (
          d.condicion IN ('R', 'M')
          OR d.uso IN ('R', 'M')
        )
      )::int AS epp_sin_novedad,

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

      t.observaciones,
      t.evidencia_ruta,
      t.evidencia_fecha

    FROM trabajadores_epp t

    INNER JOIN inspecciones i
      ON i.id = t.inspeccion_pk

    LEFT JOIN detalle_trabajador_epp d
      ON d.trabajador_epp_id = t.id

    WHERE i.tipo_inspeccion = 'EPP'

    GROUP BY
      t.id,
      t.idx,
      i.id,
      i.num_inspeccion,
      i.inspeccion_id,
      i.fecha,
      i.sede_operacion,
      i.area_trabajo,
      t.codigo,
      t.nombre,
      t.cargo,
      t.observaciones,
      t.evidencia_ruta,
      t.evidencia_fecha

    ORDER BY
      i.num_inspeccion ASC,
      t.idx ASC
  `);

  return result.rows;
}

function construirHojaTrabajadores(workbook, trabajadores) {
  const hoja = obtenerOCrearHoja(workbook, "02 - Trabajadores");

  configurarColumnas(hoja, [
    // INSPECCIÓN
    { header: "N° Inspección", key: "numInspeccion", width: 14 },
    { header: "Código Inspección", key: "inspeccionId", width: 24 },
    { header: "Fecha", key: "fecha", width: 16 },
    { header: "Sede", key: "sede", width: 18 },
    { header: "Área", key: "area", width: 22 },

    // TRABAJADOR
    { header: "Código Trabajador", key: "codigo", width: 20 },
    { header: "Nombre Trabajador", key: "nombre", width: 28 },
    { header: "Cargo", key: "cargo", width: 24 },

    // RESULTADOS
    {
      header: "Total EPP Evaluados",
      key: "totalEppEvaluados",
      width: 20,
    },
    {
      header: "EPP con Novedad",
      key: "eppConNovedad",
      width: 18,
    },
    {
      header: "EPP sin Novedad",
      key: "eppSinNovedad",
      width: 18,
    },
    {
      header: "Resultado General",
      key: "resultadoGeneral",
      width: 20,
    },

    // INFORMACIÓN ADICIONAL
    {
      header: "Observaciones",
      key: "observaciones",
      width: 40,
    },
    {
      header: "Evidencia",
      key: "evidencia",
      width: 45,
    },
    {
      header: "Fecha Evidencia",
      key: "fechaEvidencia",
      width: 20,
    },
  ]);

  trabajadores.forEach((fila) => {
    hoja.addRow({
      numInspeccion: Number(fila.num_inspeccion),
      inspeccionId: fila.inspeccion_id || "",
      fecha: fila.fecha || "",
      sede: fila.sede_operacion || "",
      area: fila.area_trabajo || "",

      codigo: fila.codigo_trabajador || "",
      nombre: fila.nombre_trabajador || "",
      cargo: fila.cargo || "",

      totalEppEvaluados: Number(fila.total_epp_evaluados || 0),
      eppConNovedad: Number(fila.epp_con_novedad || 0),
      eppSinNovedad: Number(fila.epp_sin_novedad || 0),
      resultadoGeneral: fila.resultado_general || "",

      observaciones: fila.observaciones || "",
      evidencia: fila.evidencia_ruta || "",
      fechaEvidencia: fila.evidencia_fecha || null,
    });
  });

  const ultimaFila = Math.max(hoja.rowCount, 2);

  congelarEncabezado(hoja, 1);

  activarFiltro(hoja, `A1:O${ultimaFila}`);

  aplicarFormatoFecha(hoja, "O", 2, ultimaFila);

  return hoja;
}
/* =========================================================
   03 - DETALLE EPP
========================================================= */
async function obtenerDetalleEpp() {
  const result = await pool.query(`
    SELECT
      d.id AS detalle_epp_id,

      i.num_inspeccion,
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

      CASE
        WHEN
          d.condicion IN ('R', 'M')
          OR d.uso IN ('R', 'M')
        THEN 'CON NOVEDAD'

        ELSE 'SIN NOVEDAD'
      END AS resultado,

      d.plan_accion,
      d.fecha_plan_accion,

      t.observaciones AS observaciones_trabajador

    FROM detalle_trabajador_epp d

    INNER JOIN trabajadores_epp t
      ON t.id = d.trabajador_epp_id

    INNER JOIN inspecciones i
      ON i.id = t.inspeccion_pk

    INNER JOIN elementos_epp e
      ON e.id = d.elemento_epp_id

    WHERE i.tipo_inspeccion = 'EPP'

    ORDER BY
      i.num_inspeccion ASC,
      t.idx ASC,
      e.nombre ASC
  `);

  return result.rows;
}

function construirHojaDetalleEpp(workbook, detalle) {
  const hoja = obtenerOCrearHoja(workbook, "03 - Detalle EPP");

  configurarColumnas(hoja, [
    // INSPECCIÓN
    { header: "N° Inspección", key: "numInspeccion", width: 14 },
    { header: "Código Inspección", key: "inspeccionId", width: 24 },
    { header: "Fecha", key: "fecha", width: 16 },
    { header: "Sede", key: "sede", width: 18 },
    { header: "Área", key: "area", width: 22 },

    // TRABAJADOR
    { header: "Código Trabajador", key: "codigo", width: 20 },
    { header: "Nombre Trabajador", key: "nombre", width: 28 },
    { header: "Cargo", key: "cargo", width: 24 },

    // ELEMENTO EPP
    { header: "Elemento EPP", key: "elemento", width: 28 },
    { header: "Categoría", key: "categoria", width: 18 },

    // EVALUACIÓN
    { header: "Condición", key: "condicion", width: 14 },
    { header: "Uso", key: "uso", width: 12 },
    { header: "Resultado", key: "resultado", width: 20 },

    // PLAN DE ACCIÓN
    { header: "Plan de Acción", key: "planAccion", width: 40 },
    { header: "Fecha Límite", key: "fechaLimite", width: 18 },

    // INFORMACIÓN ADICIONAL
    {
      header: "Observaciones Trabajador",
      key: "observaciones",
      width: 40,
    },
  ]);

  detalle.forEach((fila) => {
    hoja.addRow({
      numInspeccion: Number(fila.num_inspeccion),
      inspeccionId: fila.inspeccion_id || "",
      fecha: fila.fecha || "",
      sede: fila.sede_operacion || "",
      area: fila.area_trabajo || "",

      codigo: fila.codigo_trabajador || "",
      nombre: fila.nombre_trabajador || "",
      cargo: fila.cargo || "",

      elemento: fila.elemento_epp || "",
      categoria: fila.categoria || "",

      condicion: fila.condicion || "",
      uso: fila.uso || "",
      resultado: fila.resultado || "",

      planAccion: fila.plan_accion || "",
      fechaLimite: fila.fecha_plan_accion || null,

      observaciones: fila.observaciones_trabajador || "",
    });
  });

  const ultimaFila = Math.max(hoja.rowCount, 2);

  congelarEncabezado(hoja, 1);

  activarFiltro(hoja, `A1:P${ultimaFila}`);

  aplicarFormatoFecha(hoja, "O", 2, ultimaFila);

  return hoja;
}

/* =========================================================
   04 - PLANES DE ACCIÓN
========================================================= */
async function obtenerPlanesAccion() {
  const result = await pool.query(`
    SELECT
      d.id AS detalle_epp_id,

      i.num_inspeccion,
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
      d.fecha_plan_accion

    FROM detalle_trabajador_epp d

    INNER JOIN trabajadores_epp t
      ON t.id = d.trabajador_epp_id

    INNER JOIN inspecciones i
      ON i.id = t.inspeccion_pk

    INNER JOIN elementos_epp e
      ON e.id = d.elemento_epp_id

    WHERE
      i.tipo_inspeccion = 'EPP'
      AND (
        d.condicion IN ('R', 'M')
        OR d.uso IN ('R', 'M')
      )
      AND NULLIF(TRIM(d.plan_accion), '') IS NOT NULL

    ORDER BY
      d.fecha_plan_accion ASC NULLS LAST,
      i.num_inspeccion ASC,
      t.idx ASC,
      e.nombre ASC
  `);

  return result.rows;
}

function construirHojaPlanesAccion(workbook, planes) {
  const hoja = obtenerOCrearHoja(workbook, "04 - Planes de Acción");

  configurarColumnas(hoja, [
    // INSPECCIÓN
    { header: "N° Inspección", key: "numInspeccion", width: 14 },
    { header: "Código Inspección", key: "inspeccionId", width: 24 },
    { header: "Fecha Inspección", key: "fecha", width: 18 },
    { header: "Sede", key: "sede", width: 18 },
    { header: "Área", key: "area", width: 22 },

    // TRABAJADOR
    { header: "Código Trabajador", key: "codigo", width: 20 },
    { header: "Nombre Trabajador", key: "nombre", width: 28 },
    { header: "Cargo", key: "cargo", width: 24 },

    // ELEMENTO
    { header: "Elemento EPP", key: "elemento", width: 28 },
    { header: "Categoría", key: "categoria", width: 18 },

    // EVALUACIÓN
    { header: "Condición", key: "condicion", width: 14 },
    { header: "Uso", key: "uso", width: 12 },

    // PLAN
    { header: "Plan de Acción", key: "planAccion", width: 40 },
    { header: "Fecha Límite", key: "fechaLimite", width: 18 },

    // CONTROL
    { header: "Días Restantes", key: "diasRestantes", width: 18 },
    { header: "Situación", key: "situacion", width: 20 },
  ]);

  planes.forEach((fila) => {
    const row = hoja.addRow({
      numInspeccion: Number(fila.num_inspeccion),
      inspeccionId: fila.inspeccion_id || "",
      fecha: fila.fecha || "",
      sede: fila.sede_operacion || "",
      area: fila.area_trabajo || "",

      codigo: fila.codigo_trabajador || "",
      nombre: fila.nombre_trabajador || "",
      cargo: fila.cargo || "",

      elemento: fila.elemento_epp || "",
      categoria: fila.categoria || "",

      condicion: fila.condicion || "",
      uso: fila.uso || "",

      planAccion: fila.plan_accion || "",
      fechaLimite: fila.fecha_plan_accion || null,
    });

    const numeroFila = row.number;

    row.getCell(15).value = {
      formula: `IF(N${numeroFila}="","",INT(N${numeroFila})-TODAY())`,
    };

    row.getCell(16).value = {
      formula:
        `IF(N${numeroFila}="","",` +
        `IF(N${numeroFila}<TODAY(),"VENCIDO",` +
        `IF(N${numeroFila}-TODAY()<=3,"PRÓXIMO A VENCER","EN PLAZO")))`,
    };
  });

  const ultimaFila = Math.max(hoja.rowCount, 2);

  aplicarFormatoFecha(hoja, "N", 2, ultimaFila);

  congelarEncabezado(hoja, 1);

  activarFiltro(hoja, `A1:P${ultimaFila}`);

  return hoja;
}
/* =========================================================
   GENERADOR
========================================================= */

async function generarExcelSeguimientoEpp() {
  const [inspecciones, trabajadores, detalle, planes] = await Promise.all([
    obtenerResumenInspecciones(),
    obtenerTrabajadores(),
    obtenerDetalleEpp(),
    obtenerPlanesAccion(),
  ]);

  const workbook = crearWorkbook();

  workbook.creator = "Sistema de Inspecciones SST";
  workbook.company = "CARGOBAN";
  workbook.created = new Date();
  workbook.modified = new Date();

  construirHojaResumenInspecciones(workbook, inspecciones);
  construirHojaTrabajadores(workbook, trabajadores);
  construirHojaDetalleEpp(workbook, detalle);
  construirHojaPlanesAccion(workbook, planes);

  return generarBuffer(workbook);
}

module.exports = {
  generarExcelSeguimientoEpp,
};
