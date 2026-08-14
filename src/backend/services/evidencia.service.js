const { resolverFechaEvidencia } = require("../utils/fechaEvidencia");
const {
  getAccessToken,
  subirArchivoOneDrive,
  descargarArchivoOneDrive,
} = require("./graph.service");

function getRequiredEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Falta variable de entorno requerida: ${name}`);
  }

  return value;
}

const PDF_DESTINOS_POR_SEDE = new Map([
  ["uraba", "Respuestas_PDF/URABÁ"],
  ["santa marta", "Respuestas_PDF/STM"],
]);

// Limpia el nombre del archivo para que sea seguro usarlo en OneDrive.
function limpiarNombreArchivo(valor) {
  return String(valor || "").replace(/[^a-zA-Z0-9._-]/g, "_");
}

function getEvidenceFolderPath() {
  const configuredPath = process.env.ONEDRIVE_EVIDENCIAS_PATH;

  if (configuredPath) {
    return configuredPath.startsWith("/")
      ? configuredPath
      : `/${configuredPath}`;
  }

  const excelPath = getRequiredEnv("ONEDRIVE_EXCEL_PATH");
  const normalizedExcelPath = excelPath.startsWith("/")
    ? excelPath
    : `/${excelPath}`;
  const lastSlashIndex = normalizedExcelPath.lastIndexOf("/");
  const parentPath =
    lastSlashIndex > 0 ? normalizedExcelPath.slice(0, lastSlashIndex) : "";

  return `${parentPath}/EVIDENCIAS`;
}

function normalizarSedeParaRuta(sedeOperacion) {
  return String(sedeOperacion || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function resolverCarpetaDestinoPdf(sedeOperacion) {
  const sede = normalizarSedeParaRuta(sedeOperacion);

  for (const [clave, carpeta] of PDF_DESTINOS_POR_SEDE) {
    if (sede.includes(clave)) return carpeta;
  }

  return "Respuestas_PDF";
}

async function subirPdfAOneDrive(
  pdfBuffer,
  inspeccionId,
  sedeOperacion = null,
) {
  const token = await getAccessToken();
  const userId = getRequiredEnv("ONEDRIVE_USER_ID");
  const excelPath = process.env.ONEDRIVE_EXCEL_PATH || "";
  const normalizado = excelPath.replace(/\\/g, "/").trim();
  const conSlash = normalizado.startsWith("/")
    ? normalizado
    : `/${normalizado}`;
  const carpetaPadre = conSlash.slice(0, conSlash.lastIndexOf("/"));
  const nombreArchivo = `${inspeccionId || "inspeccion"}.pdf`;
  const carpetaDestino = resolverCarpetaDestinoPdf(sedeOperacion);
  const rutaPdf = `${carpetaPadre}/${carpetaDestino}/${nombreArchivo}`;

  const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(userId)}/drive/root:${encodeURI(rutaPdf)}:/content`;

  const resp = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/pdf",
    },
    body: pdfBuffer,
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(
      `Error OneDrive/PDF: ${err?.error?.message || resp.status}`,
    );
  }

  const item = await resp.json().catch(() => ({}));
  return item?.webUrl || null;
}

// Extrae el código aleatorio del inspeccionId (ej: "INSP-20250630-K7X9" → "K7X9").
function extraerCodigoInspeccion(inspeccionId) {
  const partes = String(inspeccionId || "").split("-");
  return limpiarNombreArchivo(partes[partes.length - 1] || "") || "SINCOD";
}

// Carga la evidencia del formulario a OneDrive y retorna la ruta creada.
// Nombre del archivo: {PREFIJO}_{indice}_{codigoInspeccion}.ext (ej: EXT_1_K7X9.jpg).
// Si se pasa subIndice (item con más de una foto), se agrega al nombre: {PREFIJO}_{indice}_{subIndice}_{codigoInspeccion}.ext.
async function uploadEvidenceToOneDrive(
  file,
  prefijo,
  indice,
  inspeccionId,
  subIndice = null,
) {
  if (!file) {
    return "";
  }

  const evidenceFolderPath = getEvidenceFolderPath();
  const extension = pathExtension(file.originalname);
  const codigoInspeccion = extraerCodigoInspeccion(inspeccionId);

  const fileName =
    subIndice != null
      ? `${prefijo}_${indice}_${subIndice}_${codigoInspeccion}${extension}`
      : `${prefijo}_${indice}_${codigoInspeccion}${extension}`;

  const evidencePath = `${evidenceFolderPath}/${fileName}`;

  await subirArchivoOneDrive({
    ruta: evidencePath,
    buffer: file.buffer,
    contentType: file.mimetype || "application/octet-stream",
  });

  return evidencePath;
}

// Descarga una evidencia ya subida a OneDrive por su ruta. Devuelve un Buffer o null si falla.
// Se usa solo al regenerar el PDF final, una vez las 3 firmas están completas.
async function descargarEvidenciaOneDrive(evidencePath) {
  if (!evidencePath) {
    return null;
  }

  return descargarArchivoOneDrive(evidencePath);
}

// Extrae la extensión del archivo y la limpia para usarla en el nombre del archivo en OneDrive.
function pathExtension(fileName) {
  const safeName = String(fileName || "");
  const lastDotIndex = safeName.lastIndexOf(".");

  if (lastDotIndex === -1) {
    return "";
  }

  return limpiarNombreArchivo(safeName.slice(lastDotIndex));
}

function obtenerArchivosMultiples(files, prefix, index) {
  const patron = new RegExp(`^${prefix}-${index}-(\\d+)$`);

  return files
    .map((file) => ({ file, match: patron.exec(file.fieldname || "") }))
    .filter((x) => x.match)
    .sort((a, b) => Number(a.match[1]) - Number(b.match[1]))
    .map((x) => x.file);
}

async function subirEvidenciasMultiples(
  files,
  prefix,
  tipoPrefijo,
  index,
  inspeccionId,
  body,
) {
  const archivos = obtenerArchivosMultiples(files, prefix, index);
  if (archivos.length === 0) return { ruta: "", nombre: "", fecha: null };

  const rutas = await Promise.all(
    archivos.map((file, subIdx) =>
      uploadEvidenceToOneDrive(
        file,
        tipoPrefijo,
        index + 1,
        inspeccionId,
        archivos.length > 1 ? subIdx + 1 : null,
      ),
    ),
  );

  const rutasValidas = rutas.filter(Boolean);
  const lastmod = body?.[`${prefix}-${index}-0-lastmod`];
  const fecha = await resolverFechaEvidencia(archivos[0], lastmod);

  return {
    ruta: rutasValidas.join("\n"),
    nombre: rutasValidas.map((ruta) => ruta.split("/").pop() || "").join("\n"),
    fecha,
  };
}

async function construirEvidenciasDesdeOneDrive(items) {
  const evidenciasPorIndex = new Map();
  const fechas = new Map();

  await Promise.all(
    (Array.isArray(items) ? items : []).map(async (item, idx) => {
      const rutas = String(item?.evidenciaRuta || "")
        .split("\n")
        .map((r) => r.trim())
        .filter(Boolean);

      if (rutas.length === 0) return;

      const buffers = await Promise.all(
        rutas.map((ruta) => descargarEvidenciaOneDrive(ruta)),
      );

      const archivos = buffers.filter(Boolean).map((buffer) => ({ buffer }));

      if (archivos.length > 0) {
        evidenciasPorIndex.set(idx, archivos);
      }

      if (item?.evidenciaFecha) {
        fechas.set(idx, item.evidenciaFecha);
      }
    }),
  );

  return { evidenciasPorIndex, fechas };
}

module.exports = {
  uploadEvidenceToOneDrive,
  descargarEvidenciaOneDrive,
  subirPdfAOneDrive,
  obtenerArchivosMultiples,
  subirEvidenciasMultiples,
  construirEvidenciasDesdeOneDrive,
};
