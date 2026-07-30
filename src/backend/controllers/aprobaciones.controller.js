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
const { obtenerContextoAprobacion, guardarAprobacion, marcarInspeccionEnviada } = require("../models/aprobaciones.model");
const { descargarEvidenciaOneDrive, obtenerInspeccionCompleta } = require("../models/inspeccion.model");
const {
  crearPdfInspeccionExtintor,
  subirPdfAOneDrive,
  enviarCorreoPorGraph,
  resolverCorreoDestino,
  construirHtmlCorreo
} = require("./pdfInspeccion.controller");

// GET /api/aprobaciones/:token
async function obtenerResumenAprobacion(req, res) {
  try {
    const contexto = await obtenerContextoAprobacion(req.params.token);
    if (!contexto) {
      return res.status(404).json({ ok: false, errores: ["Link de aprobación no válido"] });
    }

    const { row } = contexto;
    const completa = await obtenerInspeccionCompleta(row.inspeccion_id);

    return res.status(200).json({
      ok: true,
      rol: contexto.rol,
      rolLabel: contexto.rolLabel,
      yaAprobado: contexto.yaAprobado,
      nombreAprobador: contexto.nombreAprobador,
      inspeccion: {
        inspeccionId: row.inspeccion_id,
        numInspeccion: Number(row.num_inspeccion),
        fecha: row.fecha,
        sedeOperacion: row.sede_operacion,
        areaTrabajo: row.area_trabajo,
        jefeResponsable: row.jefe_responsable,
        cargoJefe: row.cargo_jefe,
        responsableInspeccion: row.responsable_inspeccion,
        cargoResponsable: row.cargo_responsable,
        estado: row.estado,
        conteos: {
          extintores: completa?.extintores.length || 0,
          camillas: completa?.camillas.length || 0,
          senalizaciones: completa?.senalizaciones.length || 0,
          equiposTecnologicos: completa?.equiposTecnologicos.length || 0,
          botiquines: completa?.botiquines.length || 0
        }
      }
    });
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : "Error obteniendo la inspección";
    return res.status(500).json({ ok: false, errores: [mensaje] });
  }
}

async function previsualizarAprobacion(req, res) {
  try {
    const contexto = await obtenerContextoAprobacion(req.params.token);
    if (!contexto) {
      return res.status(404).json({ ok: false, errores: ["Link de aprobación no válido"] });
    }

    const { row } = contexto;
    const completa = await obtenerInspeccionCompleta(row.inspeccion_id);
    if (!completa) {
      return res.status(404).json({ ok: false, errores: ["Inspección no encontrada"] });
    }

    const [ext, cam, sen, eqp, bot] = await Promise.all([
      construirEvidenciasDesdeOneDrive(completa.extintores),
      construirEvidenciasDesdeOneDrive(completa.camillas),
      construirEvidenciasDesdeOneDrive(completa.senalizaciones),
      construirEvidenciasDesdeOneDrive(completa.equiposTecnologicos),
      construirEvidenciasDesdeOneDrive(completa.botiquines)
    ]);

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
      botiquines: completa.botiquines
    };

    const aprobaciones = {
      inspector: { nombre: row.aprobacion_inspector_nombre },
      jefe: { nombre: row.aprobacion_jefe_nombre },
      copasst: { nombre: row.aprobacion_copasst_nombre }
    };

    const pdfBuffer = await crearPdfInspeccionExtintor(
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
          botiquines: bot.fechas
        }
      }
    );

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${row.inspeccion_id}.pdf"`);
    return res.status(200).send(pdfBuffer);
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : "Error generando preview del PDF";
    return res.status(500).json({ ok: false, errores: [mensaje] });
  }
}

// POST /api/aprobaciones/:token — body { nombre }
async function registrarAprobacion(req, res) {
  try {
    const { nombre } = req.body || {};

    if (!nombre || !String(nombre).trim()) {
      return res.status(400).json({ ok: false, errores: ["El nombre es obligatorio"] });
    }
    const resultado = await guardarAprobacion(req.params.token, { nombre });

    if (!resultado.ok) {
      if (resultado.motivo === "no_encontrado") {
        return res.status(404).json({ ok: false, errores: ["Link de aprobación no válido"] });
      }
      return res.status(409).json({ ok: false, errores: ["Este link ya fue usado para aprobar"] });
    }

    if (resultado.completas) {
      // No bloquea la respuesta al aprobador: el PDF y el correo se procesan en segundo plano.
      finalizarInspeccion(resultado.inspeccionId).catch((err) => {
        console.error(`[aprobaciones] error finalizando ${resultado.inspeccionId}:`, err.message);
      });
    }

    return res.status(200).json({ ok: true, mensaje: "Aprobación registrada", todasCompletas: resultado.completas });
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : "Error registrando la aprobación";
    return res.status(500).json({ ok: false, errores: [mensaje] });
  }
}

// Descarga de OneDrive todas las evidencias de una sección y arma los mapas
// evidenciasPorIndex + fechas que espera crearPdfInspeccionExtintor.
async function construirEvidenciasDesdeOneDrive(items) {
  const evidenciasPorIndex = new Map();
  const fechas = new Map();

  await Promise.all((Array.isArray(items) ? items : []).map(async (item, idx) => {
    const rutas = String(item?.evidenciaRuta || "").split("\n").map((r) => r.trim()).filter(Boolean);
    if (rutas.length === 0) return;

    const buffers = await Promise.all(rutas.map((ruta) => descargarEvidenciaOneDrive(ruta)));
    const archivos = buffers.filter(Boolean).map((buffer) => ({ buffer }));
    if (archivos.length > 0) evidenciasPorIndex.set(idx, archivos);
    if (item?.evidenciaFecha) fechas.set(idx, item.evidenciaFecha);
  }));

  return { evidenciasPorIndex, fechas };
}

// Regenera el PDF (con las 3 aprobaciones reales), lo archiva en OneDrive y envía el correo final.
async function finalizarInspeccion(inspeccionId) {
  const completa = await obtenerInspeccionCompleta(inspeccionId);
  if (!completa) throw new Error(`Inspección ${inspeccionId} no encontrada`);
  const row = completa.inspeccion;

  const [ext, cam, sen, eqp, bot] = await Promise.all([
    construirEvidenciasDesdeOneDrive(completa.extintores),
    construirEvidenciasDesdeOneDrive(completa.camillas),
    construirEvidenciasDesdeOneDrive(completa.senalizaciones),
    construirEvidenciasDesdeOneDrive(completa.equiposTecnologicos),
    construirEvidenciasDesdeOneDrive(completa.botiquines)
  ]);

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
    botiquines: completa.botiquines
  };

  const aprobaciones = {
    inspector: { nombre: row.aprobacion_inspector_nombre },
    jefe: { nombre: row.aprobacion_jefe_nombre },
    copasst: { nombre: row.aprobacion_copasst_nombre }
  };

  const pdfBuffer = await crearPdfInspeccionExtintor(
    data,
    ext.evidenciasPorIndex, cam.evidenciasPorIndex, sen.evidenciasPorIndex, eqp.evidenciasPorIndex, bot.evidenciasPorIndex,
    {},
    {
      aprobaciones,
      fechasPrecomputadas: {
        extintores: ext.fechas,
        camillas: cam.fechas,
        senalizaciones: sen.fechas,
        equipos: eqp.fechas,
        botiquines: bot.fechas
      }
    }
  );

  const webUrl = await subirPdfAOneDrive(pdfBuffer, row.inspeccion_id);

  const correoDestino = resolverCorreoDestino(row.sede_operacion, null);
  if (correoDestino) {
    const html = construirHtmlCorreo({
      inspeccionId: row.inspeccion_id,
      numInspeccion: Number(row.num_inspeccion),
      fecha: row.fecha,
      sedeOperacion: row.sede_operacion,
      areaTrabajo: row.area_trabajo,
      jefeResponsable: row.jefe_responsable,
      responsableInspeccion: row.responsable_inspeccion,
      cargoResponsable: row.cargo_responsable,
      webUrl,
      titulo: "Inspección aprobada"
    });

    await enviarCorreoPorGraph({
      to: correoDestino,
      subject: `Inspección SST aprobada N.° ${row.num_inspeccion} – ${row.inspeccion_id}`,
      html,
      pdfBuffer,
      nombre: `${row.inspeccion_id}.pdf`
    });
  }

  await marcarInspeccionEnviada(row.inspeccion_id, webUrl);
}

module.exports = {
  obtenerResumenAprobacion,
  previsualizarAprobacion,
  registrarAprobacion
};
