const { leerPayload } = require("../utils/request.utils");

const {
  validarInspeccionEpp,
  validarEvidenciaTrabajador,
} = require("../validators/inspeccionEpp.validator");

const { guardarInspeccionEppEnDB } = require("../models/inspeccionEpp.model");

const { uploadEvidenceToOneDrive } = require("../services/evidencia.service");

const { resolverFechaEvidencia } = require("../utils/fechaEvidencia");

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
      console.log("❌ ERRORES VALIDACIÓN EPP:");
      console.log(validacion.errores);
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

      const validacionEvidencia = validarEvidenciaTrabajador(archivo, i + 1);

      if (!validacionEvidencia.ok) {
        return res.status(400).json({
          ok: false,
          mensaje: "La evidencia EPP contiene información inválida.",
          errores: validacionEvidencia.errores,
        });
      }

      const archivoValidado = validacionEvidencia.data;

      /* -----------------------------------------------------
     LAST MODIFIED
  ----------------------------------------------------- */

      const lastModified = req.body?.[`${nombreCampo}_lastmod`];

      /* -----------------------------------------------------
     SUBIR A ONEDRIVE
  ----------------------------------------------------- */

      const evidenciaOneDrive = await uploadEvidenceToOneDrive(
        archivo,
        "EPP",
        i + 1,
        general.inspeccionId,
      );

      const evidenciaRuta = evidenciaOneDrive.ruta || "";
      const evidenciaUrl = evidenciaOneDrive.webUrl || "";

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

      trabajador.evidenciaUrl = evidenciaUrl || "";

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
