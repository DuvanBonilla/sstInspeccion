const { getAccessToken, getRequiredEnv } = require("./graph.service");

const LOGO_URL = "https://sstinspeccion.onrender.com/img/Cargo.png";



async function enviarCorreoPorGraph({
  to,
  subject,
  html,
  pdfBuffer,
  nombre = "inspeccion-sst.pdf",
}) {
  const token = await getAccessToken();
  const remitente = getRequiredEnv("ONEDRIVE_USER_ID");

  const emailBody = {
    message: {
      subject,
      body: {
        contentType: "HTML",
        content: html,
      },
      toRecipients: (Array.isArray(to) ? to : to.split(","))
        .map((addr) => addr.trim())
        .filter(Boolean)
        .map((addr) => ({ emailAddress: { address: addr } })),
      attachments: [
        {
          "@odata.type": "#microsoft.graph.fileAttachment",
          name: nombre,
          contentBytes: pdfBuffer.toString("base64"),
        },
      ],
    },
    saveToSentItems: true,
  };

  // Enviar correo
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(remitente)}/sendMail`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailBody),
    },
  );

  if (!response.ok) {
    const errorData = await response.json();
    const detail = errorData?.error?.message || `HTTP ${response.status}`;
    throw new Error(`Error enviando correo por Graph: ${detail}`);
  }
}

function resolverCorreoDestino(sedeOperacion, correoManual) {
  const sede = (sedeOperacion || "").toLowerCase().trim();
  if (sede.includes("santa marta")) return "jmmontenegro201@gmail.com";
  if (sede.includes("urab")) return "cargobanolp@cargoban.com.co";
  return correoManual || process.env.GRAPH_EMAIL_TO_TEST;
}

function construirHtmlCorreo({
  inspeccionId,
  numInspeccion,
  fecha,
  sedeOperacion,
  areaTrabajo,
  jefeResponsable,
  responsableInspeccion,
  cargoResponsable,
  webUrl,
  titulo = "Nueva inspección registrada",
}) {
  const htmlCorreo = `<!DOCTYPE html>
<html lang="es">
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px;">
  <tr><td align="center">
    <table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;">

      <!-- TARJETA PRINCIPAL -->
      <tr>
        <td style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);">

          <!-- FRANJA SUPERIOR -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="background:#1a2e4a;height:6px;font-size:0;">&nbsp;</td></tr>
          </table>

          <!-- LOGO (dentro de la tarjeta) -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:28px 40px 0;text-align:center;">
                <img src="${LOGO_URL}" alt="Cargoban" style="height:60px;width:auto;" />
              </td>
            </tr>
          </table>

          <!-- ENCABEZADO -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:32px 40px 20px;">
                <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#6b7280;">Inspección SST</p>
                <h1 style="margin:0 0 14px;font-size:22px;font-weight:700;color:#111827;line-height:1.3;">${titulo}</h1>
                ${numInspeccion != null ? `<p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#1a2e4a;">Inspección N.° ${numInspeccion}</p>` : ""}
                <span style="display:inline-block;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:8px;padding:7px 14px;font-size:13px;font-weight:700;color:#1a2e4a;letter-spacing:.5px;font-family:monospace;">${inspeccionId || "-"}</span>
              </td>
            </tr>
          </table>

          <!-- DIVISOR -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="border-top:1px solid #f3f4f6;font-size:0;">&nbsp;</td></tr>
          </table>

          <!-- TABLA DATOS -->
          <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13.5px;">
            <tr>
              <td style="padding:14px 40px;color:#6b7280;font-weight:600;width:44%;border-bottom:1px solid #f3f4f6;">Fecha</td>
              <td style="padding:14px 40px 14px 0;color:#111827;border-bottom:1px solid #f3f4f6;">${fecha || "-"}</td>
            </tr>
            <tr style="background:#fafafa;">
              <td style="padding:14px 40px;color:#6b7280;font-weight:600;border-bottom:1px solid #f3f4f6;">Sede</td>
              <td style="padding:14px 40px 14px 0;color:#111827;border-bottom:1px solid #f3f4f6;">${sedeOperacion || "-"}</td>
            </tr>
            <tr>
              <td style="padding:14px 40px;color:#6b7280;font-weight:600;border-bottom:1px solid #f3f4f6;">Área de trabajo</td>
              <td style="padding:14px 40px 14px 0;color:#111827;border-bottom:1px solid #f3f4f6;">${areaTrabajo || "-"}</td>
            </tr>
            <tr style="background:#fafafa;">
              <td style="padding:14px 40px;color:#6b7280;font-weight:600;border-bottom:1px solid #f3f4f6;">Jefe del área</td>
              <td style="padding:14px 40px 14px 0;color:#111827;border-bottom:1px solid #f3f4f6;">${jefeResponsable || "-"}</td>
            </tr>
            <tr>
              <td style="padding:14px 40px;color:#6b7280;font-weight:600;border-bottom:1px solid #f3f4f6;">Responsable inspección</td>
              <td style="padding:14px 40px 14px 0;color:#111827;border-bottom:1px solid #f3f4f6;">${responsableInspeccion || "-"}</td>
            </tr>
            <tr style="background:#fafafa;">
              <td style="padding:14px 40px;color:#6b7280;font-weight:600;">Cargo</td>
              <td style="padding:14px 40px 14px 0;color:#111827;">${cargoResponsable || "-"}</td>
            </tr>
          </table>

          <!-- PDF + BOTÓN -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="border-top:1px solid #f3f4f6;font-size:0;">&nbsp;</td></tr>
            <tr>
              <td style="padding:24px 40px 28px;text-align:center;">
                <p style="margin:0 0 16px;font-size:13px;color:#6b7280;line-height:1.6;">El informe completo está <strong style="color:#111827;">adjunto en PDF</strong> a este correo.</p>
                {{LINK_ONEDRIVE}}
              </td>
            </tr>
          </table>

          <!-- FOOTER (dentro de la tarjeta) -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="border-top:1px solid #f3f4f6;font-size:0;">&nbsp;</td></tr>
            <tr>
              <td style="padding:14px 40px;text-align:center;">
                <p style="margin:0;font-size:11px;color:#9ca3af;">Este es un mensaje automático · Por favor no responder</p>
              </td>
            </tr>
          </table>

        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;

  const linkHtml = webUrl
    ? `<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center"><a href="${webUrl}" style="display:inline-block;padding:12px 28px;background:#1a2e4a;color:#ffffff;text-decoration:none;border-radius:8px;font-size:13px;font-weight:600;letter-spacing:.3px;">Ver documento en OneDrive</a></td></tr></table>`
    : "";

  return htmlCorreo.replace("{{LINK_ONEDRIVE}}", linkHtml);
}

module.exports = {
  enviarCorreoPorGraph,
  resolverCorreoDestino,
  construirHtmlCorreo,
};
