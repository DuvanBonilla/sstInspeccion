const { resolverFechaEvidencia } = require("../utils/fechaEvidencia");
const {
  getRequiredEnv,
  getAccessToken,
  subirArchivoOneDrive,
  descargarArchivoOneDrive,
} = require("./graph.service");

const PDF_DESTINOS_POR_SEDE = new Map([
  ["uraba", "Respuestas_PDF/URABÁ"],
  ["santa marta", "Respuestas_PDF/STM"],
]);

// Limpia el nombre del archivo para que sea seguro usarlo en OneDrive.
function limpiarNombreArchivo(valor) {
  return String(valor || "").replace(/[^a-zA-Z0-9._-]/g, "_");
}

/**
 * Obtiene la carpeta de OneDrive destinada a las evidencias.
 *
 * Utiliza `ONEDRIVE_EVIDENCIAS_PATH` cuando está configurada. De lo contrario,
 * construye la ubicación a partir de la carpeta que contiene el archivo
 * definido en `ONEDRIVE_EXCEL_PATH`.
 *
 * @returns {string} Ruta absoluta de la carpeta de evidencias en OneDrive.
 * @throws {Error} Si no existe la configuración necesaria para construirla.
 */

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

/**
 * Determina la carpeta donde se almacenará el PDF según la sede.
 *
 * Las inspecciones de Urabá se dirigen a `Respuestas_PDF/URABÁ`, las de
 * Santa Marta a `Respuestas_PDF/STM` y las demás a `Respuestas_PDF`.
 *
 * @param {string} sedeOperacion Sede operacional de la inspección.
 * @returns {string} Carpeta de destino correspondiente.
 */

function resolverCarpetaDestinoPdf(sedeOperacion) {
  const sede = normalizarSedeParaRuta(sedeOperacion);

  for (const [clave, carpeta] of PDF_DESTINOS_POR_SEDE) {
    if (sede.includes(clave)) return carpeta;
  }

  return "Respuestas_PDF";
}

/**
 * Almacena el informe PDF de una inspección en OneDrive.
 *
 * Construye el nombre y la ruta del archivo a partir del identificador de la
 * inspección y de su sede operacional. Después realiza la carga mediante
 * Microsoft Graph.
 *
 * @async
 * @param {Buffer} pdfBuffer Contenido binario del informe PDF.
 * @param {string} inspeccionId Identificador único de la inspección.
 * @param {string|null} [sedeOperacion=null] Sede utilizada para determinar
 * la carpeta de destino.
 * @returns {Promise<string|null>} URL web del PDF almacenado, o `null` si
 * Microsoft Graph no devuelve una URL.
 * @throws {Error} Si falla la autenticación o la carga del archivo.
 */

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

/**
 * Almacena una evidencia individual en OneDrive.
 *
 * Construye un nombre utilizando el prefijo del tipo de evidencia, su posición,
 * el código de la inspección y, cuando corresponde, el subíndice de la imagen.
 *
 * @async
 * @param {Object} file Archivo recibido mediante Multer.
 * @param {Buffer} file.buffer Contenido binario del archivo.
 * @param {string} file.originalname Nombre original del archivo.
 * @param {string} file.mimetype Tipo MIME del archivo.
 * @param {string} prefijo Prefijo que identifica el tipo de evidencia.
 * @param {number} indice Posición del elemento dentro de la inspección.
 * @param {string} inspeccionId Identificador único de la inspección.
 * @param {number|null} [subIndice=null] Posición adicional cuando el elemento
 * contiene varias evidencias.
 * @returns {Promise<Object|string>} Ruta y URL de la evidencia almacenada, o
 * una cadena vacía cuando no se recibe un archivo.
 * @throws {Error} Si falla la carga de la evidencia.
 */

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

  const driveItem = await subirArchivoOneDrive({
    ruta: evidencePath,
    buffer: file.buffer,
    contentType: file.mimetype || "application/octet-stream",
  });

  return {
    ruta: evidencePath,
    webUrl: driveItem?.webUrl || "",
  };
}

/**
 * Descarga una evidencia previamente almacenada en OneDrive.
 *
 * @async
 * @param {string} evidencePath Ruta de la evidencia dentro de OneDrive.
 * @returns {Promise<Buffer|null>} Contenido binario de la evidencia, o `null`
 * cuando no se proporciona una ruta o no se obtiene el archivo.
 * @throws {Error} Si falla la solicitud de descarga.
 */

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

/**
 * Procesa y almacena las evidencias asociadas a un elemento SST.
 *
 * Localiza los archivos correspondientes al elemento, los carga en paralelo
 * y agrupa sus rutas, URLs y nombres. También determina la fecha de la
 * evidencia utilizando el primer archivo encontrado.
 *
 * @async
 * @param {Array<Object>} files Archivos recibidos mediante Multer.
 * @param {string} prefix Prefijo utilizado en los nombres de campos del formulario.
 * @param {string} tipoPrefijo Prefijo utilizado para nombrar los archivos.
 * @param {number} index Posición del elemento dentro de su sección.
 * @param {string} inspeccionId Identificador único de la inspección.
 * @param {Object} body Datos adicionales recibidos desde el formulario.
 * @returns {Promise<Object>} Rutas, URLs y nombres agrupados, además de la
 * fecha determinada para la evidencia.
 * @throws {Error} Si falla la carga o el procesamiento de alguna evidencia.
 */

async function subirEvidenciasMultiples(
  files,
  prefix,
  tipoPrefijo,
  index,
  inspeccionId,
  body,
) {
  const archivos = obtenerArchivosMultiples(files, prefix, index);

  if (archivos.length === 0) {
    return {
      ruta: "",
      url: "",
      nombre: "",
      fecha: null,
    };
  }

  const evidencias = await Promise.all(
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

  const evidenciasValidas = evidencias.filter(
    (evidencia) => evidencia && evidencia.ruta,
  );

  const rutas = evidenciasValidas
    .map((evidencia) => evidencia.ruta)
    .filter(Boolean);

  const urls = evidenciasValidas
    .map((evidencia) => evidencia.webUrl || "")
    .filter(Boolean);

  const nombres = rutas.map((ruta) => ruta.split("/").pop() || "");

  const lastmod = body?.[`${prefix}-${index}-0-lastmod`];

  const fecha = await resolverFechaEvidencia(archivos[0], lastmod);

  return {
    ruta: rutas.join("\n"),
    url: urls.join("\n"),
    nombre: nombres.join("\n"),
    fecha,
  };
}

/**
 * Reconstruye las evidencias de una colección de elementos SST.
 *
 * Descarga las evidencias almacenadas en cada elemento y las organiza por su
 * índice original. Las fechas registradas se conservan en un mapa separado
 * para utilizarlas durante la generación del PDF.
 *
 * @async
 * @param {Array<Object>} items Elementos SST con rutas de evidencias.
 * @returns {Promise<Object>} Mapas de evidencias y fechas organizados por índice.
 * @throws {Error} Si falla la descarga de alguna evidencia.
 */

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

/**
 * Reconstruye las evidencias de los trabajadores de una inspección EPP.
 *
 * Descarga la evidencia de cada trabajador y la almacena en un mapa utilizando
 * su posición y, cuando está disponible, también su identificador.
 *
 * Los errores de descarga de un trabajador se registran sin interrumpir el
 * procesamiento de los demás.
 *
 * @async
 * @param {Array<Object>} trabajadores Trabajadores con evidencias almacenadas.
 * @returns {Promise<Map>} Evidencias organizadas por índice e identificador
 * del trabajador.
 */

async function construirEvidenciasEppDesdeOneDrive(trabajadores) {
  const evidenciasPorTrabajador = new Map();

  await Promise.all(
    (Array.isArray(trabajadores) ? trabajadores : []).map(
      async (trabajador, idx) => {
        const ruta = String(trabajador?.evidenciaRuta || "").trim();

        if (!ruta) {
          return;
        }

        try {
          const buffer = await descargarEvidenciaOneDrive(ruta);

          if (!buffer) {
            return;
          }

          const archivo = {
            buffer,
          };

          // -------------------------------------------------
          // Guardar por índice
          // -------------------------------------------------

          evidenciasPorTrabajador.set(idx, archivo);

          // -------------------------------------------------
          // También guardar por trabajadorId si existe
          // -------------------------------------------------

          if (
            trabajador?.trabajadorId !== undefined &&
            trabajador?.trabajadorId !== null
          ) {
            evidenciasPorTrabajador.set(trabajador.trabajadorId, archivo);
          }
        } catch (error) {
          console.error(
            `[EPP] Error descargando evidencia trabajador ${idx + 1}:`,
            error.message,
          );
        }
      },
    ),
  );

  return evidenciasPorTrabajador;
}

module.exports = {
  uploadEvidenceToOneDrive,
  descargarEvidenciaOneDrive,
  subirPdfAOneDrive,
  subirEvidenciasMultiples,
  construirEvidenciasDesdeOneDrive,
  construirEvidenciasEppDesdeOneDrive,
};
