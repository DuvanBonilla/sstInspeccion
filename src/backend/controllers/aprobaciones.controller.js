// Ruta: src/backend/controllers/aprobaciones.controller.js
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
  - finalizarInspeccion() vive en services/finalizacionInspeccion.service.js:
    descarga de OneDrive las evidencias ya subidas, regenera el PDF con el
    nombre de cada rol incrustado, lo archiva en OneDrive (Respuestas_PDF) y
    envía el correo — recién en este punto, no antes.

  Cómo interactúa:
  - Este controlador NO hace SQL directo ni abre conexiones: toda lectura/escritura
    del estado de aprobación pasa por aprobaciones.model.js (incluida la
    transacción de reinicio mediante conectarTransaccion), y los datos de la
    inspección por inspeccion.model.js (obtenerInspeccionCompleta).
  - La orquestación del cierre (PDF, OneDrive, correo, Excel) está en
    finalizacionInspeccion.service.js.
  - Es registrado en routes/aprobaciones.routes.js.
*/
const {
  obtenerContextoAprobacion,
  guardarAprobacion,
  reiniciarAprobacionesPendientes,
  obtenerInspeccionPendienteParaReinicio,
  invalidarCodigosReinicioActivos,
  crearCodigoReinicio,
  obtenerCodigoReinicioActivo,
  registrarIntentoCodigoReinicio,
  marcarCodigoReinicioUsado,
  conectarTransaccion,
} = require("../models/aprobaciones.model");

const {
  generarCodigoReinicio,
  crearHashCodigoReinicio,
  calcularVencimientoCodigo,
  validarCodigoReinicio,
} = require("../services/codigoReinicioAprobaciones.service");

const {
  enviarCodigoReinicioAprobaciones,
} = require("../services/correoReinicioAprobaciones.service");

const crypto = require("node:crypto");

const { obtenerInspeccionCompleta } = require("../models/inspeccion.model");

const {
  construirEvidenciasDesdeOneDrive,
  construirEvidenciasEppDesdeOneDrive,
} = require("../shared/services/evidencia.service");
const {
  generarPdfSstAprobacion,
} = require("../services/pdfInspeccion.service");
const {
  generarPdfEppAprobacion,
} = require("../services/pdfInspeccionEpp.service");

const { calcularResumenEpp } = require("../services/resumenEpp.service");

const {
  construirAprobaciones,
  finalizarInspeccion,
} = require("../services/finalizacionInspeccion.service");

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
    if (/\d/.test(String(nombre))) {
      return res.status(400).json({
        ok: false,
        errores: ["El nombre no puede contener números."],
      });
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
 * Reinicia directamente las aprobaciones de Jefe de Área y COPASST.
 *
 * Conserva la aprobación del inspector y permite reutilizar los enlaces
 * existentes. Solo opera sobre inspecciones en estado pendiente de aprobación
 * y exige el código administrativo configurado en el servidor.
 *
 * Corresponde al endpoint POST /api/inspecciones/:id/reiniciar-aprobaciones.
 *
 * @async
 * @param {Object} req Solicitud HTTP de Express.
 * @param {Object} req.params Parámetros recibidos en la URL.
 * @param {string} req.params.id Identificador de la inspección.
 * @param {Object} req.body Datos enviados en la solicitud.
 * @param {string} req.body.codigo Código administrativo de validación.
 * @param {Object} res Respuesta HTTP de Express.
 * @returns {Promise<Object>} Respuesta con la inspección reiniciada; 403 si el
 * código es inválido, 409 si no puede reiniciarse o 500 si ocurre un error.
 */
async function reiniciarAprobaciones(req, res) {
  const codigoConfigurado = String(
    process.env.CODIGO_REINICIO_APROBACIONES || "",
  );

  const codigoRecibido = String(req.body?.codigo || "");

  if (!codigoConfigurado) {
    return res.status(503).json({
      ok: false,
      mensaje: "El código de reinicio no está configurado en el servidor.",
    });
  }

  const recibido = Buffer.from(codigoRecibido);
  const configurado = Buffer.from(codigoConfigurado);

  const codigoValido =
    recibido.length === configurado.length &&
    crypto.timingSafeEqual(recibido, configurado);

  if (!codigoValido) {
    return res.status(403).json({
      ok: false,
      mensaje: "Código de validación incorrecto.",
    });
  }

  try {
    const inspeccion = await reiniciarAprobacionesPendientes(req.params.id);

    if (!inspeccion) {
      return res.status(409).json({
        ok: false,
        mensaje:
          "Solo es posible reiniciar una inspección pendiente de aprobación.",
      });
    }

    return res.json({
      ok: true,
      mensaje:
        "Se borraron las aprobaciones de Jefe de Área y COPASST. Los enlaces existentes pueden usarse nuevamente.",
      inspeccionId: inspeccion.inspeccion_id,
      numInspeccion: Number(inspeccion.inspecciones_id),
    });
  } catch (error) {
    console.error("[aprobaciones] Error reiniciando aprobaciones:", error);

    return res.status(500).json({
      ok: false,
      mensaje: "No fue posible reiniciar las aprobaciones.",
    });
  }
}

/**
 * Solicita un código temporal para reiniciar aprobaciones.
 *
 * Verifica que la inspección esté pendiente, invalida códigos anteriores,
 * crea un código de autorización y lo envía al correo de trazabilidad.
 *
 * Corresponde al endpoint POST
 * /api/inspecciones/:id/reinicio-aprobaciones/solicitar-codigo.
 *
 * @async
 * @param {Object} req Solicitud HTTP de Express.
 * @param {Object} req.params Parámetros recibidos en la URL.
 * @param {string} req.params.id Identificador de la inspección.
 * @param {Object} res Respuesta HTTP de Express.
 * @returns {Promise<Object>} Respuesta con la fecha de vencimiento del código;
 * 409 si la inspección no está pendiente, 502 si falla el correo o 500 si
 * ocurre un error.
 */

async function solicitarCodigoReinicioAprobaciones(req, res) {
  const inspeccionId = String(req.params.id || "").trim();

  try {
    const inspeccion =
      await obtenerInspeccionPendienteParaReinicio(inspeccionId);

    if (!inspeccion) {
      return res.status(409).json({
        ok: false,
        mensaje:
          "La inspección no existe o ya no está pendiente de aprobación.",
      });
    }

    const codigo = generarCodigoReinicio();
    const { hash, salt } = crearHashCodigoReinicio(codigo);
    const venceEn = calcularVencimientoCodigo();

    // Un código nuevo invalida cualquier código anterior aún activo.
    await invalidarCodigosReinicioActivos(
      inspeccion.inspecciones_id,
      inspeccion.tipo_inspeccion,
    );

    await crearCodigoReinicio({
      inspeccionesId: inspeccion.inspecciones_id,
      tipoInspeccion: inspeccion.tipo_inspeccion,
      codigoHash: hash,
      codigoSalt: salt,
      venceEn,
    });

    try {
      await enviarCodigoReinicioAprobaciones({
        inspeccion,
        codigo,
        venceEn,
      });
    } catch (error) {
      // Si Graph falla, ningún código queda habilitado.
      await invalidarCodigosReinicioActivos(
        inspeccion.inspecciones_id,
        inspeccion.tipo_inspeccion,
      );

      console.error(
        "No fue posible enviar el correo de reinicio de aprobaciones:",
        error.message,
      );

      return res.status(502).json({
        ok: false,
        mensaje:
          "No fue posible enviar el código de autorización. Inténtelo nuevamente.",
      });
    }

    return res.status(201).json({
      ok: true,
      mensaje:
        "El código de autorización fue enviado al correo de trazabilidad.",
      venceEn: venceEn.toISOString(),
    });
  } catch (error) {
    console.error(
      "Error al solicitar código para reiniciar aprobaciones:",
      error,
    );

    return res.status(500).json({
      ok: false,
      mensaje: "No fue posible solicitar el código de autorización.",
    });
  }
}

/**
 * Verifica un código temporal y reinicia las aprobaciones de una inspección.
 *
 * Ejecuta el proceso dentro de una transacción: valida el código, registra
 * intentos fallidos cuando corresponde, marca el código como usado y limpia
 * las aprobaciones de Jefe de Área y COPASST.
 *
 * Corresponde al endpoint POST
 * /api/inspecciones/:id/reinicio-aprobaciones/confirmar.
 *
 * @async
 * @param {Object} req Solicitud HTTP de Express.
 * @param {Object} req.params Parámetros recibidos en la URL.
 * @param {string} req.params.id Identificador de la inspección.
 * @param {Object} req.body Datos enviados en la solicitud.
 * @param {string} req.body.codigo Código temporal de seis dígitos.
 * @param {Object} res Respuesta HTTP de Express.
 * @returns {Promise<Object>} Respuesta con la inspección reiniciada; 400 si el
 * código es inválido, 404 si no existe un código activo, 409 si expiró o no se
 * puede reiniciar, o 500 si ocurre un error.
 */

async function confirmarReinicioAprobaciones(req, res) {
  const inspeccionId = String(req.params.id || "").trim();
  const codigo = String(req.body?.codigo || "").trim();

  if (!/^\d{6}$/.test(codigo)) {
    return res.status(400).json({
      ok: false,
      mensaje: "Ingrese un código válido de seis dígitos.",
    });
  }

  const transaccion = await conectarTransaccion();
  let transaccionIniciada = false;

  try {
    await transaccion.iniciar();
    transaccionIniciada = true;

    const ejecutarConsulta = transaccion.ejecutarConsulta;

    const inspeccion = await obtenerInspeccionPendienteParaReinicio(
      inspeccionId,
      ejecutarConsulta,
    );

    if (!inspeccion) {
      await transaccion.revertir();
      transaccionIniciada = false;

      return res.status(409).json({
        ok: false,
        mensaje:
          "La inspección no existe o ya no está pendiente de aprobación.",
      });
    }

    const registroCodigo = await obtenerCodigoReinicioActivo(
      inspeccion.inspecciones_id,
      inspeccion.tipo_inspeccion,
      ejecutarConsulta,
    );

    if (!registroCodigo) {
      await transaccion.revertir();
      transaccionIniciada = false;

      return res.status(404).json({
        ok: false,
        mensaje:
          "No hay un código de autorización activo para esta inspección.",
      });
    }

    const validacion = validarCodigoReinicio({
      codigo,
      hash: registroCodigo.codigo_hash,
      salt: registroCodigo.codigo_salt,
      venceEn: registroCodigo.vence_en,
      intentos: registroCodigo.intentos,
      usadoEn: registroCodigo.usado_en,
    });

    if (!validacion.valido) {
      if (validacion.motivo === "INCORRECTO") {
        const intento = await registrarIntentoCodigoReinicio(
          registroCodigo.codigo_reinicio_id,
          ejecutarConsulta,
        );

        await transaccion.confirmar();
        transaccionIniciada = false;

        const agotado = intento?.intentos >= 5;

        return res.status(400).json({
          ok: false,
          mensaje: agotado
            ? "Código incorrecto. Se agotaron los intentos permitidos."
            : "El código ingresado es incorrecto.",
          intentosRestantes: agotado ? 0 : 5 - (intento?.intentos || 0),
        });
      }

      await transaccion.revertir();
      transaccionIniciada = false;

      const mensajes = {
        EXPIRADO: "El código de autorización ha vencido.",
        BLOQUEADO:
          "Se agotaron los intentos permitidos. Solicite un nuevo código.",
        UTILIZADO: "El código de autorización ya fue utilizado.",
      };

      return res.status(409).json({
        ok: false,
        mensaje:
          mensajes[validacion.motivo] ||
          "El código de autorización no es válido.",
      });
    }

    const codigoUsado = await marcarCodigoReinicioUsado(
      registroCodigo.codigo_reinicio_id,
      ejecutarConsulta,
    );

    if (!codigoUsado) {
      await transaccion.revertir();
      transaccionIniciada = false;

      return res.status(409).json({
        ok: false,
        mensaje: "El código ya no está disponible. Solicite uno nuevo.",
      });
    }

    const inspeccionReiniciada = await reiniciarAprobacionesPendientes(
      inspeccionId,
      ejecutarConsulta,
    );

    if (!inspeccionReiniciada) {
      await transaccion.revertir();
      transaccionIniciada = false;

      return res.status(409).json({
        ok: false,
        mensaje:
          "La inspección ya no está pendiente de aprobación y no puede reiniciarse.",
      });
    }

    await transaccion.confirmar();
    transaccionIniciada = false;

    return res.status(200).json({
      ok: true,
      mensaje: "Las aprobaciones fueron reiniciadas correctamente.",
      inspeccion: inspeccionReiniciada,
    });
  } catch (error) {
    if (transaccionIniciada) {
      await transaccion.revertir();
    }

    console.error("Error al confirmar reinicio de aprobaciones:", error);

    return res.status(500).json({
      ok: false,
      mensaje: "No fue posible confirmar el reinicio de aprobaciones.",
    });
  } finally {
    transaccion.liberar();
  }
}

module.exports = {
  obtenerResumenAprobacion,
  previsualizarAprobacion,
  registrarAprobacion,
  reiniciarAprobaciones,
  solicitarCodigoReinicioAprobaciones,
  confirmarReinicioAprobaciones,
};
