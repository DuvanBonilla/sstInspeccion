const {
  marcarInspeccionEnviada,
} = require("../models/aprobaciones.model");

const {
  obtenerInspeccionCompleta,
} = require("../models/inspeccion.model");

const {
  subirPdfAOneDrive,
  construirEvidenciasEppDesdeOneDrive,
} = require("./evidencia.service");

const {
  generarPdfSstAprobacion,
} = require("./pdfInspeccion.service");

const {
  generarPdfEppAprobacion,
} = require("./pdfInspeccionEpp.service");

const {
  enviarCorreoPorGraph,
  resolverCorreoDestino,
  construirHtmlCorreo,
} = require("./correo.service");

const {
  resolverCorreoDestinoEpp,
  construirHtmlCorreoEpp,
} = require("./correoEpp.service");

const {
  actualizarExcelSeguimientoSstEnOneDrive,
} = require("./seguimientoSstExcel.service");

const {
  actualizarExcelSeguimientoEppEnOneDrive,
} = require("./seguimientoEppExcel.service");

const {
  calcularResumenEpp,
} = require("./resumenEpp.service");

const {
  optimizarPdf,
} = require("../utils/pdfOptimizer");

const {
  construirAprobaciones,
} = require("../utils/aprobaciones.util");

async function finalizarInspeccion(inspeccionId) {
  // =======================================================
  // 1. OBTENER INSPECCIÓN COMPLETA
  // =======================================================

  const completa = await obtenerInspeccionCompleta(inspeccionId);

  if (!completa) {
    throw new Error(`Inspección ${inspeccionId} no encontrada`);
  }

  const row = completa.inspeccion;

  // =======================================================
  // 2. IDENTIFICAR TIPO
  // =======================================================

  const tipoInspeccion = String(row.tipo_inspeccion || "SST").toUpperCase();

  // =======================================================
  // 3. APROBACIONES
  // =======================================================

  const aprobaciones = construirAprobaciones(row);

  // =======================================================
  // 4. SEGURIDAD ADICIONAL
  //
  // guardarAprobacion() ya valida las 3 aprobaciones.
  // Esta validación evita que finalizarInspeccion()
  // genere un PDF final si fuese llamada manualmente.
  // =======================================================

  const aprobacionesCompletas = Boolean(
    row.aprobacion_inspector_nombre &&
    row.aprobacion_jefe_nombre &&
    row.aprobacion_copasst_nombre,
  );

  if (!aprobacionesCompletas) {
    throw new Error(
      `La inspección ${row.inspeccion_id} todavía no tiene las 3 aprobaciones.`,
    );
  }

  // =======================================================
  // 5. GENERAR PDF SEGÚN TIPO
  // =======================================================

  let pdfGenerado;

  // Guardaremos los trabajadores EPP aquí porque después
  // los necesitaremos para construir el correo EPP.
  let trabajadoresEpp = [];

  // =======================================================
  // EPP
  // =======================================================

  if (tipoInspeccion === "EPP") {
    trabajadoresEpp = Array.isArray(completa.trabajadores)
      ? completa.trabajadores
      : [];

    const evidenciasPorTrabajador =
      await construirEvidenciasEppDesdeOneDrive(trabajadoresEpp);

    const resultadoEpp = await generarPdfEppAprobacion(
      completa,
      row,
      aprobaciones,
      evidenciasPorTrabajador,
    );

    pdfGenerado = resultadoEpp.pdf;
    trabajadoresEpp = resultadoEpp.trabajadores;
  }

  // =======================================================
  // SST
  // =======================================================
  else {
    pdfGenerado = await generarPdfSstAprobacion(completa, row, aprobaciones);
  }

  // =======================================================
  // 6. OPTIMIZAR PDF
  // =======================================================

  const pdfFinal = await optimizarPdf(pdfGenerado, {
    profile: "inspection",
    fileName: `${row.inspeccion_id}.pdf`,
  });

  // =======================================================
  // 7. SUBIR PDF FINAL A ONEDRIVE
  // =======================================================

  const webUrl = await subirPdfAOneDrive(
    pdfFinal,
    row.inspeccion_id,
    row.sede_operacion,
  );

  // =======================================================
  // 8. RESOLVER CORREO DESTINO
  // =======================================================

  const correoDestino =
    tipoInspeccion === "EPP"
      ? resolverCorreoDestinoEpp(row.sede_operacion, null)
      : resolverCorreoDestino(row.sede_operacion, null);

  // =======================================================
  // 9. CONSTRUIR Y ENVIAR CORREO
  // =======================================================

  if (correoDestino) {
    let html;

    // =====================================================
    // CORREO EPP
    // =====================================================

    if (tipoInspeccion === "EPP") {
      // ---------------------------------------------------
      // CALCULAR RESUMEN EPP
      // ---------------------------------------------------

      const resumenEpp = calcularResumenEpp(trabajadoresEpp);

      const {
        totalTrabajadores,
        trabajadoresConNovedad,
        trabajadoresSinNovedad,
        totalNovedades,
      } = resumenEpp;

      // ---------------------------------------------------
      // HTML EPP
      // ---------------------------------------------------

      html = construirHtmlCorreoEpp({
        inspeccionId: row.inspeccion_id,

        numInspeccion: Number(row.inspecciones_id),

        fecha: row.fecha,

        sedeOperacion: row.sede_operacion,

        areaTrabajo: row.area_trabajo,

        responsableInspeccion: row.responsable_inspeccion,

        totalTrabajadores,

        trabajadoresConNovedad,

        trabajadoresSinNovedad,

        totalNovedades,

        aprobaciones,

        webUrl,
      });
    }

    // =====================================================
    // CORREO SST
    // =====================================================
    else {
      html = construirHtmlCorreo({
        inspeccionId: row.inspeccion_id,

        numInspeccion: Number(row.inspecciones_id),

        fecha: row.fecha,

        sedeOperacion: row.sede_operacion,

        areaTrabajo: row.area_trabajo,

        jefeResponsable: row.jefe_responsable,

        responsableInspeccion: row.responsable_inspeccion,

        cargoResponsable: row.cargo_responsable,

        webUrl,

        titulo: "Inspección SST aprobada",
      });
    }

    // =====================================================
    // ENVÍO GRAPH
    // =====================================================

    await enviarCorreoPorGraph({
      to: correoDestino,

      subject: `Inspección ${tipoInspeccion} aprobada N.° ${row.inspecciones_id} – ${row.inspeccion_id}`,

      html,

      pdfBuffer: pdfFinal,

      nombre: `${row.inspeccion_id}.pdf`,
    });
  }

  // =======================================================
  // 10. MARCAR COMO ENVIADA
  //
  // Solo ocurre después de:
  // - 3 aprobaciones
  // - PDF generado
  // - PDF optimizado
  // - PDF subido a OneDrive
  // - correo procesado
  // =======================================================

  await marcarInspeccionEnviada(row.inspeccion_id, webUrl);

  if (tipoInspeccion === "SST") {
    try {
      const resultadoExcel = await actualizarExcelSeguimientoSstEnOneDrive();

      console.log("[aprobaciones] Excel SST actualizado:", {
        inspeccionId: row.inspeccion_id,
        rutaExcel: resultadoExcel.rutaExcel,
        extintores: resultadoExcel.extintores,
        camillas: resultadoExcel.camillas,
        senalizaciones: resultadoExcel.senalizaciones,
        equiposTecnologicos: resultadoExcel.equiposTecnologicos,
        botiquines: resultadoExcel.botiquines,
        resumen: resultadoExcel.resumen,
        general: resultadoExcel.general,
      });
    } catch (error) {
      console.error(
        `[aprobaciones] No se pudo actualizar el Excel SST para ${row.inspeccion_id}:`,
        error,
      );
    }
  } else if (tipoInspeccion === "EPP") {
    try {
      const resultadoExcel = await actualizarExcelSeguimientoEppEnOneDrive();

      console.log("[aprobaciones] Excel EPP actualizado:", {
        inspeccionId: row.inspeccion_id,
        rutaExcel: resultadoExcel.rutaExcel,
        estadoInspecciones: resultadoExcel.estadoInspecciones,
        tamañoBytes: resultadoExcel.tamañoBytes,
      });
    } catch (error) {
      console.error(
        `[aprobaciones] No se pudo actualizar el Excel EPP para ${row.inspeccion_id}:`,
        error,
      );
    }
  }
}

module.exports = {
  finalizarInspeccion,
};