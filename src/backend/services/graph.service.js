const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

let _cachedToken = null;
let _tokenExpiresAt = 0;

function getRequiredEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Falta variable de entorno requerida: ${name}`);
  }

  return value;
}

async function getAccessToken() {
  if (_cachedToken && Date.now() < _tokenExpiresAt - 30_000) {
    return _cachedToken;
  }

  const tenantId = getRequiredEnv("MS_TENANT_ID");
  const clientId = getRequiredEnv("MS_CLIENT_ID");
  const clientSecret = getRequiredEnv("MS_CLIENT_SECRET");

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "client_credentials",
    scope: "https://graph.microsoft.com/.default",
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const data = await response.json();

  if (!response.ok || !data.access_token) {
    const detail =
      data?.error_description || data?.error || "No se pudo obtener token";

    throw new Error(`Error autenticando en Microsoft Graph: ${detail}`);
  }

  _cachedToken = data.access_token;
  _tokenExpiresAt = Date.now() + (data.expires_in || 3600) * 1000;

  return _cachedToken;
}

function normalizarRutaOneDrive(ruta) {
  if (!ruta) {
    throw new Error("La ruta de OneDrive es obligatoria");
  }

  return ruta.startsWith("/") ? ruta : `/${ruta}`;
}

async function subirArchivoOneDrive({
  ruta,
  buffer,
  contentType = "application/octet-stream",
}) {
  if (!buffer) {
    throw new Error("El contenido del archivo es obligatorio");
  }

  const oneDriveUser = getRequiredEnv("ONEDRIVE_USER_ID");
  const token = await getAccessToken();
  const rutaNormalizada = normalizarRutaOneDrive(ruta);

  const url =
    `${GRAPH_BASE}/users/${encodeURIComponent(oneDriveUser)}` +
    `/drive/root:${encodeURI(rutaNormalizada)}:/content` +
    "?@microsoft.graph.conflictBehavior=replace";

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": contentType,
    },
    body: buffer,
  });

  const text = await response.text();

  let data;

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    const detail =
      data?.error?.message || data?.raw || "No se pudo subir el archivo";

    throw new Error(`Error OneDrive/Graph al subir archivo: ${detail}`);
  }

  return data;
}

async function descargarArchivoOneDrive(ruta) {
  if (!ruta) {
    return null;
  }

  const oneDriveUser = getRequiredEnv("ONEDRIVE_USER_ID");
  const token = await getAccessToken();
  const rutaNormalizada = normalizarRutaOneDrive(ruta);

  const url =
    `${GRAPH_BASE}/users/${encodeURIComponent(oneDriveUser)}` +
    `/drive/root:${encodeURI(rutaNormalizada)}:/content`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    return null;
  }

  const arrayBuffer = await response.arrayBuffer();

  return Buffer.from(arrayBuffer);
}

module.exports = {
  getRequiredEnv,
  getAccessToken,
  subirArchivoOneDrive,
  descargarArchivoOneDrive,
};
