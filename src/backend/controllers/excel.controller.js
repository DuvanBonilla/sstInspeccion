const {
  actualizarExcelSeguimientoEppEnOneDrive,
} = require("../services/seguimientoEppExcel.service");

const {
  sincronizarCierresDesdeExcelEpp,
} = require("../services/sincronizacionEppExcel.service");

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
  sincronizarCierresExcelEpp,
};
