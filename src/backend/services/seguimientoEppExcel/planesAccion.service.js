const {
  obtenerOCrearHoja,
  congelarEncabezado,
  configurarColumnas,
  activarFiltro,
  aplicarFormatoFecha,
  aplicarEstiloEncabezado,
  aplicarFormatoCuerpo,
  aplicarColorPorValor,
} = require("../excel.service");

const { COLORES_EVALUACION } = require("./estilos.service");

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
    {
      header: "ID Plan",
      key: "detalleEppId",
      width: 14,
    },
    {
      header: "Responsable del Cierre",
      key: "responsableCierre",
      width: 28,
    },
    {
      header: "Fecha de Cierre",
      key: "fechaCierre",
      width: 22,
    },
  ]);

  hoja.getColumn("Q").hidden = true;
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

      detalleEppId: fila.detalle_epp_id || "",

      responsableCierre: fila.responsable_cierre || "",

      fechaCierre: fila.fecha_cierre || null,
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
    // N = Días Restantes
    row.getCell(14).value = {
      formula:
        `IF(AND(R${numeroFila}<>"",S${numeroFila}<>""),0,` +
        `IF(M${numeroFila}="","",` +
        `INT(M${numeroFila})-TODAY()))`,
    };

    // O = Situación
    row.getCell(15).value = {
      formula:
        `IF(AND(R${numeroFila}<>"",S${numeroFila}<>""),` +
        `"CUMPLIDO",` +
        `IF(M${numeroFila}="","PENDIENTE",` +
        `IF(N${numeroFila}<0,"VENCIDO",` +
        `IF(N${numeroFila}=0,"VENCE HOY",` +
        `IF(N${numeroFila}<=3,"PRÓXIMO A VENCER","EN PLAZO")))))`,
    };

    // P = Cumplido
    row.getCell(16).value = {
      formula:
        `IF(AND(R${numeroFila}<>"",S${numeroFila}<>""),` +
        `"☑ CUMPLIDO","☐ PENDIENTE")`,
    };
  });

  /* =========================================================
     RANGO DINÁMICO
  ========================================================= */

  const ultimaFila = hoja.rowCount;

  /* =========================================================
   TABLA DINÁMICA PARA POWER AUTOMATE

   La tabla siempre abarcará desde A1 hasta la última fila
   generada a partir de los planes existentes en la BD.
========================================================= */

  const columnasTabla = hoja
    .getRow(1)
    .values.slice(1, 20)
    .map((encabezado) => ({
      name: String(encabezado || ""),
      filterButton: true,
    }));

  const filasTabla = [];

  for (let numeroFila = 2; numeroFila <= ultimaFila; numeroFila += 1) {
    filasTabla.push(hoja.getRow(numeroFila).values.slice(1, 20));
  }

  hoja.addTable({
    name: "TablaPlanesAccionEpp",
    ref: "A1",
    headerRow: true,
    totalsRow: false,
    style: {
      theme: null,
      showFirstColumn: false,
      showLastColumn: false,
      showRowStripes: false,
      showColumnStripes: false,
    },
    columns: columnasTabla,
    rows: filasTabla,
  });

  /* =========================================================
     FORMATO BASE
  ========================================================= */

  aplicarEstiloEncabezado(hoja, 1);

  if (ultimaFila >= 2) {
    aplicarFormatoCuerpo(hoja, 2, ultimaFila);

    /* =======================================================
       FECHAS
    ======================================================= */
    aplicarFormatoFecha(hoja, "B", 2, ultimaFila);

    aplicarFormatoFecha(hoja, "M", 2, ultimaFila);

    aplicarFormatoFecha(hoja, "S", 2, ultimaFila);
    /* =======================================================
       EVALUACIÓN EPP
    ======================================================= */
    aplicarColorPorValor(hoja, "J", 2, ultimaFila, COLORES_EVALUACION);

    aplicarColorPorValor(hoja, "K", 2, ultimaFila, COLORES_EVALUACION);
    /* =======================================================
       CUMPLIMIENTO MANUAL
    ======================================================= */
    for (let fila = 2; fila <= ultimaFila; fila += 1) {
      const celdaCumplido = hoja.getCell(`P${fila}`);

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

                {
          type: "cellIs",
          operator: "equal",
          formulae: ['"VENCE HOY"'],
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

  return hoja;
}

module.exports = {
  construirHojaPlanesAccion,
};
