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

const { COLORES_RESULTADO } = require("./estilos.service");

/**
 * Construye la hoja de seguimiento individual de trabajadores EPP.
 *
 * Configura la hoja `02 - Seguimiento EPP` y agrega una fila por cada
 * trabajador inspeccionado, incluyendo sus datos generales, cantidad de
 * elementos evaluados, novedades, resultado, hallazgos y observaciones.
 *
 * Cuando existe una evidencia, genera un hipervínculo para consultarla.
 * Finalmente aplica formatos de fecha, colores según el resultado, ajuste
 * de texto, estilo para los enlaces y filtros sobre el rango utilizado.
 *
 * @param {ExcelJS.Workbook} workbook
 * Libro de Excel donde debe construirse la hoja.
 * @param {Array<{
 *   inspeccion_id: string,
 *   fecha: string|Date,
 *   sede_operacion: string,
 *   area_trabajo: string,
 *   codigo_trabajador: string,
 *   nombre_trabajador: string,
 *   cargo: string,
 *   total_epp_evaluados: number|string,
 *   epp_con_novedad: number|string,
 *   resultado_general: string,
 *   hallazgos_epp: string,
 *   observaciones: string,
 *   evidencia_url: string|null,
 *   evidencia_fecha: string|Date|null
 * }>} seguimiento - Registros de seguimiento obtenidos desde la base de datos.
 * @returns { @returns {ExcelJS.Worksheet}
 * Hoja de seguimiento de trabajadores configurada y formateada.
 */

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

module.exports = {
  construirHojaSeguimientoEpp,
};
