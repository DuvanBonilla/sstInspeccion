const {
  obtenerOCrearHoja,
  congelarEncabezado,
  configurarColumnas,
  activarFiltro,
  aplicarFormatoFecha,
  aplicarEstiloEncabezado,
  aplicarFormatoCuerpo,
} = require("../excel.service");

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

module.exports = {
  construirHojaInspecciones,
};