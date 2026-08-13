/*
  inspeccionEpp.controller.js

  Controlador para el envío de inspecciones EPP.

  Flujo:
  1. Recibe multipart/form-data.
  2. Lee el payload JSON.
  3. Valida la inspección.
  4. Relaciona cada evidencia con su trabajador.
  5. Sube las evidencias a OneDrive.
  6. Guarda la inspección completa en PostgreSQL.
*/

const {
  validarInspeccionEpp,
  guardarInspeccionEppEnDB,
} = require("../models/inspeccionEpp.model");

const { uploadEvidenceToOneDrive } = require("../models/inspeccion.model");

const { resolverFechaEvidencia } = require("../utils/fechaEvidencia");

/* =========================================================
   LEER PAYLOAD
========================================================= */

function leerPayload(req) {
  if (!req.body?.payload) {
    throw new Error("No se recibió el payload de la inspección EPP.");
  }

  try {
    return JSON.parse(req.body.payload);
  } catch (error) {
    throw new Error(
      "El payload de la inspección EPP no contiene un JSON válido.",
    );
  }
}

/* =========================================================
   OBTENER ARCHIVOS RECIBIDOS
========================================================= */

function obtenerArchivos(req) {
  if (Array.isArray(req.files)) {
    return req.files;
  }

  if (req.files && typeof req.files === "object") {
    return Object.values(req.files).flat();
  }

  return [];
}

/* =========================================================
   CONTROLADOR PRINCIPAL
========================================================= */

async function enviarInspeccionEpp(req, res) {
  try {
    /* -------------------------------------------------------
       1. LEER PAYLOAD
    ------------------------------------------------------- */

    const payload = leerPayload(req);
    
    /* -------------------------------------------------------
       2. VALIDAR
    ------------------------------------------------------- */

    const validacion = validarInspeccionEpp(payload);

    if (!validacion.ok) {
      return res.status(400).json({
        ok: false,
        mensaje: "La inspección EPP contiene información inválida.",
        errores: validacion.errores,
      });
    }

    const { general, trabajadores } = validacion.data;

    /* -------------------------------------------------------
       3. ARCHIVOS
    ------------------------------------------------------- */

    const archivos = obtenerArchivos(req);

    /* -------------------------------------------------------
       4. PROCESAR EVIDENCIAS
    ------------------------------------------------------- */

    for (let i = 0; i < trabajadores.length; i++) {
      const trabajador = trabajadores[i];

      /*
    Convención del FormData:

    evidencia_trabajador_0
    evidencia_trabajador_0_lastmod

    evidencia_trabajador_1
    evidencia_trabajador_1_lastmod

    ...
  */

      const nombreCampo = `evidencia_trabajador_${i}`;

      const archivo = archivos.find((file) => file.fieldname === nombreCampo);

      if (!archivo) {
        throw new Error(`No se recibió la evidencia del trabajador ${i + 1}.`);
      }

      /* -----------------------------------------------------
     LAST MODIFIED
  ----------------------------------------------------- */

      const lastModified = req.body?.[`${nombreCampo}_lastmod`];

      /* -----------------------------------------------------
     SUBIR A ONEDRIVE
  ----------------------------------------------------- */

      const evidenciaRuta = await uploadEvidenceToOneDrive(
        archivo,
        "EPP",
        i + 1,
        general.inspeccionId,
      );

      /* -----------------------------------------------------
     FECHA DE LA EVIDENCIA
     EXIF → lastModified → null
  ----------------------------------------------------- */

      const evidenciaFecha = await resolverFechaEvidencia(
        archivo,
        lastModified,
      );

      /* -----------------------------------------------------
     ASOCIAR AL TRABAJADOR
  ----------------------------------------------------- */

      trabajador.evidenciaRuta = evidenciaRuta || "";

      trabajador.evidenciaArchivo = evidenciaRuta
        ? evidenciaRuta.split("/").pop() || ""
        : "";

      trabajador.evidenciaFecha = evidenciaFecha;

    }

    /* -------------------------------------------------------
       5. GUARDAR EN BASE DE DATOS
    ------------------------------------------------------- */

    const resultado = await guardarInspeccionEppEnDB({
      general,
      trabajadores,
    });

    /* -------------------------------------------------------
       6. RESPUESTA
    ------------------------------------------------------- */

    return res.status(201).json({
      ok: true,

      mensaje: "Inspección EPP registrada correctamente.",

      inspeccionId: resultado.inspeccionId,

      numInspeccion: resultado.numInspeccion,

      tokens: resultado.tokens,
    });
  } catch (error) {
    console.error("❌ Error enviando inspección EPP:", error);

    return res.status(500).json({
      ok: false,

      mensaje:
        error.message || "Ocurrió un error al registrar la inspección EPP.",
    });
  }
}

/* =========================================================
   EXPORTACIONES
========================================================= */

module.exports = {
  enviarInspeccionEpp,
};
