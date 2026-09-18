const LOGO_URL = "https://sstinspeccion.onrender.com/img/Cargo.png";

function escaparHtml(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function construirHtmlSolicitudAprobacion({
  tipoInspeccion,
  rol,
  numInspeccion,
  inspeccionId,
  fecha,
  sede,
  area,
  enlace,
}) {
  const url = new URL(enlace);

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("El enlace de aprobación debe ser HTTP o HTTPS");
  }

  const fila = (etiqueta, valor) => `
    <tr>
      <td style="padding:12px 20px;color:#52627a;border-bottom:1px solid #e8edf5">
        ${etiqueta}
      </td>
      <td style="padding:12px 20px;color:#182b49;border-bottom:1px solid #e8edf5">
        ${escaparHtml(valor)}
      </td>
    </tr>`;

  return `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"></head>
<body style="margin:0;background:#f3f6fb;font-family:Arial,sans-serif;color:#182b49">
  <div style="max-width:520px;margin:24px auto;background:#fff;border-top:5px solid #182b49;border-radius:8px;overflow:hidden">
    <div style="padding:28px 24px;text-align:center">
      <img src="${LOGO_URL}" alt="Cargoban" style="max-width:190px">
    </div>
    <div style="padding:0 24px 24px">
      <p style="font-size:12px;letter-spacing:2px;color:#52627a">
        INSPECCIÓN ${escaparHtml(tipoInspeccion)}
      </p>
      <h1 style="font-size:22px;margin:8px 0">Solicitud de aprobación</h1>
      <p>Rol de aprobación: ${escaparHtml(rol)}.</p>
      <p>Inspección N.º ${escaparHtml(numInspeccion)}</p>
      <p style="font-family:monospace">${escaparHtml(inspeccionId)}</p>
    </div>
    <table role="presentation" style="width:100%;border-collapse:collapse">
      ${fila("Fecha", fecha)}
      ${fila("Sede", sede)}
      ${fila("Área de trabajo", area)}
    </table>
    <div style="padding:28px 24px;text-align:center">
      <p>Revise la inspección y registre su aprobación mediante su enlace personal:</p>
      <a href="${escaparHtml(url.href)}"
         style="display:inline-block;padding:14px 20px;background:#182b49;color:#fff;text-decoration:none;border-radius:6px">
        Revisar y aprobar
      </a>
      <p style="font-size:12px;word-break:break-all">${escaparHtml(url.href)}</p>
      <p style="font-size:12px;color:#52627a">Este enlace es personal. No debe compartirlo con otras personas.</p>
    </div>
  </div>
</body>
</html>`;
}

module.exports = { construirHtmlSolicitudAprobacion };