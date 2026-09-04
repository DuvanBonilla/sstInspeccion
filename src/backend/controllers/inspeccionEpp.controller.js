const { leerPayload } = require("../utils/request.utils");

const {
  validarInspeccionEpp,
  validarEvidenciaTrabajador,
} = require("../validators/inspeccionEpp.validator");

const { guardarInspeccionEppEnDB } = require("../models/inspeccionEpp.model");

const { uploadEvidenceToOneDrive } = require("../services/evidencia.service");

const { resolverFechaEvidencia } = require("../utils/fechaEvidencia");

/**
 * Obtiene los archivos adjuntos recibidos en la solicitud.
 *
 * Normaliza las diferentes estructuras que puede generar Multer y devuelve
 * todos los archivos en un único arreglo. Si la solicitud no contiene
 * archivos, devuelve un arreglo vacío.
 *
 * @param {Object} req Solicitud HTTP de Express.
 * @param {(Array<Object>|Object)} [req.files] Archivos procesados por Multer.
 * @returns {Array<Object>} Lista normalizada de archivos recibidos.
 */

function obtenerArchivos(req) {
  if (Array.isArray(req.files)) {
    return req.files;
  }

  if (req.files && typeof req.files === "object") {
    return Object.values(req.files).flat();
  }

  return [];
}

/**
 * Registra una inspección de elementos de protección personal.
 *
 * Lee y valida la información general de la inspección y los datos de los
 * trabajadores evaluados. Para cada trabajador, localiza y valida su evidencia,
 * la almacena en OneDrive, determina la fecha de la imagen y relaciona los
 * datos obtenidos con el trabajador correspondiente.
 *
 * Finalmente, guarda la inspección EPP en la base de datos y devuelve su
 * identificador, número consecutivo y tokens de aprobación.
 *
 * Corresponde al endpoint POST /enviar-inspeccion-epp.
 *
 * @async
 * @param {Object} req Solicitud HTTP de Express.
 * @param {Object} req.body Datos enviados desde el formulario EPP.
 * @param {(Array<Object>|Object)} [req.files] Evidencias recibidas mediante Multer.
 * @param {Object} res Respuesta HTTP de Express.
 * @returns {Promise<Object>} Respuesta HTTP con el resultado del registro;
 * estado 400 si la información o las evidencias son inválidas, estado 201 si
 * la inspección se registra correctamente o estado 500 si ocurre un error.
 */

async function enviarInspeccionEpp(req, res) {
  try {


    const payload = leerPayload(req);


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


    const archivos = obtenerArchivos(req);



    for (let i = 0; i < trabajadores.length; i++) {
      const trabajador = trabajadores[i];



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


      const lastModified = req.body?.[`${nombreCampo}_lastmod`];



      const evidenciaOneDrive = await uploadEvidenceToOneDrive(
        archivo,
        "EPP",
        i + 1,
        general.inspeccionId,
      );

      const evidenciaRuta = evidenciaOneDrive.ruta || "";
      const evidenciaUrl = evidenciaOneDrive.webUrl || "";



      const evidenciaFecha = await resolverFechaEvidencia(
        archivo,
        lastModified,
      );



      trabajador.evidenciaRuta = evidenciaRuta || "";

      trabajador.evidenciaUrl = evidenciaUrl || "";

      trabajador.evidenciaArchivo = evidenciaRuta
        ? evidenciaRuta.split("/").pop() || ""
        : "";

      trabajador.evidenciaFecha = evidenciaFecha;
    }



    const resultado = await guardarInspeccionEppEnDB({
      general,
      trabajadores,
    });



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


module.exports = {
  enviarInspeccionEpp,
};
