const { pool } = require("../db/pool");

const {
  crearWorkbook,
  generarBuffer,
  obtenerOCrearHoja,
  congelarEncabezado,
  configurarColumnas,
  activarFiltro,
  aplicarFormatoFecha,

  aplicarEstiloEncabezado,
  aplicarFormatoCuerpo,
  aplicarColorPorValor,
} = require("./excel.service");

/* =========================================================
   COLORES SEMÁNTICOS
========================================================= */

const COLORES_RESULTADO = {
  "CON NOVEDAD": {
    fondo: "FFFCE8E6",
    texto: "FFB42318",
  },

  "SIN NOVEDAD": {
    fondo: "FFEAF7EE",
    texto: "FF16794B",
  },

  "SIN EVALUACIÓN": {
    fondo: "FFF2F4F7",
    texto: "FF667085",
  },
};

const COLORES_EVALUACION = {
  B: {
    fondo: "FFEAF7EE",
    texto: "FF16794B",
  },

  R: {
    fondo: "FFFFF4E5",
    texto: "FFB54708",
  },

  M: {
    fondo: "FFFCE8E6",
    texto: "FFB42318",
  },

  NA: {
    fondo: "FFF2F4F7",
    texto: "FF667085",
  },
};

/* =========================================================
   CONSULTAS
========================================================= */
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
      d.fecha_plan_accion

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

/* =========================================================
   UTILIDADES
========================================================= */

/* =========================================================
   01 - RESUMEN INSPECCIONES
========================================================= */
function construirHojaInspecciones(workbook, inspecciones) {
  const hoja = obtenerOCrearHoja(workbook, "01 - Inspecciones");

  configurarColumnas(hoja, [
    // =====================================================
    // INSPECCIÓN
    // =====================================================

    {
      header: "Código Inspección",
      key: "inspeccionId",
      width: 24,
    },
    {
      header: "Fecha",
      key: "fecha",
      width: 16,
    },
    {
      header: "Sede",
      key: "sede",
      width: 18,
    },
    {
      header: "Área",
      key: "area",
      width: 22,
    },
    {
      header: "Estado",
      key: "estado",
      width: 22,
    },

    // =====================================================
    // RESPONSABLES
    // =====================================================

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

    // =====================================================
    // RESULTADOS
    // =====================================================

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
      header: "Total EPP Evaluados",
      key: "totalEppEvaluados",
      width: 20,
    },
    {
      header: "EPP con Novedad",
      key: "eppConNovedad",
      width: 18,
    },

    // =====================================================
    // APROBACIONES
    // =====================================================

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
  ]);

  // =====================================================
  // DATOS
  // =====================================================

  inspecciones.forEach((fila) => {
    hoja.addRow({
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

      totalEppEvaluados: Number(fila.total_epp_evaluados || 0),
      eppConNovedad: Number(fila.epp_con_novedad || 0),

      aprobacionInspector: fila.aprobacion_inspector_nombre || "",
      fechaAprobacionInspector: fila.aprobacion_inspector_at || null,

      aprobacionJefe: fila.aprobacion_jefe_nombre || "",
      fechaAprobacionJefe: fila.aprobacion_jefe_at || null,

      aprobacionCopasst: fila.aprobacion_copasst_nombre || "",
      fechaAprobacionCopasst: fila.aprobacion_copasst_at || null,
    });
  });

  const ultimaFila = Math.max(hoja.rowCount, 2);

  // =====================================================
  // FORMATO GENERAL
  // =====================================================

  aplicarEstiloEncabezado(hoja, 1);

  aplicarFormatoCuerpo(hoja, 2, ultimaFila);

  // =====================================================
  // FECHAS
  // =====================================================

  aplicarFormatoFecha(hoja, "B", 2, ultimaFila);

  aplicarFormatoFecha(hoja, "O", 2, ultimaFila);

  aplicarFormatoFecha(hoja, "Q", 2, ultimaFila);

  aplicarFormatoFecha(hoja, "S", 2, ultimaFila);

  // =====================================================
  // NAVEGACIÓN
  // =====================================================

  congelarEncabezado(hoja, 1);

  activarFiltro(hoja, `A1:S${ultimaFila}`);

  return hoja;
}
function construirHojaSeguimientoEpp(workbook, seguimiento) {
  const hoja = obtenerOCrearHoja(workbook, "02 - Seguimiento EPP");

  configurarColumnas(hoja, [
    {
      header: "Código Inspección",
      key: "inspeccionId",
      width: 24,
    },
    {
      header: "Fecha",
      key: "fecha",
      width: 16,
    },
    {
      header: "Sede",
      key: "sede",
      width: 18,
    },
    {
      header: "Área",
      key: "area",
      width: 22,
    },

    {
      header: "Código Trabajador",
      key: "codigo",
      width: 20,
    },
    {
      header: "Nombre Trabajador",
      key: "nombre",
      width: 28,
    },
    {
      header: "Cargo",
      key: "cargo",
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
      header: "Resultado",
      key: "resultado",
      width: 20,
    },

    {
      header: "Hallazgos EPP",
      key: "hallazgos",
      width: 45,
    },

    {
      header: "Observaciones",
      key: "observaciones",
      width: 40,
    },

    {
      header: "Evidencia",
      key: "evidencia",
      width: 22,
    },

    {
      header: "Fecha Evidencia",
      key: "fechaEvidencia",
      width: 20,
    },
  ]);

  seguimiento.forEach((fila) => {
    const row = hoja.addRow({
      inspeccionId: fila.inspeccion_id || "",
      fecha: fila.fecha || "",
      sede: fila.sede_operacion || "",
      area: fila.area_trabajo || "",

      codigo: fila.codigo_trabajador || "",
      nombre: fila.nombre_trabajador || "",
      cargo: fila.cargo || "",

      totalEppEvaluados: Number(fila.total_epp_evaluados || 0),
      eppConNovedad: Number(fila.epp_con_novedad || 0),
      resultado: fila.resultado_general || "",

      hallazgos: fila.hallazgos_epp || "",
      observaciones: fila.observaciones || "",

      evidencia: fila.evidencia_url
        ? {
            text: "Ver evidencia",
            hyperlink: fila.evidencia_url,
          }
        : "",

      fechaEvidencia: fila.evidencia_fecha || null,
    });

    row.alignment = {
      vertical: "top",
      wrapText: true,
    };
  });

  const ultimaFila = hoja.rowCount;
  const ultimaFilaFiltro = Math.max(ultimaFila, 2);

  aplicarEstiloEncabezado(hoja, 1);

  if (ultimaFila >= 2) {
    aplicarFormatoCuerpo(hoja, 2, ultimaFila);

    aplicarFormatoFecha(hoja, "B", 2, ultimaFila);
    aplicarFormatoFecha(hoja, "N", 2, ultimaFila);

    aplicarColorPorValor(hoja, "J", 2, ultimaFila, COLORES_RESULTADO);

    for (let fila = 2; fila <= ultimaFila; fila += 1) {
      hoja.getCell(`K${fila}`).alignment = {
        vertical: "top",
        wrapText: true,
      };

      hoja.getCell(`L${fila}`).alignment = {
        vertical: "top",
        wrapText: true,
      };

      const celdaEvidencia = hoja.getCell(`M${fila}`);

      if (celdaEvidencia.value) {
        celdaEvidencia.font = {
          color: { argb: "FF0563C1" },
          underline: true,
        };
      }
    }
  }

  congelarEncabezado(hoja, 1);

  activarFiltro(hoja, `A1:N${ultimaFilaFiltro}`);

  return hoja;
}

/* =========================================================
   04 - PLANES DE ACCIÓN
========================================================= */
function construirHojaPlanesAccion(workbook, planes) {
  const hoja = obtenerOCrearHoja(workbook, "03 - Planes de Acción");

  configurarColumnas(hoja, [
    // =====================================================
    // INSPECCIÓN
    // =====================================================

    {
      header: "Código Inspección",
      key: "inspeccionId",
      width: 24,
    },
    {
      header: "Fecha Inspección",
      key: "fecha",
      width: 18,
    },
    {
      header: "Sede",
      key: "sede",
      width: 18,
    },
    {
      header: "Área",
      key: "area",
      width: 22,
    },

    // =====================================================
    // TRABAJADOR
    // =====================================================

    {
      header: "Código Trabajador",
      key: "codigo",
      width: 20,
    },
    {
      header: "Nombre Trabajador",
      key: "nombre",
      width: 28,
    },
    {
      header: "Cargo",
      key: "cargo",
      width: 24,
    },

    // =====================================================
    // ELEMENTO EPP
    // =====================================================

    {
      header: "Elemento EPP",
      key: "elemento",
      width: 28,
    },
    {
      header: "Categoría",
      key: "categoria",
      width: 18,
    },

    // =====================================================
    // EVALUACIÓN
    // =====================================================

    {
      header: "Condición",
      key: "condicion",
      width: 14,
    },
    {
      header: "Uso",
      key: "uso",
      width: 12,
    },

    // =====================================================
    // PLAN DE ACCIÓN
    // =====================================================

    {
      header: "Plan de Acción",
      key: "planAccion",
      width: 45,
    },
    {
      header: "Fecha Compromiso",
      key: "fechaCompromiso",
      width: 20,
    },

    // =====================================================
    // CONTROL
    // =====================================================

    {
      header: "Días Restantes",
      key: "diasRestantes",
      width: 18,
    },
    {
      header: "Situación",
      key: "situacion",
      width: 20,
    },
    {
      header: "Cumplido",
      key: "cumplido",
      width: 18,
    },
  ]);

  /* =========================================================
     DATOS
  ========================================================= */

  planes.forEach((fila) => {
    const row = hoja.addRow({
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
      fechaCompromiso: fila.fecha_plan_accion || null,

      // Este valor es manual en el Excel.
      cumplido: "☐ PENDIENTE",
    });

    const numeroFila = row.number;

    /* =======================================================
       DÍAS RESTANTES

       M = Fecha Compromiso
       N = Días Restantes
       P = Cumplido

       Si está cumplido:
       Días Restantes = 0
    ======================================================= */

    row.getCell(14).value = {
      formula:
        `IF(P${numeroFila}="☑ CUMPLIDO",0,` +
        `IF(M${numeroFila}="","",` +
        `INT(M${numeroFila})-TODAY()))`,
    };

    /* =======================================================
       SITUACIÓN

       O = Situación

       Si está cumplido:
       CUMPLIDO

       Si está pendiente:
       - fecha pasada        = VENCIDO
       - faltan <= 3 días    = PRÓXIMO A VENCER
       - faltan > 3 días     = EN PLAZO
    ======================================================= */

    row.getCell(15).value = {
      formula:
        `IF(P${numeroFila}="☑ CUMPLIDO","CUMPLIDO",` +
        `IF(M${numeroFila}="","",` +
        `IF(M${numeroFila}<TODAY(),"VENCIDO",` +
        `IF(M${numeroFila}-TODAY()<=3,` +
        `"PRÓXIMO A VENCER","EN PLAZO"))))`,
    };
  });

  /* =========================================================
     RANGO DINÁMICO
  ========================================================= */

  const ultimaFila = hoja.rowCount;
  const ultimaFilaFiltro = Math.max(ultimaFila, 2);

  /* =========================================================
     FORMATO BASE
  ========================================================= */

  aplicarEstiloEncabezado(hoja, 1);

  if (ultimaFila >= 2) {
    aplicarFormatoCuerpo(hoja, 2, ultimaFila);

    /* =======================================================
       FECHAS
    ======================================================= */

    // B = Fecha Inspección
    aplicarFormatoFecha(hoja, "B", 2, ultimaFila);

    // M = Fecha Compromiso
    aplicarFormatoFecha(hoja, "M", 2, ultimaFila);

    /* =======================================================
       EVALUACIÓN EPP
    ======================================================= */

    // J = Condición
    aplicarColorPorValor(hoja, "J", 2, ultimaFila, COLORES_EVALUACION);

    // K = Uso
    aplicarColorPorValor(hoja, "K", 2, ultimaFila, COLORES_EVALUACION);

    /* =======================================================
       CUMPLIMIENTO MANUAL
    ======================================================= */

    for (let fila = 2; fila <= ultimaFila; fila += 1) {
      const celdaCumplido = hoja.getCell(`P${fila}`);

      celdaCumplido.value = "☐ PENDIENTE";

      celdaCumplido.dataValidation = {
        type: "list",
        allowBlank: false,
        formulae: ['"☐ PENDIENTE,☑ CUMPLIDO"'],
        showErrorMessage: true,
        errorStyle: "error",
        errorTitle: "Valor no válido",
        error: "Seleccione PENDIENTE o CUMPLIDO.",
      };

      celdaCumplido.alignment = {
        horizontal: "center",
        vertical: "middle",
      };
    }

    /* =======================================================
       COLOR SITUACIÓN
       O = Situación
    ======================================================= */

    hoja.addConditionalFormatting({
      ref: `O2:O${ultimaFila}`,
      rules: [
        // ---------------------------------------------------
        // VENCIDO
        // ---------------------------------------------------

        {
          type: "cellIs",
          operator: "equal",
          formulae: ['"VENCIDO"'],
          style: {
            fill: {
              type: "pattern",
              pattern: "solid",
              bgColor: {
                argb: "FFFCE8E6",
              },
            },
            font: {
              bold: true,
              color: {
                argb: "FFB42318",
              },
            },
          },
        },

        // ---------------------------------------------------
        // PRÓXIMO A VENCER
        // ---------------------------------------------------

        {
          type: "cellIs",
          operator: "equal",
          formulae: ['"PRÓXIMO A VENCER"'],
          style: {
            fill: {
              type: "pattern",
              pattern: "solid",
              bgColor: {
                argb: "FFFFF4E5",
              },
            },
            font: {
              bold: true,
              color: {
                argb: "FFB54708",
              },
            },
          },
        },

        // ---------------------------------------------------
        // EN PLAZO
        // ---------------------------------------------------

        {
          type: "cellIs",
          operator: "equal",
          formulae: ['"EN PLAZO"'],
          style: {
            fill: {
              type: "pattern",
              pattern: "solid",
              bgColor: {
                argb: "FFEAF7EE",
              },
            },
            font: {
              bold: true,
              color: {
                argb: "FF16794B",
              },
            },
          },
        },

        // ---------------------------------------------------
        // CUMPLIDO
        // ---------------------------------------------------

        {
          type: "cellIs",
          operator: "equal",
          formulae: ['"CUMPLIDO"'],
          style: {
            fill: {
              type: "pattern",
              pattern: "solid",
              bgColor: {
                argb: "FFEAF7EE",
              },
            },
            font: {
              bold: true,
              color: {
                argb: "FF16794B",
              },
            },
          },
        },
      ],
    });

    /* =======================================================
       COLOR CUMPLIMIENTO MANUAL
       P = Cumplido
    ======================================================= */

    hoja.addConditionalFormatting({
      ref: `P2:P${ultimaFila}`,
      rules: [
        // ---------------------------------------------------
        // CUMPLIDO
        // ---------------------------------------------------

        {
          type: "cellIs",
          operator: "equal",
          formulae: ['"☑ CUMPLIDO"'],
          style: {
            fill: {
              type: "pattern",
              pattern: "solid",
              bgColor: {
                argb: "FFEAF7EE",
              },
            },
            font: {
              bold: true,
              color: {
                argb: "FF16794B",
              },
            },
          },
        },

        // ---------------------------------------------------
        // PENDIENTE
        // ---------------------------------------------------

        {
          type: "cellIs",
          operator: "equal",
          formulae: ['"☐ PENDIENTE"'],
          style: {
            fill: {
              type: "pattern",
              pattern: "solid",
              bgColor: {
                argb: "FFFFF4E5",
              },
            },
            font: {
              bold: true,
              color: {
                argb: "FFB54708",
              },
            },
          },
        },
      ],
    });
  }

  /* =========================================================
     NAVEGACIÓN
  ========================================================= */

  congelarEncabezado(hoja, 1);

  activarFiltro(hoja, `A1:P${ultimaFilaFiltro}`);

  return hoja;
}
/* =========================================================
   GENERADOR
========================================================= */
async function generarExcelSeguimientoEpp(filtros = {}) {
  const [inspecciones, seguimiento, planes] = await Promise.all([
    obtenerInspecciones(filtros),
    obtenerSeguimientoEpp(filtros),
    obtenerPlanesAccion(filtros),
  ]);

  const workbook = crearWorkbook();

  workbook.creator = "Sistema de Inspecciones SST";
  workbook.company = "CARGOBAN";
  workbook.created = new Date();
  workbook.modified = new Date();

  construirHojaInspecciones(workbook, inspecciones);
  construirHojaSeguimientoEpp(workbook, seguimiento);
  construirHojaPlanesAccion(workbook, planes);

  return generarBuffer(workbook);
}

module.exports = {
  generarExcelSeguimientoEpp,
};
