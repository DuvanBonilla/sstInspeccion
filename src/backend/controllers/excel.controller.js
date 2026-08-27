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
    const secretoConfigurado =
      process.env.AZURE_EPP_SYNC_SECRET;

    if (!secretoConfigurado) {
      console.error(
        "[EPP Sync] AZURE_EPP_SYNC_SECRET no está configurado",
      );

      return res.status(500).json({
        ok: false,
        mensaje:
          "La sincronización EPP no está configurada",
      });
    }

    const autorizacion =
      String(req.headers.authorization || "");

    const secretoRecibido =
      autorizacion.startsWith("Bearer ")
        ? autorizacion.slice(7).trim()
        : "";

    if (
      !secretoRecibido
      || secretoRecibido !== secretoConfigurado
    ) {
      return res.status(401).json({
        ok: false,
        mensaje: "No autorizado",
      });
    }

    const resultado =
      await sincronizarCierresDesdeExcelEpp();

    console.log(
      "[EPP Sync] Sincronización terminada:",
      resultado,
    );

    return res.status(200).json({
      ok: true,
      mensaje:
        resultado.actualizados.length > 0
          ? `${resultado.actualizados.length} plan(es) actualizado(s)`
          : "No se encontraron nuevos cierres",
      ...resultado,
    });
  } catch (error) {
    console.error(
      "[EPP Sync] No fue posible sincronizar:",
      error,
    );

    const mensaje =
      error instanceof Error
        ? error.message
        : "No fue posible sincronizar el Excel EPP";

    const archivoBloqueado =
      mensaje.toLowerCase().includes("locked")
      || mensaje.toLowerCase().includes("bloqueado");

    return res
      .status(archivoBloqueado ? 423 : 500)
      .json({
        ok: false,
        mensaje: archivoBloqueado
          ? "El Excel EPP está abierto o bloqueado. Guarda los cambios, ciérralo e inténtalo nuevamente."
          : mensaje,
      });
  }
}

module.exports = {
  actualizarExcelSeguimientoEpp,
  sincronizarCierresExcelEpp,
};