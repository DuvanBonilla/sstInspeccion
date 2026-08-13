const {
  generarExcelSeguimientoEpp,
} = require("../services/seguimientoEppExcel.service");

async function descargarExcelSeguimientoEpp(req, res) {
  try {
    const buffer = await generarExcelSeguimientoEpp();

    const fecha = new Date()
      .toISOString()
      .slice(0, 10);

    const nombreArchivo =
      `Seguimiento_EPP_${fecha}.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${nombreArchivo}"`,
    );

    res.setHeader(
      "Content-Length",
      buffer.length,
    );

    return res.status(200).send(Buffer.from(buffer));
  } catch (error) {
    console.error(
      "Error generando Excel de seguimiento EPP:",
      error,
    );

    return res.status(500).json({
      ok: false,
      mensaje:
        error instanceof Error
          ? error.message
          : "No fue posible generar el Excel EPP",
    });
  }
}

module.exports = {
  descargarExcelSeguimientoEpp,
};