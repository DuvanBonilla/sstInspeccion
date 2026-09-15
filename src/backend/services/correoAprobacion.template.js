const LOGO_URL = "https://sstinspeccion.onrender.com/img/Cargo.png";

function escapar(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function construirCorreoAprobacion({
  tipo,
  rol,
  numero,
  inspeccionId,
  fecha,
  sede,
  area,
  enlace,
}) {
  const url = new URL(enlace);

  if (url.protocol !== "https:") {
    throw new Error("El enlace de aprobación debe usar HTTPS.");
  }

  return `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"></head>
<body style="margin:0;background:#f4f7fb;font-family:Arial,sans-serif;color:#1c2d48">
  <div style="max-width:520px;margin:24px auto;background:#fff;border-top:5px solid #1c2d48">
    <div style="padding:28px;text-align:center">
      <img src="${LOGO_URL}" alt="Cargoban" style="max-width:190px">
    </div>
    <div style="padding:0 28px">
      <p>INSPECCIÓN ${escapar(tipo)}</p>
      <h1 style="font-size:22px">Solicitud de aprobación</h1>
      <p>Rol: ${escapar(rol)}</p>
      <p>Inspección N.º ${escapar(numero)}</p>
      <p>${escapar(inspeccionId)}</p>
      <p>Fecha: ${escapar(fecha)}</p>
      <p>Sede: ${escapar(sede)}</p>
      <p>Área: ${escapar(area)}</p>
    </div>
    <div style="padding:28px;text-align:center">
      <p>Revise la inspección y registre su aprobación:</p>
      <a href="${escapar(url.href)}"
         style="display:inline-block;padding:14px 20px;background:#1c2d48;color:#fff;text-decoration:none">
        Revisar y aprobar
      </a>
      <p style="font-size:12px;word-break:break-all">${escapar(url.href)}</p>
      <p style="font-size:12px">Este enlace es personal. No lo comparta.</p>
    </div>
  </div>
</body>
</html>`;
}

module.exports = { construirCorreoAprobacion };
