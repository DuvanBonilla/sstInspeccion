const { enviarCorreoPorGraph } = require("./correo.service");

const CORREO_DESTINATARIO_REINICIO = "s.ocupacional@cargoban.com.co";
const LOGO_URL = "https://sstinspeccion.onrender.com/img/Cargo.png";

function escaparHtml(valor) {
  return String(valor ?? "-")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatearFechaVencimiento(fecha) {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Bogota",
  }).format(new Date(fecha));
}

/**
 * Construye el correo de autorización para reiniciar aprobaciones.
 *
 * @param {Object} datos
 * @returns {string}
 */
function construirHtmlCorreoReinicioAprobaciones({
  inspeccion,
  codigo,
  venceEn,
}) {
  const tipoInspeccion =
    inspeccion.tipo_inspeccion === "EPP" ? "Inspección EPP" : "Inspección SST";

  const fechaVencimiento = formatearFechaVencimiento(venceEn);

  return `<!DOCTYPE html>
<html lang="es">
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;">
          <tr>
            <td style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);">

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#1a2e4a;height:6px;font-size:0;">&nbsp;</td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:28px 40px 0;text-align:center;">
                    <img src="${LOGO_URL}" alt="Cargoban" style="height:60px;width:auto;" />
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:30px 40px 20px;">
                    <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#6b7280;">Autorización de seguridad</p>
                    <h1 style="margin:0 0 14px;font-size:22px;font-weight:700;color:#111827;line-height:1.3;">Solicitud de reinicio de aprobaciones</h1>
                    <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#1a2e4a;">Inspección N.° ${escaparHtml(inspeccion.inspecciones_id)}</p>
                    <span style="display:inline-block;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:8px;padding:7px 14px;font-size:13px;font-weight:700;color:#1a2e4a;letter-spacing:.5px;font-family:monospace;">${escaparHtml(inspeccion.inspeccion_id)}</span>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13.5px;">
                <tr>
                  <td style="padding:14px 40px;color:#6b7280;font-weight:600;width:44%;border-top:1px solid #f3f4f6;">Tipo</td>
                  <td style="padding:14px 40px 14px 0;color:#111827;border-top:1px solid #f3f4f6;">${tipoInspeccion}</td>
                </tr>
                <tr style="background:#fafafa;">
                  <td style="padding:14px 40px;color:#6b7280;font-weight:600;">Fecha</td>
                  <td style="padding:14px 40px 14px 0;color:#111827;">${escaparHtml(inspeccion.fecha)}</td>
                </tr>
                <tr>
                  <td style="padding:14px 40px;color:#6b7280;font-weight:600;">Sede</td>
                  <td style="padding:14px 40px 14px 0;color:#111827;">${escaparHtml(inspeccion.sede_operacion)}</td>
                </tr>
                <tr style="background:#fafafa;">
                  <td style="padding:14px 40px;color:#6b7280;font-weight:600;">Área de trabajo</td>
                  <td style="padding:14px 40px 14px 0;color:#111827;">${escaparHtml(inspeccion.area_trabajo)}</td>
                </tr>
                <tr>
                  <td style="padding:14px 40px;color:#6b7280;font-weight:600;">Estado actual</td>
                  <td style="padding:14px 40px 14px 0;color:#111827;">Pendiente de aprobación</td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-top:1px solid #f3f4f6;padding:28px 40px 12px;text-align:center;">
                    <p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#6b7280;">Código de autorización</p>
                    <p style="margin:0;padding:16px 20px;background:#eef3f8;border:1px dashed #1a2e4a;border-radius:10px;font-size:32px;letter-spacing:10px;font-weight:700;color:#1a2e4a;font-family:monospace;">${escaparHtml(codigo)}</p>
                    <p style="margin:16px 0 0;font-size:13px;color:#6b7280;line-height:1.6;">Este código vence el <strong style="color:#111827;">${escaparHtml(fechaVencimiento)}</strong> y solo puede utilizarse una vez.</p>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:12px 40px 28px;">
                    <div style="background:#fff7ed;border-left:4px solid #d97706;border-radius:4px;padding:14px 16px;">
                      <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#92400e;">Importante</p>
                      <p style="margin:0;font-size:13px;line-height:1.6;color:#78350f;">Al confirmar esta operación se eliminarán las aprobaciones existentes del Jefe de Área y COPASST. Los datos registrados en la inspección se conservarán.</p>
                    </div>
                    <p style="margin:16px 0 0;font-size:12px;line-height:1.6;color:#6b7280;">Cargoban OLP 2026.</p>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-top:1px solid #f3f4f6;padding:14px 40px;text-align:center;">
                    <p style="margin:0;font-size:11px;color:#9ca3af;">Este es un mensaje automático · Por favor no responder</p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Envía el código temporal al correo de trazabilidad.
 *
 * @param {Object} datos
 * @returns {Promise<void>}
 */
async function enviarCodigoReinicioAprobaciones({
  inspeccion,
  codigo,
  venceEn,
  enviarCorreo = enviarCorreoPorGraph,
}) {
  await enviarCorreo({
    to: CORREO_DESTINATARIO_REINICIO,
    subject: `Código para reiniciar aprobaciones — Inspección N.° ${inspeccion.inspecciones_id}`,
    html: construirHtmlCorreoReinicioAprobaciones({
      inspeccion,
      codigo,
      venceEn,
    }),
  });
}

module.exports = {
  CORREO_DESTINATARIO_REINICIO,
  construirHtmlCorreoReinicioAprobaciones,
  enviarCodigoReinicioAprobaciones,
};