const { leerPayload } = require("../utils/request.utils");
const { subirPdfAOneDrive } = require("../services/evidencia.service");
const {
  enviarCorreoPorGraph,
  resolverCorreoDestino,
  construirHtmlCorreo,
} = require("../services/correo.service");

const { optimizarPdf } = require("../utils/pdfOptimizer");
const {
  extraerEvidenciasPorIndex,
  crearPdfInspeccionExtintor,
} = require("../services/pdfInspeccion.service");

/**
 * Genera y devuelve un PDF de prueba de una inspección SST.
 *
 * Lee los datos del formulario, organiza las evidencias por sección, genera
 * el documento y aplica la optimización configurada. El PDF resultante se
 * devuelve al navegador como archivo descargable.
 *
 * Esta operación no almacena el documento en OneDrive ni envía correos.
 *
 * Corresponde al endpoint POST /pdf-prueba.
 *
 * @async
 * @param {Object} req Solicitud HTTP de Express.
 * @param {Object} req.body Datos enviados desde el formulario SST.
 * @param {Array<Object>} req.files Evidencias recibidas mediante Multer.
 * @param {Object} res Respuesta HTTP de Express.
 * @returns {Promise<Object>} PDF optimizado como descarga o estado 500 si
 * ocurre un error durante la generación.
 */

async function generarPdfPrueba(req, res) {
  try {
    const data = leerPayload(req);
    const evidenciasPorIndex = extraerEvidenciasPorIndex(
      req.files,
      "evidencia",
    );
    const evidenciasCamillaPorIndex = extraerEvidenciasPorIndex(
      req.files,
      "evidencia-camilla",
    );
    const evidenciasSenalizacionPorIndex = extraerEvidenciasPorIndex(
      req.files,
      "evidencia-senalizacion",
    );
    const evidenciasEquipoTecnologicoPorIndex = extraerEvidenciasPorIndex(
      req.files,
      "equipo-tecnologico-evidencia",
    );
    const evidenciasBotiquinPorIndex = extraerEvidenciasPorIndex(
      req.files,
      "botiquin-evidencia",
    );
    const pdfGenerado = await crearPdfInspeccionExtintor(
      data,
      evidenciasPorIndex,
      evidenciasCamillaPorIndex,
      evidenciasSenalizacionPorIndex,
      evidenciasEquipoTecnologicoPorIndex,
      evidenciasBotiquinPorIndex,
      req.body,
    );

    const nombrePdf = `${data?.inspeccionId || "inspeccion-sst"}.pdf`;

    const pdfFinal = await optimizarPdf(pdfGenerado, {
      profile: "inspection",
      fileName: nombrePdf,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${nombrePdf}"`);

    return res.status(200).send(pdfFinal);
  } catch (error) {
    const mensaje =
      error instanceof Error ? error.message : "Error generando PDF";
    return res.status(500).json({ ok: false, errores: [mensaje] });
  }
}

/**
 * Genera, almacena y envía por correo un PDF de prueba SST.
 *
 * Determina el destinatario según la sede, organiza las evidencias, genera y
 * optimiza el informe, lo almacena en OneDrive y posteriormente envía un correo
 * HTML con el PDF adjunto y el enlace al documento.
 *
 * Corresponde al endpoint POST /enviar-pdf-prueba-correo.
 *
 * @async
 * @param {Object} req Solicitud HTTP de Express.
 * @param {Object} req.body Datos del formulario y destinatario opcional.
 * @param {Array<Object>} req.files Evidencias recibidas mediante Multer.
 * @param {Object} res Respuesta HTTP de Express.
 * @returns {Promise<Object>} Confirmación del envío; estado 400 cuando no se
 * puede determinar el destinatario o estado 500 si falla el proceso.
 */

async function enviarPdfPruebaCorreo(req, res) {
  try {
    const data = leerPayload(req);
    const payloadData = data?.payload || data;

    const correoDestino = resolverCorreoDestino(
      payloadData?.sedeOperacion,
      data?.correoDestino,
    );

    if (!correoDestino) {
      return res.status(400).json({
        ok: false,
        errores: [
          "No se pudo determinar el destinatario. " +
            "Verifique la sede o defina GRAPH_EMAIL_TO_TEST en .env",
        ],
      });
    }

    const evidenciasPorIndex = extraerEvidenciasPorIndex(
      req.files,
      "evidencia",
    );

    const evidenciasCamillaPorIndex = extraerEvidenciasPorIndex(
      req.files,
      "evidencia-camilla",
    );

    const evidenciasSenalizacionPorIndex = extraerEvidenciasPorIndex(
      req.files,
      "evidencia-senalizacion",
    );

    const evidenciasEquipoTecnologicoPorIndex = extraerEvidenciasPorIndex(
      req.files,
      "equipo-tecnologico-evidencia",
    );

    const evidenciasBotiquinPorIndex = extraerEvidenciasPorIndex(
      req.files,
      "botiquin-evidencia",
    );

    const pdfGenerado = await crearPdfInspeccionExtintor(
      payloadData,
      evidenciasPorIndex,
      evidenciasCamillaPorIndex,
      evidenciasSenalizacionPorIndex,
      evidenciasEquipoTecnologicoPorIndex,
      evidenciasBotiquinPorIndex,
      req.body,
    );

    const nombrePdf = `${payloadData?.inspeccionId || "inspeccion-sst"}.pdf`;

    const pdfFinal = await optimizarPdf(pdfGenerado, {
      profile: "inspection",
      fileName: nombrePdf,
    });

    const numInspeccionCorreo = payloadData?.numInspeccion ?? null;

    const webUrl = await subirPdfAOneDrive(
      pdfFinal,
      payloadData?.inspeccionId,
      payloadData?.sedeOperacion,
    );

    const htmlFinal = construirHtmlCorreo({
      inspeccionId: payloadData?.inspeccionId,
      numInspeccion: numInspeccionCorreo,
      fecha: payloadData?.fecha,
      sedeOperacion: payloadData?.sedeOperacion,
      areaTrabajo: payloadData?.areaTrabajo,
      jefeResponsable: payloadData?.jefeResponsable,
      responsableInspeccion: payloadData?.responsableInspeccion,
      cargoResponsable: payloadData?.cargoResponsable,
      webUrl,
    });

    const subjectNum =
      numInspeccionCorreo != null ? `N.° ${numInspeccionCorreo} – ` : "";

    await enviarCorreoPorGraph({
      to: correoDestino,
      subject:
        `Inspección SST ${subjectNum}` + `${payloadData?.inspeccionId || ""}`,
      html: htmlFinal,
      pdfBuffer: pdfFinal,
      nombre: nombrePdf,
    });

    return res.status(200).json({
      ok: true,
      mensaje: `Correo enviado a ${correoDestino}`,
    });
  } catch (error) {
    const mensaje =
      error instanceof Error ? error.message : "Error enviando correo";

    return res.status(500).json({
      ok: false,
      errores: [mensaje],
    });
  }
}

module.exports = {
  generarPdfPrueba,
  enviarPdfPruebaCorreo,
};
