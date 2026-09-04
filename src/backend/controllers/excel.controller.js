const {
  actualizarExcelSeguimientoEppEnOneDrive,
} = require("../services/seguimientoEppExcel.service");

const {
  sincronizarCierresDesdeExcelEpp,
} = require("../services/sincronizacionEppExcel.service");

const {
  actualizarExcelSeguimientoSstEnOneDrive,
} = require("../services/seguimientoSstExcel.service");

/**
 * Ejecuta manualmente la actualización del Excel de seguimiento EPP.
 *
 * Delega la sincronización y generación del archivo al servicio correspondiente
 * y devuelve la ruta, el estado utilizado como filtro y el tamaño del archivo.
 *
 * Corresponde al endpoint POST /api/excel/epp/actualizar-onedrive.
 *
 * @async
 * @param {Object} req Solicitud HTTP de Express.
 * @param {Object} res Respuesta HTTP de Express.
 * @returns {Promise<Object>} Respuesta exitosa con los datos del archivo;
 * estado 423 si está bloqueado en OneDrive o 500 si falla la actualización.
 */

async function actualizarExcelSeguimientoEpp(req, res) {
  try {
    const resultado = await actualizarExcelSeguimientoEppEnOneDrive();

    return res.status(200).json({
      ok: true,
      mensaje: "Excel EPP actualizado correctamente en OneDrive.",
      resultado: {
        rutaExcel: resultado.rutaExcel,
        estadoInspecciones: resultado.estadoInspecciones,
        tamañoBytes: resultado.tamañoBytes,
      },
    });
  } catch (error) {
    console.error("[Excel EPP] Error en actualización manual:", error);

    const mensaje =
      error instanceof Error
        ? error.message
        : "No fue posible actualizar el Excel EPP";

    const archivoBloqueado = mensaje.toLowerCase().includes("locked");

    if (archivoBloqueado) {
      return res.status(423).json({
        ok: false,
        codigo: "ARCHIVO_BLOQUEADO",
        mensaje:
          "El archivo está abierto o bloqueado en OneDrive. Ciérrelo y vuelva a intentarlo.",
      });
    }

    return res.status(500).json({
      ok: false,
      codigo: "ERROR_ACTUALIZACION",
      mensaje: "No fue posible actualizar el Excel EPP en OneDrive.",
    });
  }
}

/**
 * Ejecuta manualmente la actualización del Excel de seguimiento SST.
 *
 * Delega la actualización completa del archivo XLSM y devuelve su ruta junto
 * con el resultado de la validación de conservación de macros.
 *
 * Corresponde al endpoint POST /api/excel/sst/actualizar-onedrive.
 *
 * @async
 * @param {Object} req Solicitud HTTP de Express.
 * @param {Object} res Respuesta HTTP de Express.
 * @returns {Promise<Object>} Respuesta exitosa con los datos del archivo;
 * estado 423 si está bloqueado en OneDrive o 500 si falla la actualización.
 */

async function actualizarExcelSeguimientoSst(req, res) {
  try {
    const resultado = await actualizarExcelSeguimientoSstEnOneDrive();

    return res.status(200).json({
      ok: true,
      mensaje: "Excel SST actualizado correctamente en OneDrive.",
      resultado: {
        rutaExcel: resultado.rutaExcel,
        macrosConservadas: resultado.macrosConservadas,
      },
    });
  } catch (error) {
    console.error("[Excel SST] Error en actualización manual:", error);

    const mensaje =
      error instanceof Error
        ? error.message
        : "No fue posible actualizar el Excel SST";

    if (mensaje.toLowerCase().includes("locked")) {
      return res.status(423).json({
        ok: false,
        codigo: "ARCHIVO_BLOQUEADO",
        mensaje:
          "El archivo SST está abierto o bloqueado en OneDrive. Ciérrelo y vuelva a intentarlo.",
      });
    }

    return res.status(500).json({
      ok: false,
      codigo: "ERROR_ACTUALIZACION_SST",
      mensaje: "No fue posible actualizar el Excel SST en OneDrive.",
    });
  }
}

/**
 * Sincroniza manualmente los cierres registrados en el Excel EPP.
 *
 * Lee los planes marcados como cumplidos, actualiza los registros
 * correspondientes en la base de datos y devuelve el resumen del proceso.
 *
 * Corresponde al endpoint POST /api/excel/epp/sincronizar-cierres.
 *
 * @async
 * @param {Object} req Solicitud HTTP de Express.
 * @param {Object} res Respuesta HTTP de Express.
 * @returns {Promise<Object>} Respuesta con los cierres detectados y
 * actualizados, o estado 500 si la sincronización falla.
 */

async function sincronizarCierresExcelEpp(req, res) {
  try {
    const resultado = await sincronizarCierresDesdeExcelEpp();

    const cantidadActualizados = resultado.actualizados?.length || 0;

    return res.json({
      ok: true,
      mensaje:
        cantidadActualizados > 0
          ? `${cantidadActualizados} plan(es) actualizado(s)`
          : "No se encontraron nuevos cierres",
      ...resultado,
    });
  } catch (error) {
    console.error("[Excel EPP] Error sincronizando cierres:", error);

    return res.status(500).json({
      ok: false,
      mensaje: error.message || "No se pudieron sincronizar los cierres EPP",
      erroresExcel: error.erroresExcel || [],
    });
  }
}

module.exports = {
  actualizarExcelSeguimientoEpp,
  actualizarExcelSeguimientoSst,
  sincronizarCierresExcelEpp,
};
