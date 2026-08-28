const {
  timingSafeEqual,
} = require("node:crypto");

function autorizarAzureEpp(
  req,
  res,
  next,
) {
  const secretoConfigurado = String(
    process.env.AZURE_EPP_SYNC_SECRET || "",
  ).trim();

  if (!secretoConfigurado) {
    console.error(
      "[Azure EPP] AZURE_EPP_SYNC_SECRET no está configurado",
    );

    return res.status(500).json({
      ok: false,
      mensaje:
        "La automatización EPP no está configurada",
    });
  }

  const autorizacion = String(
    req.headers.authorization || "",
  );

  const secretoRecibido =
    autorizacion.startsWith("Bearer ")
      ? autorizacion.slice(7).trim()
      : "";

  const bufferConfigurado =
    Buffer.from(secretoConfigurado);

  const bufferRecibido =
    Buffer.from(secretoRecibido);

  const autorizado =
    bufferConfigurado.length
      === bufferRecibido.length
    && timingSafeEqual(
      bufferConfigurado,
      bufferRecibido,
    );

  if (!autorizado) {
    return res.status(401).json({
      ok: false,
      mensaje: "No autorizado",
    });
  }

  return next();
}

module.exports = {
  autorizarAzureEpp,
};