/*
  aprobaciones.controller.js — Aprobación de la inspección (Inspector, Jefe de Área, COPASST).

  Qué hace:
  - obtenerResumenAprobacion (GET /api/aprobaciones/:token): identifica qué rol
    es dueño del token y devuelve un resumen de la inspección para la página
    de aprobación.
  - registrarAprobacion (POST /api/aprobaciones/:token): guarda la aprobación
    (nombre) del rol correspondiente. No se almacena ninguna firma
    dibujada ni biométrica por restricción legal — es una firma electrónica
    simple (identidad declarada + registro de fecha/hora). Cuando las 3
    aprobaciones quedan completas, dispara finalizarInspeccion() en segundo plano.
  - finalizarInspeccion(): descarga de OneDrive las evidencias ya subidas,
    regenera el PDF con el nombre de cada rol incrustado, lo archiva
    en OneDrive (Respuestas_PDF) y envía el correo — recién en este punto, no antes.

  Cómo interactúa:
  - Este controlador NO hace SQL directo: toda lectura/escritura del estado de
    aprobación pasa por aprobaciones.model.js (obtenerContextoAprobacion,
    guardarAprobacion, marcarInspeccionEnviada), y los datos de la inspección
    por inspeccion.model.js (obtenerInspeccionCompleta, descargarEvidenciaOneDrive).
  - Reutiliza crearPdfInspeccionExtintor / subirPdfAOneDrive / enviarCorreoPorGraph /
    resolverCorreoDestino / construirHtmlCorreo de pdfInspeccion.controller.js.
  - Es registrado en app.js como handler de /api/aprobaciones/:token.
*/
const {
  obtenerContextoAprobacion,
  guardarAprobacion,
  marcarInspeccionEnviada,
} = require("../models/aprobaciones.model");
const { obtenerInspeccionCompleta } = require("../models/inspeccion.model");
const {
  subirPdfAOneDrive,
  construirEvidenciasDesdeOneDrive,
  construirEvidenciasEppDesdeOneDrive,
} = require("../services/evidencia.service");
const {
  generarPdfSstAprobacion,
} = require("../services/pdfInspeccion.service");
const {
  enviarCorreoPorGraph,
  resolverCorreoDestino,
  construirHtmlCorreo,
} = require("../services/correo.service");
const {
  generarPdfEppAprobacion,
} = require("../services/pdfInspeccionEpp.service");

const {
  resolverCorreoDestinoEpp,
  construirHtmlCorreoEpp,
} = require("../services/correoEpp.service");

const {
  actualizarExcelSeguimientoSstEnOneDrive,
} = require("../services/seguimientoSstExcel.service");

const {
  actualizarExcelSeguimientoEppEnOneDrive,
} = require("../services/seguimientoEppExcel.service");

const { calcularResumenEpp } = require("../services/resumenEpp.service");

const { optimizarPdf } = require("../utils/pdfOptimizer");

/**
 * Obtiene la información necesaria para mostrar una aprobación.
 *
 * Identifica el rol asociado al token, recupera la inspección completa y
 * construye un resumen diferente según corresponda a una inspección SST o EPP.
 *
 * Corresponde al endpoint GET /api/aprobaciones/:token.
 *
 * @async
 * @param {Object} req Solicitud HTTP de Express.
 * @param {Object} req.params Parámetros recibidos en la URL.
 * @param {string} req.params.token Token único de aprobación.
 * @param {Object} res Respuesta HTTP de Express.
 * @returns {Promise<Object>} Respuesta con el rol, estado de aprobación,
 * información general y conteos de la inspección; 404 si el token o la
 * inspección no existen; o 500 si ocurre un error.
 */

async function obtenerResumenAprobacion(req, res) {
  try {
    const contexto = await obtenerContextoAprobacion(req.params.token);

    if (!contexto) {
      return res.status(404).json({
        ok: false,
        errores: ["Link de aprobación no válido"],
      });
    }

    const { row } = contexto;

    const completa = await obtenerInspeccionCompleta(row.inspeccion_id);

    if (!completa) {
      return res.status(404).json({
        ok: false,
        errores: ["Inspección no encontrada"],
      });
    }

    const tipoInspeccion =
      row.tipo_inspeccion || completa?.inspeccion?.tipo_inspeccion || "SST";

    /* =====================================================
       CONTEOS SEGÚN TIPO DE INSPECCIÓN
    ===================================================== */

    let conteos = {};

    if (tipoInspeccion === "EPP") {
      const trabajadores = Array.isArray(completa.trabajadores)
        ? completa.trabajadores
        : [];

      const resumenEpp = calcularResumenEpp(trabajadores);

      conteos = {
        trabajadores: resumenEpp.totalTrabajadores,
        evaluaciones: resumenEpp.totalEvaluaciones,
        novedades: resumenEpp.totalNovedades,
        trabajadoresConNovedades: resumenEpp.trabajadoresConNovedad,
        trabajadoresSinNovedades: resumenEpp.trabajadoresSinNovedad,
      };
    } else {
      conteos = {
        extintores: completa?.extintores?.length || 0,
        camillas: completa?.camillas?.length || 0,
        senalizaciones: completa?.senalizaciones?.length || 0,
        equiposTecnologicos: completa?.equiposTecnologicos?.length || 0,
        botiquines: completa?.botiquines?.length || 0,
      };
    }

    /* =====================================================
       RESPUESTA
    ===================================================== */

    return res.status(200).json({
      ok: true,

      rol: contexto.rol,
      rolLabel: contexto.rolLabel,
      yaAprobado: contexto.yaAprobado,
      nombreAprobador: contexto.nombreAprobador,

      inspeccion: {
        inspeccionId: row.inspeccion_id,
        numInspeccion: Number(row.inspecciones_id),

        tipoInspeccion,

        fecha: row.fecha,
        sedeOperacion: row.sede_operacion,
        areaTrabajo: row.area_trabajo,

        jefeResponsable: row.jefe_responsable,
        cargoJefe: row.cargo_jefe,

        responsableInspeccion: row.responsable_inspeccion,

        cargoResponsable: row.cargo_responsable,

        estado: row.estado,

        conteos,

        /*
         * Para EPP enviamos también los trabajadores.
         * Esto permitirá construir posteriormente
         * el resumen detallado en la pantalla de aprobación.
         */
        trabajadores:
          tipoInspeccion === "EPP" ? completa.trabajadores || [] : [],
      },
    });
  } catch (error) {
    console.error("[aprobaciones] Error obteniendo resumen:", error);

    const mensaje =
      error instanceof Error ? error.message : "Error obteniendo la inspección";

    return res.status(500).json({
      ok: false,
      errores: [mensaje],
    });
  }
}

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
 * Genera la vista previa en PDF de una inspección.
 *
 * Valida el token de aprobación, recupera la inspección completa y genera el
 * documento correspondiente según el tipo de inspección. Para las inspecciones
 * EPP también recupera las evidencias de cada trabajador desde OneDrive.
 *
 * El PDF se devuelve directamente al navegador sin almacenarlo como informe
 * final.
 *
 * Corresponde al endpoint GET /api/aprobaciones/:token/preview.
 *
 * @async
 * @param {Object} req Solicitud HTTP de Express.
 * @param {Object} req.params Parámetros recibidos en la URL.
 * @param {string} req.params.token Token único de aprobación.
 * @param {Object} res Respuesta HTTP de Express.
 * @returns {Promise<Object>} Respuesta con el PDF para visualización; 404 si
 * el token o la inspección no existen; o 500 si falla la generación.
 */

async function previsualizarAprobacion(req, res) {
  try {
    // =====================================================
    // 1. VALIDAR TOKEN
    // =====================================================

    const contexto = await obtenerContextoAprobacion(req.params.token);

    if (!contexto) {
      return res.status(404).json({
        ok: false,
        errores: ["Link de aprobación no válido"],
      });
    }

    // =====================================================
    // 2. OBTENER INSPECCIÓN COMPLETA
    // =====================================================

    const { row } = contexto;

    const completa = await obtenerInspeccionCompleta(row.inspeccion_id);

    if (!completa) {
      return res.status(404).json({
        ok: false,
        errores: ["Inspección no encontrada"],
      });
    }

    // =====================================================
    // 3. DETECTAR TIPO DE INSPECCIÓN
    // =====================================================

    const tipoInspeccion = String(
      row.tipo_inspeccion || completa?.inspeccion?.tipo_inspeccion || "SST",
    ).toUpperCase();

    // =====================================================
    // 4. APROBACIONES
    // =====================================================

    const aprobaciones = construirAprobaciones(row);

    // =====================================================
    // 5. BUFFER PDF
    // =====================================================

    let pdfBuffer;

    // =====================================================
    // EPP
    // =====================================================

    if (tipoInspeccion === "EPP") {
      const trabajadores = Array.isArray(completa.trabajadores)
        ? completa.trabajadores
        : [];

      // ---------------------------------------------------
      // DESCARGAR EVIDENCIAS
      // ---------------------------------------------------

      const evidenciasPorTrabajador =
        await construirEvidenciasEppDesdeOneDrive(trabajadores);

      const resultadoEpp = await generarPdfEppAprobacion(
        completa,
        row,
        aprobaciones,
        evidenciasPorTrabajador,
      );

      pdfBuffer = resultadoEpp.pdf;
    }

    // =====================================================
    // SST
    // =====================================================
    else {
      pdfBuffer = await generarPdfSstAprobacion(completa, row, aprobaciones);
    }

    // =====================================================
    // 6. DEVOLVER PDF
    // =====================================================

    res.setHeader("Content-Type", "application/pdf");

    res.setHeader(
      "Content-Disposition",
      `inline; filename="${row.inspeccion_id}.pdf"`,
    );

    return res.status(200).send(pdfBuffer);
  } catch (error) {
    console.error("[aprobaciones] Error generando preview:", error);

    const mensaje =
      error instanceof Error
        ? error.message
        : "Error generando preview del PDF";

    return res.status(500).json({
      ok: false,
      errores: [mensaje],
    });
  }
}

/**
 * Registra la aprobación asociada a un token.
 *
 * Valida el nombre del aprobador y delega el registro de la aprobación. Cuando
 * se completan todas las aprobaciones requeridas, inicia en segundo plano el
 * proceso de finalización de la inspección.
 *
 * Corresponde al endpoint POST /api/aprobaciones/:token.
 *
 * @async
 * @param {Object} req Solicitud HTTP de Express.
 * @param {Object} req.params Parámetros recibidos en la URL.
 * @param {string} req.params.token Token único de aprobación.
 * @param {Object} req.body Información enviada por el aprobador.
 * @param {string} req.body.nombre Nombre de la persona que aprueba.
 * @param {Object} res Respuesta HTTP de Express.
 * @returns {Promise<Object>} Respuesta con el resultado de la aprobación;
 * 400 si falta el nombre, 404 si el token no existe, 409 si ya fue utilizado
 * o 500 si ocurre un error.
 */

async function registrarAprobacion(req, res) {
  try {
    const { nombre } = req.body || {};

    if (!nombre || !String(nombre).trim()) {
      return res
        .status(400)
        .json({ ok: false, errores: ["El nombre es obligatorio"] });
    }
    const resultado = await guardarAprobacion(req.params.token, { nombre });

    if (!resultado.ok) {
      if (resultado.motivo === "no_encontrado") {
        return res
          .status(404)
          .json({ ok: false, errores: ["Link de aprobación no válido"] });
      }
      return res
        .status(409)
        .json({ ok: false, errores: ["Este link ya fue usado para aprobar"] });
    }

    if (resultado.completas) {
      // No bloquea la respuesta al aprobador: el PDF y el correo se procesan en segundo plano.
      finalizarInspeccion(resultado.inspeccionId).catch((err) => {
        console.error(
          `[aprobaciones] error finalizando ${resultado.inspeccionId}:`,
          err.message,
        );
      });
    }

    return res.status(200).json({
      ok: true,
      mensaje: "Aprobación registrada",
      todasCompletas: resultado.completas,
    });
  } catch (error) {
    const mensaje =
      error instanceof Error
        ? error.message
        : "Error registrando la aprobación";
    return res.status(500).json({ ok: false, errores: [mensaje] });
  }
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
  obtenerResumenAprobacion,
  previsualizarAprobacion,
  registrarAprobacion,
};
