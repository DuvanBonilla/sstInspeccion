const {
  ejecutarProcesoDiarioAlertasEpp,
} = require(
  "../services/alertasEpp.service",
);

async function ejecutarAlertasEppDiarias(
  req,
  res,
) {
  try {
    const resultado =
      await ejecutarProcesoDiarioAlertasEpp();

    console.log(
      "[Alertas EPP] Proceso diario terminado:",
      resultado,
    );

    return res.status(200).json({
      ok: true,

      mensaje:
        resultado.alertas.enviado
          ? "Consolidado EPP enviado correctamente"
          : resultado.alertas.motivo,

      resultado,
    });
  } catch (error) {
    console.error(
      "[Alertas EPP] Error en proceso diario:",
      error,
    );

    const mensaje =
      error instanceof Error
        ? error.message
        : "No fue posible ejecutar las alertas EPP";

    const archivoBloqueado =
      mensaje.toLowerCase().includes("locked")
      || mensaje
        .toLowerCase()
        .includes("bloqueado");

    const erroresExcel =
      Array.isArray(error?.erroresExcel)
        ? error.erroresExcel
        : [];

    if (archivoBloqueado) {
      return res.status(423).json({
        ok: false,
        codigo: "ARCHIVO_BLOQUEADO",
        mensaje:
          "El Excel EPP está abierto o bloqueado en OneDrive",
      });
    }

    if (erroresExcel.length > 0) {
      return res.status(422).json({
        ok: false,
        codigo: "EXCEL_EPP_INVALIDO",
        mensaje,
        erroresExcel,
      });
    }

    return res.status(500).json({
      ok: false,
      codigo: "ERROR_ALERTAS_EPP",
      mensaje,
    });
  }
}

module.exports = {
  ejecutarAlertasEppDiarias,
};