// Ruta: src/backend/services/finalizacionInspeccion.service.js
/*
  finalizacionInspeccion.service.js — Cierre definitivo de una inspección aprobada.

  Qué hace:
  - construirAprobaciones(): normaliza los nombres de las 3 aprobaciones
    (Inspector, Jefe de Área, COPASST) a partir del registro de la inspección.
  - finalizarInspeccion(): descarga de OneDrive las evidencias ya subidas,
    regenera el PDF con el nombre de cada rol incrustado, lo archiva
    en OneDrive (Respuestas_PDF), envía el correo, marca la inspección como
    enviada y actualiza el Excel de seguimiento correspondiente.

  Cómo interactúa:
  - Es invocado por aprobaciones.controller.js cuando las 3 aprobaciones
    quedan completas (registrarAprobacion) y para construir la vista previa.
  - Accede a datos solo a través de los modelos (inspeccion.model.js,
    aprobaciones.model.js); no hace SQL directo.
*/
const {
  marcarInspeccionEnviada,
} = require("../models/aprobaciones.model");

const { obtenerInspeccionCompleta } = require("../models/inspeccion.model");

const {
  subirPdfAOneDrive,
  construirEvidenciasEppDesdeOneDrive,
} = require("../shared/services/evidencia.service");
const {
  generarPdfSstAprobacion,
} = require("./pdfInspeccion.service");
const {
  enviarCorreoPorGraph,
  resolverCorreoDestino,
  construirHtmlCorreo,
} = require("../shared/services/correo.service");
const {
  generarPdfEppAprobacion,
} = require("./pdfInspeccionEpp.service");

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

const { calcularResumenEpp } = require("./resumenEpp.service");

const { optimizarPdf } = require("../shared/utils/pdfOptimizer");

/**
 * Construye la información de los responsables que aprobaron la inspección.
 *
 * Normaliza los nombres almacenados para el inspector, jefe responsable y
 * representante de COPASST. Cuando una aprobación no existe, asigna una
 * cadena vacía.
 *
 * @param {Object} row Registro de la inspección obtenido desde la base de datos.
 * @returns {{
 *   inspector: {nombre: string},
 *   jefe: {nombre: string},
 *   copasst: {nombre: string}
 * }} Información normalizada de las aprobaciones.
 */

function construirAprobaciones(row) {
  return {
    inspector: {
      nombre: row.aprobacion_inspector_nombre || "",
    },
    jefe: {
      nombre: row.aprobacion_jefe_nombre || "",
    },
    copasst: {
      nombre: row.aprobacion_copasst_nombre || "",
    },
  };
}

/**
 * Ejecuta el cierre definitivo de una inspección aprobada.
 *
 * Verifica que la inspección tenga todas las aprobaciones, genera el PDF final
 * según sea SST o EPP, optimiza el documento, lo almacena en OneDrive y envía
 * el correo correspondiente. Después marca la inspección como enviada y
 * actualiza el archivo de seguimiento asociado a su tipo.
 *
 * La actualización del archivo Excel se gestiona de manera independiente:
 * si falla, el cierre principal de la inspección permanece realizado.
 *
 * @async
 * @param {string} inspeccionId Identificador único de la inspección.
 * @returns {Promise<void>} La promesa finaliza cuando se completa el proceso
 * principal de cierre y se intenta actualizar el seguimiento en Excel.
 * @throws {Error} Si la inspección no existe, no tiene todas las aprobaciones
 * o falla una etapa principal de generación, almacenamiento o envío.
 */

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
  construirAprobaciones,
  finalizarInspeccion,
};
