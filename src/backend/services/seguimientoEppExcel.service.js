const { pool } = require("../db/pool");

const {
  crearWorkbook,
  generarBuffer,
  obtenerOCrearHoja,
  ocultarHoja,
  congelarEncabezado,
  configurarColumnas,
  activarFiltro,
  aplicarListaDesplegable,
  aplicarFormatoFecha,
} = require("./excel.service");

/* =========================================================
   CONFIGURACIÓN
========================================================= */

const MAX_FILAS_SEGUIMIENTO = 1000;

const ESTADOS_GESTION = ["PENDIENTE", "EN GESTIÓN", "CERRADO"];

/* =========================================================
   CONSULTA DE DATOS
========================================================= */

async function obtenerDatosEpp() {
  const [seguimientoResult, trabajadoresResult, inspeccionesResult] =
    await Promise.all([
      /* ---------------------------------------------------
         SEGUIMIENTO
         Solo evaluaciones con R o M
      --------------------------------------------------- */

      pool.query(`
          SELECT
            e.id AS evaluacion_id,
            t.id AS trabajador_epp_id,
            i.id AS inspeccion_pk,

            i.num_inspeccion,
            i.inspeccion_id,
            i.fecha,
            i.sede_operacion,
            i.area_trabajo,
            i.responsable_inspeccion,

            t.codigo AS codigo_trabajador,
            t.nombre AS nombre_trabajador,
            t.cargo,

            e.elemento_epp_id,
            ep.nombre AS elemento,
            ep.categoria AS categoria,

            e.condicion,
            e.uso,

            e.plan_accion,
            e.fecha_plan_accion,

            t.observaciones

          FROM inspecciones i

          INNER JOIN trabajadores_epp t
            ON t.inspeccion_pk = i.id

          INNER JOIN evaluaciones_epp e
            ON e.trabajador_epp_id = t.id

          INNER JOIN elementos_epp ep
            ON ep.id = e.elemento_epp_id

          WHERE
            i.tipo_inspeccion = 'EPP'
            AND (
              e.condicion IN ('R', 'M')
              OR e.uso IN ('R', 'M')
            )

          ORDER BY
            i.fecha ASC,
            i.num_inspeccion ASC,
            t.idx ASC,
            ep.nombre ASC
`),

      /* ---------------------------------------------------
         TRABAJADORES
      --------------------------------------------------- */

      pool.query(`
        SELECT
          t.id AS trabajador_epp_id,
          i.id AS inspeccion_pk,

          i.num_inspeccion,
          i.inspeccion_id,
          i.fecha,
          i.sede_operacion,
          i.area_trabajo,

          t.codigo AS codigo_trabajador,
          t.nombre AS nombre_trabajador,
          t.cargo,

          t.observaciones,

          CASE
            WHEN EXISTS (
              SELECT 1
              FROM evaluaciones_epp e
              WHERE
                e.trabajador_epp_id = t.id
                AND (
                  e.condicion IN ('R', 'M')
                  OR e.uso IN ('R', 'M')
                )
            )
            THEN 'CON NOVEDAD'
            ELSE 'CONFORME'
          END AS resultado

        FROM inspecciones i

        INNER JOIN trabajadores_epp t
          ON t.inspeccion_pk = i.id

        WHERE i.tipo_inspeccion = 'EPP'

        ORDER BY
          i.fecha ASC,
          i.num_inspeccion ASC,
          t.idx ASC
      `),

      /* ---------------------------------------------------
         INSPECCIONES
      --------------------------------------------------- */

      pool.query(`
        SELECT
          i.id AS inspeccion_pk,
          i.num_inspeccion,
          i.inspeccion_id,
          i.fecha,
          i.sede_operacion,
          i.area_trabajo,
          i.responsable_inspeccion,

          COUNT(DISTINCT t.id)::int AS total_trabajadores,

          COUNT(DISTINCT t.id) FILTER (
            WHERE EXISTS (
              SELECT 1
              FROM evaluaciones_epp e
              WHERE
                e.trabajador_epp_id = t.id
                AND (
                  e.condicion IN ('R', 'M')
                  OR e.uso IN ('R', 'M')
                )
            )
          )::int AS con_novedad

        FROM inspecciones i

        LEFT JOIN trabajadores_epp t
          ON t.inspeccion_pk = i.id

        WHERE i.tipo_inspeccion = 'EPP'

        GROUP BY
          i.id,
          i.num_inspeccion,
          i.inspeccion_id,
          i.fecha,
          i.sede_operacion,
          i.area_trabajo,
          i.responsable_inspeccion

        ORDER BY
          i.fecha ASC,
          i.num_inspeccion ASC
      `),
    ]);

  return {
    seguimiento: seguimientoResult.rows,
    trabajadores: trabajadoresResult.rows,
    inspecciones: inspeccionesResult.rows,
  };
}

/* =========================================================
   UTILIDADES
========================================================= */

/* =========================================================
   UTILIDADES
========================================================= */

const COLOR_HEADER = "1F4E78";
const COLOR_SISTEMA = "D9EAF7";
const COLOR_SEGUIMIENTO = "FFF2CC";
const COLOR_CONTROL = "E2F0D9";

function convertirFecha(valor) {
  if (!valor) {
    return null;
  }

  if (valor instanceof Date) {
    return valor;
  }

  const fecha = new Date(valor);

  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

function aplicarEstiloEncabezado(fila) {
  fila.font = {
    bold: true,
    color: {
      argb: "FFFFFFFF",
    },
  };

  fila.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: {
      argb: COLOR_HEADER,
    },
  };

  fila.alignment = {
    vertical: "middle",
    horizontal: "center",
    wrapText: true,
  };

  fila.height = 32;
}

function aplicarColorColumnas(
  hoja,
  filaInicio,
  filaFin,
  columnaInicio,
  columnaFin,
  color,
) {
  if (filaFin < filaInicio) {
    return;
  }

  for (let fila = filaInicio; fila <= filaFin; fila += 1) {
    for (let columna = columnaInicio; columna <= columnaFin; columna += 1) {
      hoja.getCell(fila, columna).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
          argb: color,
        },
      };
    }
  }
}

function aplicarFormatoSituacion(hoja) {
  hoja.addConditionalFormatting({
    ref: `X2:X${MAX_FILAS_SEGUIMIENTO}`,
    rules: [
      {
        type: "containsText",
        operator: "containsText",
        text: "VENCIDO",
        style: {
          fill: {
            type: "pattern",
            pattern: "solid",
            bgColor: {
              argb: "F4CCCC",
            },
          },
          font: {
            color: {
              argb: "9C0006",
            },
            bold: true,
          },
        },
      },
      {
        type: "containsText",
        operator: "containsText",
        text: "PRÓXIMO A VENCER",
        style: {
          fill: {
            type: "pattern",
            pattern: "solid",
            bgColor: {
              argb: "FCE5CD",
            },
          },
          font: {
            bold: true,
          },
        },
      },
      {
        type: "containsText",
        operator: "containsText",
        text: "EN PLAZO",
        style: {
          fill: {
            type: "pattern",
            pattern: "solid",
            bgColor: {
              argb: "D9EAD3",
            },
          },
        },
      },
      {
        type: "containsText",
        operator: "containsText",
        text: "CERRADO",
        style: {
          fill: {
            type: "pattern",
            pattern: "solid",
            bgColor: {
              argb: "D9EAD3",
            },
          },
          font: {
            bold: true,
          },
        },
      },
    ],
  });
}

function aplicarFormatoEvaluaciones(hoja) {
  hoja.addConditionalFormatting({
    ref: `L2:M${MAX_FILAS_SEGUIMIENTO}`,
    rules: [
      {
        type: "containsText",
        operator: "containsText",
        text: "M",
        style: {
          fill: {
            type: "pattern",
            pattern: "solid",
            bgColor: {
              argb: "F4CCCC",
            },
          },
          font: {
            bold: true,
          },
        },
      },
      {
        type: "containsText",
        operator: "containsText",
        text: "R",
        style: {
          fill: {
            type: "pattern",
            pattern: "solid",
            bgColor: {
              argb: "FCE5CD",
            },
          },
          font: {
            bold: true,
          },
        },
      },
    ],
  });
}

/* =========================================================
   HOJA LISTAS
========================================================= */

function construirHojaListas(workbook) {
  const hoja = obtenerOCrearHoja(workbook, "Listas");

  hoja.getCell("A1").value = "Estados Gestión";

  ESTADOS_GESTION.forEach((estado, index) => {
    hoja.getCell(`A${index + 2}`).value = estado;
  });

  ocultarHoja(hoja);

  return hoja;
}

/* =========================================================
   HOJA SEGUIMIENTO EPP
========================================================= */

function construirHojaSeguimiento(workbook, seguimiento) {
  const hoja = obtenerOCrearHoja(workbook, "Seguimiento EPP");

  configurarColumnas(hoja, [
    { header: "ID Seguimiento", key: "idSeguimiento", width: 25 },
    { header: "N° Inspección", key: "numInspeccion", width: 14 },
    { header: "Código Inspección", key: "inspeccionId", width: 25 },
    { header: "Fecha Inspección", key: "fecha", width: 16 },
    { header: "Sede", key: "sede", width: 18 },
    { header: "Área", key: "area", width: 22 },
    {
      header: "Responsable Inspección",
      key: "responsableInspeccion",
      width: 25,
    },
    { header: "Código Trabajador", key: "codigo", width: 18 },
    { header: "Nombre Trabajador", key: "nombre", width: 25 },
    { header: "Cargo", key: "cargo", width: 22 },
    { header: "Elemento EPP", key: "elemento", width: 24 },
    { header: "Condición", key: "condicion", width: 12 },
    { header: "Uso", key: "uso", width: 10 },
    { header: "Plan de Acción", key: "planAccion", width: 40 },
    { header: "Fecha Límite", key: "fechaLimite", width: 16 },
    {
      header: "Observaciones Inspección",
      key: "observaciones",
      width: 35,
    },

    // Columnas manuales SST
    { header: "Estado Gestión", key: "estadoGestion", width: 18 },
    {
      header: "Responsable Gestión",
      key: "responsableGestion",
      width: 24,
    },
    { header: "Fecha Gestión", key: "fechaGestion", width: 16 },
    {
      header: "Seguimiento / Gestión Realizada",
      key: "gestionRealizada",
      width: 40,
    },
    { header: "Fecha Cierre", key: "fechaCierre", width: 16 },
    {
      header: "Observaciones Cierre",
      key: "observacionesCierre",
      width: 35,
    },

    // Calculadas
    { header: "Días Restantes", key: "diasRestantes", width: 16 },
    { header: "Situación", key: "situacion", width: 20 },
  ]);

  aplicarEstiloEncabezado(hoja.getRow(1));

  seguimiento.forEach((fila) => {
    hoja.addRow({
      idSeguimiento:
        `EPP-${fila.inspeccion_pk}-` +
        `${fila.trabajador_epp_id}-` +
        `${fila.evaluacion_id}`,

      numInspeccion: Number(fila.num_inspeccion),
      inspeccionId: fila.inspeccion_id,

      fecha: convertirFecha(fila.fecha),

      sede: fila.sede_operacion,
      area: fila.area_trabajo,

      responsableInspeccion: fila.responsable_inspeccion,

      codigo: fila.codigo_trabajador,
      nombre: fila.nombre_trabajador,
      cargo: fila.cargo,

      elemento: fila.elemento,
      condicion: fila.condicion,
      uso: fila.uso,

      planAccion: fila.plan_accion || "",
      fechaLimite: convertirFecha(fila.fecha_plan_accion),
      observaciones: fila.observaciones || "",

      estadoGestion: "PENDIENTE",
    });
  });

  const ultimaFilaDatos = hoja.rowCount;

  /*
   * A:P
   * Datos provenientes automáticamente del sistema.
   */
  aplicarColorColumnas(hoja, 2, ultimaFilaDatos, 1, 16, COLOR_SISTEMA);

  /*
   * Q:V
   * Campos manuales de seguimiento SST.
   */
  aplicarColorColumnas(hoja, 2, ultimaFilaDatos, 17, 22, COLOR_SEGUIMIENTO);

  /*
   * W:X
   * Campos calculados automáticamente.
   */
  aplicarColorColumnas(hoja, 2, ultimaFilaDatos, 23, 24, COLOR_CONTROL);

  /*
   * Dejamos preparadas las fórmulas hasta la fila 1000.
   * Las filas sin ID Seguimiento permanecen visualmente vacías.
   */

  for (let fila = 2; fila <= MAX_FILAS_SEGUIMIENTO; fila += 1) {
    const diasRestantes = hoja.getCell(`W${fila}`);
    const situacion = hoja.getCell(`X${fila}`);

    diasRestantes.value = {
      formula:
        `IF(A${fila}="","",` +
        `IF(Q${fila}="CERRADO",0,` +
        `IF(O${fila}="","",INT(O${fila})-TODAY())))`,
    };

    situacion.value = {
      formula:
        `IF(A${fila}="","",` +
        `IF(Q${fila}="CERRADO","CERRADO",` +
        `IF(O${fila}="","",` +
        `IF(O${fila}<TODAY(),"VENCIDO",` +
        `IF(O${fila}-TODAY()<=3,` +
        `"PRÓXIMO A VENCER","EN PLAZO")))))`,
    };
  }

  aplicarFormatoEvaluaciones(hoja);
  aplicarFormatoSituacion(hoja);

  aplicarListaDesplegable(
    hoja,
    "Q",
    2,
    MAX_FILAS_SEGUIMIENTO,
    "Listas!$A$2:$A$4",
  );

  aplicarFormatoFecha(hoja, "D", 2, MAX_FILAS_SEGUIMIENTO);

  aplicarFormatoFecha(hoja, "O", 2, MAX_FILAS_SEGUIMIENTO);

  aplicarFormatoFecha(hoja, "S", 2, MAX_FILAS_SEGUIMIENTO);

  aplicarFormatoFecha(hoja, "U", 2, MAX_FILAS_SEGUIMIENTO);

  congelarEncabezado(hoja, 1);

  activarFiltro(hoja, `A1:X${Math.max(hoja.rowCount, 2)}`);

  return hoja;
}

/* =========================================================
   HOJA TRABAJADORES
========================================================= */

function construirHojaTrabajadores(workbook, trabajadores) {
  const hoja = obtenerOCrearHoja(workbook, "Trabajadores");

  configurarColumnas(hoja, [
    { header: "N° Inspección", key: "numInspeccion", width: 14 },
    { header: "Código Inspección", key: "inspeccionId", width: 25 },
    { header: "Fecha", key: "fecha", width: 16 },
    { header: "Sede", key: "sede", width: 18 },
    { header: "Área", key: "area", width: 22 },
    { header: "Código Trabajador", key: "codigo", width: 18 },
    { header: "Trabajador", key: "trabajador", width: 25 },
    { header: "Cargo", key: "cargo", width: 22 },
    { header: "Resultado", key: "resultado", width: 18 },
    { header: "Plan de Acción", key: "planAccion", width: 40 },
    { header: "Fecha Límite", key: "fechaLimite", width: 16 },
  ]);

  aplicarEstiloEncabezado(hoja.getRow(1));

  trabajadores.forEach((fila) => {
    hoja.addRow({
      numInspeccion: Number(fila.num_inspeccion),
      inspeccionId: fila.inspeccion_id,
      fecha: convertirFecha(fila.fecha),

      sede: fila.sede_operacion,
      area: fila.area_trabajo,

      codigo: fila.codigo_trabajador,
      trabajador: fila.nombre_trabajador,
      cargo: fila.cargo,

      resultado: fila.resultado,

      planAccion: fila.plan_accion || "",
      fechaLimite: convertirFecha(fila.fecha_plan_accion),
    });
  });

  aplicarFormatoFecha(hoja, "C", 2, Math.max(hoja.rowCount, 2));
  aplicarFormatoFecha(hoja, "K", 2, Math.max(hoja.rowCount, 2));

  congelarEncabezado(hoja, 1);

  activarFiltro(hoja, `A1:K${Math.max(hoja.rowCount, 2)}`);

  return hoja;
}

/* =========================================================
   HOJA INSPECCIONES
========================================================= */

function construirHojaInspecciones(workbook, inspecciones) {
  const hoja = obtenerOCrearHoja(workbook, "Inspecciones");

  configurarColumnas(hoja, [
    { header: "N° Inspección", key: "numInspeccion", width: 14 },
    { header: "Código Inspección", key: "inspeccionId", width: 25 },
    { header: "Fecha", key: "fecha", width: 16 },
    { header: "Sede", key: "sede", width: 18 },
    { header: "Área", key: "area", width: 22 },
    {
      header: "Responsable Inspección",
      key: "responsable",
      width: 25,
    },
    {
      header: "Total Trabajadores",
      key: "total",
      width: 18,
    },
    {
      header: "Con Novedad",
      key: "conNovedad",
      width: 16,
    },
    {
      header: "Sin Novedad",
      key: "sinNovedad",
      width: 16,
    },
  ]);

  aplicarEstiloEncabezado(hoja.getRow(1));

  inspecciones.forEach((fila) => {
    const total = Number(fila.total_trabajadores || 0);
    const conNovedad = Number(fila.con_novedad || 0);

    hoja.addRow({
      numInspeccion: Number(fila.num_inspeccion),
      inspeccionId: fila.inspeccion_id,
      fecha: convertirFecha(fila.fecha),

      sede: fila.sede_operacion,
      area: fila.area_trabajo,

      responsable: fila.responsable_inspeccion,

      total,
      conNovedad,
      sinNovedad: total - conNovedad,
    });
  });

  aplicarFormatoFecha(hoja, "C", 2, Math.max(hoja.rowCount, 2));

  congelarEncabezado(hoja, 1);

  activarFiltro(hoja, `A1:I${Math.max(hoja.rowCount, 2)}`);

  return hoja;
}

/* =========================================================
   GENERADOR
========================================================= */

async function generarExcelSeguimientoEpp() {
  const datos = await obtenerDatosEpp();

  const workbook = crearWorkbook();

  workbook.creator = "Sistema de Inspecciones SST";
  workbook.company = "CARGOBAN";
  workbook.created = new Date();
  workbook.modified = new Date();

  construirHojaSeguimiento(workbook, datos.seguimiento);

  construirHojaTrabajadores(workbook, datos.trabajadores);

  construirHojaInspecciones(workbook, datos.inspecciones);

  construirHojaListas(workbook);

  return generarBuffer(workbook);
}

module.exports = {
  generarExcelSeguimientoEpp,
};
