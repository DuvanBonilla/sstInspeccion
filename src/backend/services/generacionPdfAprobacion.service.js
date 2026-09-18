const {
  construirEvidenciasEppDesdeOneDrive,
} = require("./evidencia.service");

const {
  generarPdfSstAprobacion,
} = require("./pdfInspeccion.service");

const {
  generarPdfEppAprobacion,
} = require("./pdfInspeccionEpp.service");

/**
 * Genera el PDF de aprobación de una inspección SST o EPP.
 *
 * @param {Object} datos
 * @param {Object} datos.completa Inspección completa.
 * @param {Object} datos.inspeccion Cabecera usada para las aprobaciones.
 * @param {Object} datos.aprobaciones Aprobaciones normalizadas.
 * @returns {Promise<Object>} PDF generado, tipo y trabajadores EPP.
 */
async function generarPdfAprobacion({
  completa,
  inspeccion,
  aprobaciones,
}) {
  const tipoInspeccion = String(
    inspeccion.tipo_inspeccion || "SST",
  ).toUpperCase();

  if (tipoInspeccion === "EPP") {
    const trabajadores = Array.isArray(completa.trabajadores)
      ? completa.trabajadores
      : [];

    const evidenciasPorTrabajador =
      await construirEvidenciasEppDesdeOneDrive(trabajadores);

    const resultadoEpp = await generarPdfEppAprobacion(
      completa,
      inspeccion,
      aprobaciones,
      evidenciasPorTrabajador,
    );

    return {
      pdfBuffer: resultadoEpp.pdf,
      tipoInspeccion,
      trabajadoresEpp: resultadoEpp.trabajadores,
    };
  }

  const pdfBuffer = await generarPdfSstAprobacion(
    completa,
    inspeccion,
    aprobaciones,
  );

  return {
    pdfBuffer,
    tipoInspeccion,
    trabajadoresEpp: [],
  };
}

module.exports = {
  generarPdfAprobacion,
};