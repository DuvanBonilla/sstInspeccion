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
const {
  descargarEvidenciaOneDrive,
  obtenerInspeccionCompleta,
} = require("../models/inspeccion.model");
const {
  crearPdfInspeccionExtintor,
  subirPdfAOneDrive,
  enviarCorreoPorGraph,
  resolverCorreoDestino,
  construirHtmlCorreo,
} = require("./pdfInspeccion.controller");
const {
  crearPdfInspeccionEpp,
  resolverCorreoDestinoEpp,
  construirHtmlCorreoEpp,
} = require("./pdfInspeccionEpp.controller");
const { optimizarPdf } = require("../utils/pdfOptimizer");
const {
  recuperarLinksAprobacion,
} = require("../controllers/inspeccion.controller");

// GET /api/aprobaciones/:token
// GET /api/aprobaciones/:token
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

      let totalEvaluaciones = 0;
      let totalNovedades = 0;
      let trabajadoresConNovedades = 0;

      for (const trabajador of trabajadores) {
        const elementos = Array.isArray(trabajador.elementos)
          ? trabajador.elementos
          : [];

        totalEvaluaciones += elementos.length;

        const novedadesTrabajador = elementos.filter(
          (elemento) =>
            elemento.condicion === "M" ||
            elemento.condicion === "R" ||
            elemento.uso === "M" ||
            elemento.uso === "R",
        ).length;

        totalNovedades += novedadesTrabajador;

        if (novedadesTrabajador > 0) {
          trabajadoresConNovedades++;
        }
      }

      conteos = {
        trabajadores: trabajadores.length,
        evaluaciones: totalEvaluaciones,
        novedades: totalNovedades,
        trabajadoresConNovedades,
        trabajadoresSinNovedades:
          trabajadores.length - trabajadoresConNovedades,
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
        numInspeccion: Number(row.num_inspeccion),

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

    const aprobaciones = {
      inspector: {
        nombre: row.aprobacion_inspector_nombre,
      },

      jefe: {
        nombre: row.aprobacion_jefe_nombre,
      },

      copasst: {
        nombre: row.aprobacion_copasst_nombre,
      },
    };

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

      // ---------------------------------------------------
      // INFORMACIÓN GENERAL
      // ---------------------------------------------------

      const general = {
        inspeccionId: row.inspeccion_id,

        numInspeccion: Number(row.num_inspeccion),

        fecha: row.fecha,

        sedeOperacion: row.sede_operacion,

        areaTrabajo: row.area_trabajo,

        jefeResponsable: row.jefe_responsable,

        cargoJefe: row.cargo_jefe,

        responsableInspeccion: row.responsable_inspeccion,

        cargoResponsable: row.cargo_responsable,
      };

      // ---------------------------------------------------
      // GENERAR PDF EPP
      // ---------------------------------------------------

      pdfBuffer = await crearPdfInspeccionEpp(
        {
          general,
          trabajadores,
        },

        evidenciasPorTrabajador,

        {
          aprobaciones,
        },
      );
    }

    // =====================================================
    // SST
    // =====================================================
    else {
      // ---------------------------------------------------
      // DESCARGAR EVIDENCIAS SST
      // ---------------------------------------------------

      const [ext, cam, sen, eqp, bot] = await Promise.all([
        construirEvidenciasDesdeOneDrive(completa.extintores),

        construirEvidenciasDesdeOneDrive(completa.camillas),

        construirEvidenciasDesdeOneDrive(completa.senalizaciones),

        construirEvidenciasDesdeOneDrive(completa.equiposTecnologicos),

        construirEvidenciasDesdeOneDrive(completa.botiquines),
      ]);

      // ---------------------------------------------------
      // DATOS SST
      // ---------------------------------------------------

      const data = {
        inspeccionId: row.inspeccion_id,

        numInspeccion: Number(row.num_inspeccion),

        fecha: row.fecha,

        sedeOperacion: row.sede_operacion,

        areaTrabajo: row.area_trabajo,

        jefeResponsable: row.jefe_responsable,

        cargoJefe: row.cargo_jefe,

        responsableInspeccion: row.responsable_inspeccion,

        cargoResponsable: row.cargo_responsable,

        extintores: completa.extintores,

        camillas: completa.camillas,

        senalizaciones: completa.senalizaciones,

        equiposTecnologicos: completa.equiposTecnologicos,

        botiquines: completa.botiquines,
      };

      // ---------------------------------------------------
      // GENERAR PDF SST
      // ---------------------------------------------------

      pdfBuffer = await crearPdfInspeccionExtintor(
        data,

        ext.evidenciasPorIndex,

        cam.evidenciasPorIndex,

        sen.evidenciasPorIndex,

        eqp.evidenciasPorIndex,

        bot.evidenciasPorIndex,

        {},

        {
          aprobaciones,

          fechasPrecomputadas: {
            extintores: ext.fechas,

            camillas: cam.fechas,

            senalizaciones: sen.fechas,

            equipos: eqp.fechas,

            botiquines: bot.fechas,
          },
        },
      );
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

// POST /api/aprobaciones/:token — body { nombre }
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

// Descarga de OneDrive todas las evidencias de una sección y arma los mapas
// evidenciasPorIndex + fechas que espera crearPdfInspeccionExtintor.
async function construirEvidenciasDesdeOneDrive(items) {
  const evidenciasPorIndex = new Map();
  const fechas = new Map();

  await Promise.all(
    (Array.isArray(items) ? items : []).map(async (item, idx) => {
      const rutas = String(item?.evidenciaRuta || "")
        .split("\n")
        .map((r) => r.trim())
        .filter(Boolean);
      if (rutas.length === 0) return;

      const buffers = await Promise.all(
        rutas.map((ruta) => descargarEvidenciaOneDrive(ruta)),
      );
      const archivos = buffers.filter(Boolean).map((buffer) => ({ buffer }));
      if (archivos.length > 0) evidenciasPorIndex.set(idx, archivos);
      if (item?.evidenciaFecha) fechas.set(idx, item.evidenciaFecha);
    }),
  );

  return { evidenciasPorIndex, fechas };
}

// =========================================================
// EVIDENCIAS EPP DESDE ONEDRIVE
// =========================================================

async function construirEvidenciasEppDesdeOneDrive(trabajadores) {
  const evidenciasPorTrabajador = new Map();

  await Promise.all(
    (Array.isArray(trabajadores) ? trabajadores : []).map(
      async (trabajador, idx) => {
        const ruta = String(trabajador?.evidenciaRuta || "").trim();

        if (!ruta) {
          return;
        }

        try {
          const buffer = await descargarEvidenciaOneDrive(ruta);

          if (!buffer) {
            return;
          }

          const archivo = {
            buffer,
          };

          // -------------------------------------------------
          // Guardar por índice
          // -------------------------------------------------

          evidenciasPorTrabajador.set(idx, archivo);

          // -------------------------------------------------
          // También guardar por trabajadorId si existe
          // -------------------------------------------------

          if (
            trabajador?.trabajadorId !== undefined &&
            trabajador?.trabajadorId !== null
          ) {
            evidenciasPorTrabajador.set(trabajador.trabajadorId, archivo);
          }
        } catch (error) {
          console.error(
            `[EPP] Error descargando evidencia trabajador ${idx + 1}:`,
            error.message,
          );
        }
      },
    ),
  );

  return evidenciasPorTrabajador;
}

// Regenera el PDF (con las 3 aprobaciones reales), lo archiva en OneDrive y envía el correo final.
// =========================================================
// FINALIZAR INSPECCIÓN
//
// IMPORTANTE:
// Esta función solamente es llamada cuando guardarAprobacion()
// confirma que Inspector + Jefe + COPASST ya aprobaron.
// =========================================================

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

  const aprobaciones = {
    inspector: {
      nombre: row.aprobacion_inspector_nombre,
    },

    jefe: {
      nombre: row.aprobacion_jefe_nombre,
    },

    copasst: {
      nombre: row.aprobacion_copasst_nombre,
    },
  };

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

    // -----------------------------------------------------
    // EVIDENCIAS DE LOS TRABAJADORES
    // -----------------------------------------------------

    const evidenciasPorTrabajador =
      await construirEvidenciasEppDesdeOneDrive(trabajadoresEpp);

    // -----------------------------------------------------
    // INFORMACIÓN GENERAL EPP
    // -----------------------------------------------------

    const general = {
      inspeccionId: row.inspeccion_id,

      numInspeccion: Number(row.num_inspeccion),

      fecha: row.fecha,

      sedeOperacion: row.sede_operacion,

      areaTrabajo: row.area_trabajo,

      jefeResponsable: row.jefe_responsable,

      cargoJefe: row.cargo_jefe,

      responsableInspeccion: row.responsable_inspeccion,

      cargoResponsable: row.cargo_responsable,
    };

    // -----------------------------------------------------
    // PDF FINAL EPP
    // -----------------------------------------------------

    pdfGenerado = await crearPdfInspeccionEpp(
      {
        general,
        trabajadores: trabajadoresEpp,
      },

      evidenciasPorTrabajador,

      {
        aprobaciones,
      },
    );

  }

  // =======================================================
  // SST
  // =======================================================
  else {
    // -----------------------------------------------------
    // DESCARGAR EVIDENCIAS SST
    // -----------------------------------------------------

    const [ext, cam, sen, eqp, bot] = await Promise.all([
      construirEvidenciasDesdeOneDrive(completa.extintores),

      construirEvidenciasDesdeOneDrive(completa.camillas),

      construirEvidenciasDesdeOneDrive(completa.senalizaciones),

      construirEvidenciasDesdeOneDrive(completa.equiposTecnologicos),

      construirEvidenciasDesdeOneDrive(completa.botiquines),
    ]);

    // -----------------------------------------------------
    // DATOS SST
    // -----------------------------------------------------

    const data = {
      inspeccionId: row.inspeccion_id,

      numInspeccion: Number(row.num_inspeccion),

      fecha: row.fecha,

      sedeOperacion: row.sede_operacion,

      areaTrabajo: row.area_trabajo,

      jefeResponsable: row.jefe_responsable,

      cargoJefe: row.cargo_jefe,

      responsableInspeccion: row.responsable_inspeccion,

      cargoResponsable: row.cargo_responsable,

      extintores: completa.extintores,

      camillas: completa.camillas,

      senalizaciones: completa.senalizaciones,

      equiposTecnologicos: completa.equiposTecnologicos,

      botiquines: completa.botiquines,
    };

    // -----------------------------------------------------
    // PDF FINAL SST
    // -----------------------------------------------------

    pdfGenerado = await crearPdfInspeccionExtintor(
      data,

      ext.evidenciasPorIndex,

      cam.evidenciasPorIndex,

      sen.evidenciasPorIndex,

      eqp.evidenciasPorIndex,

      bot.evidenciasPorIndex,

      {},

      {
        aprobaciones,

        fechasPrecomputadas: {
          extintores: ext.fechas,

          camillas: cam.fechas,

          senalizaciones: sen.fechas,

          equipos: eqp.fechas,

          botiquines: bot.fechas,
        },
      },
    );

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

      let trabajadoresConNovedad = 0;
      let totalNovedades = 0;

      for (const trabajador of trabajadoresEpp) {
        const elementos = Array.isArray(trabajador.elementos)
          ? trabajador.elementos
          : [];

        let tieneNovedad = false;

        for (const elemento of elementos) {
          const condicion = String(elemento.condicion || "").toUpperCase();

          const uso = String(elemento.uso || "").toUpperCase();

          /*
           * Consideramos novedad cualquier resultado
           * diferente de B (Bueno) o NA (No aplica).
           *
           * M = Malo
           * R = Regular
           */

          const novedadCondicion = condicion === "M" || condicion === "R";

          const novedadUso = uso === "M" || uso === "R";

          if (novedadCondicion || novedadUso) {
            totalNovedades++;
            tieneNovedad = true;
          }
        }

        if (tieneNovedad) {
          trabajadoresConNovedad++;
        }
      }

      const totalTrabajadores = trabajadoresEpp.length;

      const trabajadoresSinNovedad = totalTrabajadores - trabajadoresConNovedad;

      // ---------------------------------------------------
      // HTML EPP
      // ---------------------------------------------------

      html = construirHtmlCorreoEpp({
        inspeccionId: row.inspeccion_id,

        numInspeccion: Number(row.num_inspeccion),

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

        numInspeccion: Number(row.num_inspeccion),

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

      subject: `Inspección ${tipoInspeccion} aprobada N.° ${row.num_inspeccion} – ${row.inspeccion_id}`,

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

}

module.exports = {
  obtenerResumenAprobacion,
  previsualizarAprobacion,
  registrarAprobacion,
};
