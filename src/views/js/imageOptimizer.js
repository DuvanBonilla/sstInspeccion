/**
 * ============================================================
 * IMAGE OPTIMIZER
 * ------------------------------------------------------------
 * Módulo reutilizable para optimizar imágenes en el navegador
 * antes de enviarlas al servidor.
 *
 * API pública:
 *   await optimizarImagen(file)
 *   await optimizarImagen(file, { profile: "inspection" })
 *
 * El módulo:
 *  - valida el archivo;
 *  - analiza resolución, orientación y tamaño;
 *  - aplica una estrategia según el perfil;
 *  - redimensiona conservando proporción;
 *  - mantiene JPEG, PNG o WebP;
 *  - nunca devuelve un archivo más pesado que el original;
 *  - conserva el archivo original ante cualquier error.
 *
 * No conoce formularios, FormData, OneDrive, PDF ni backend.
 * ============================================================
 */

export const IMAGE_OPTIMIZER_VERSION = "2.0.0";

const MB = 1024 * 1024;

const SUPPORTED_TYPES = Object.freeze([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const PROFILES = Object.freeze({
  inspection: Object.freeze({
    smallFileLimit: 1 * MB,
    largeFileLimit: 5 * MB,
    minimumReductionPercent: 3,

    medium: Object.freeze({
      maxWidth: 1600,
      maxHeight: 1600,
      quality: 0.8,
    }),

    large: Object.freeze({
      maxWidth: 1400,
      maxHeight: 1400,
      quality: 0.7,
    }),
  }),

  pdf: Object.freeze({
    smallFileLimit: 800 * 1024,
    largeFileLimit: 4 * MB,
    minimumReductionPercent: 3,

    medium: Object.freeze({
      maxWidth: 1500,
      maxHeight: 1500,
      quality: 0.76,
    }),

    large: Object.freeze({
      maxWidth: 1300,
      maxHeight: 1300,
      quality: 0.68,
    }),
  }),

  thumbnail: Object.freeze({
    smallFileLimit: 150 * 1024,
    largeFileLimit: 1 * MB,
    minimumReductionPercent: 1,

    medium: Object.freeze({
      maxWidth: 600,
      maxHeight: 600,
      quality: 0.72,
    }),

    large: Object.freeze({
      maxWidth: 450,
      maxHeight: 450,
      quality: 0.65,
    }),
  }),
});

const IMAGE_OPTIMIZER_CONFIG = Object.freeze({
  defaultProfile: "inspection",
  supportedTypes: SUPPORTED_TYPES,
  profiles: PROFILES,
  debug: true,
  showWarnings: true,
});

/**
 * Obtiene el perfil solicitado o el perfil predeterminado.
 */
function obtenerPerfil(profileName) {
  return (
    IMAGE_OPTIMIZER_CONFIG.profiles[profileName] ||
    IMAGE_OPTIMIZER_CONFIG.profiles[IMAGE_OPTIMIZER_CONFIG.defaultProfile]
  );
}

/**
 * Valida que el valor recibido sea un archivo de imagen procesable.
 *
 * Comprueba que sea una instancia de File, que tenga contenido y que su
 * tipo MIME se encuentre entre los formatos admitidos por el optimizador.
 *
 * @param {File} file - Archivo que se desea validar.
 * @returns {{ok: boolean, motivo: string|null}} Resultado de la validación
 * y motivo del rechazo cuando el archivo no es válido.
 */

function validarArchivo(file) {
  if (!(file instanceof File)) {
    return {
      ok: false,
      motivo: "El valor recibido no es un archivo válido.",
    };
  }

  if (file.size <= 0) {
    return {
      ok: false,
      motivo: "El archivo está vacío.",
    };
  }

  if (!IMAGE_OPTIMIZER_CONFIG.supportedTypes.includes(file.type)) {
    return {
      ok: false,
      motivo: `Tipo de archivo no soportado: ${file.type || "desconocido"}.`,
    };
  }

  return {
    ok: true,
    motivo: null,
  };
}

/**
 * Carga un archivo de imagen para poder procesarlo en el navegador.
 *
 * Intenta utilizar `createImageBitmap` y, cuando no está disponible o falla,
 * utiliza FileReader junto con un elemento Image como mecanismo compatible.
 *
 * @async
 * @param {File} file - Archivo de imagen que se desea cargar.
 * @returns {Promise<ImageBitmap|HTMLImageElement>} Imagen cargada y lista para analizar.
 * @throws {Error} Si el archivo no puede leerse o convertirse en una imagen.
 */
async function cargarImagen(file) {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch (error) {
      if (IMAGE_OPTIMIZER_CONFIG.debug) {
        console.info(
          `createImageBitmap no pudo abrir "${file.name}". Se usará el método compatible.`,
          error,
        );
      }
    }
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const image = new Image();

      image.onload = () => resolve(image);
      image.onerror = () =>
        reject(new Error(`No fue posible cargar la imagen "${file.name}".`));

      image.src = reader.result;
    };

    reader.onerror = () =>
      reject(new Error(`No fue posible leer el archivo "${file.name}".`));

    reader.readAsDataURL(file);
  });
}

/**
 * Obtiene la información técnica de una imagen cargada.
 *
 * Determina sus dimensiones, proporción, orientación, cantidad de
 * megapíxeles, tipo MIME y tamaño original.
 *
 * @param {ImageBitmap|HTMLImageElement} image - Imagen cargada en memoria.
 * @param {File} file - Archivo original asociado con la imagen.
 * @returns {{
 *   width: number,
 *   height: number,
 *   aspectRatio: number,
 *   orientation: string,
 *   megapixels: number,
 *   mime: string,
 *   size: number
 * }} Información normalizada de la imagen.
 * @throws {Error} Si la imagen no contiene dimensiones válidas.
 */
function analizarImagen(image, file) {
  const width = Number(image.naturalWidth || image.width || 0);
  const height = Number(image.naturalHeight || image.height || 0);

  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    throw new Error("La imagen no tiene dimensiones válidas.");
  }

  const aspectRatio = width / height;

  let orientation = "square";
  if (aspectRatio > 1.05) orientation = "landscape";
  if (aspectRatio < 0.95) orientation = "portrait";

  return {
    width,
    height,
    aspectRatio,
    orientation,
    megapixels: Number(((width * height) / 1_000_000).toFixed(2)),
    mime: file.type,
    size: file.size,
  };
}

/**
 * Determina la estrategia de optimización que debe aplicarse a una imagen.
 *
 * Selecciona la configuración correspondiente a archivos pequeños, medianos
 * o grandes y establece si es necesario redimensionar y recomprimir la imagen.
 *
 * @param {File} file - Archivo original.
 * @param {Object} imageInfo - Información técnica de la imagen.
 * @param {Object} profile - Perfil de optimización seleccionado.
 * @returns {Object} Estrategia de optimización seleccionada.
 */
function obtenerEstrategiaCompresion(file, imageInfo, profile) {
  if (file.size <= profile.smallFileLimit) {
    return {
      optimizar: false,
      tipo: "original",
      motivo: "El archivo ya está por debajo del límite de optimización.",
    };
  }

  const base =
    file.size > profile.largeFileLimit ? profile.large : profile.medium;

  const tipo = file.size > profile.largeFileLimit ? "large" : "medium";

  const requiereRedimension =
    imageInfo.width > base.maxWidth || imageInfo.height > base.maxHeight;

  return {
    optimizar: true,
    tipo,
    maxWidth: base.maxWidth,
    maxHeight: base.maxHeight,
    quality: base.quality,
    requiereRedimension,
    motivo: requiereRedimension
      ? "La imagen será redimensionada y recomprimida."
      : "La imagen conservará dimensiones y será recomprimida.",
  };
}
/**
 * Calcula las dimensiones de salida manteniendo la proporción original.
 *
 * Limita la imagen al ancho y alto máximos permitidos por el perfil,
 * sin deformarla ni ampliar imágenes que ya sean más pequeñas.
 *
 * @param {number} width - Ancho original en píxeles.
 * @param {number} height - Alto original en píxeles.
 * @param {number} maxWidth - Ancho máximo permitido.
 * @param {number} maxHeight - Alto máximo permitido.
 * @returns {{width: number, height: number, ratio: number}}
 * Dimensiones calculadas y proporción de redimensionamiento aplicada.
 */

function calcularDimensiones(width, height, maxWidth, maxHeight) {
  const ratio = Math.min(maxWidth / width, maxHeight / height, 1);

  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
    ratio,
  };
}

/**
 * Selecciona el formato y la calidad de la imagen resultante.
 *
 * Conserva el formato JPEG, PNG o WebP del archivo original. La calidad
 * definida por la estrategia se aplica a los formatos que admiten compresión.
 *
 * @param {File} file - Archivo original.
 * @param {Object} estrategia - Estrategia de compresión seleccionada.
 * @returns {{mime: string, extension: string, quality: number|undefined}}
 * Configuración del formato de salida.
 */

function seleccionarFormatoSalida(file, estrategia) {
  switch (file.type) {
    case "image/jpeg":
      return {
        mime: "image/jpeg",
        extension: "jpg",
        quality: estrategia.quality,
      };

    case "image/png":
      return {
        mime: "image/png",
        extension: "png",
        quality: undefined,
      };

    case "image/webp":
      return {
        mime: "image/webp",
        extension: "webp",
        quality: estrategia.quality,
      };

    default:
      return {
        mime: file.type,
        extension: obtenerExtensionOriginal(file.name),
        quality: estrategia.quality,
      };
  }
}

/**
 * Extrae la extensión original de un nombre de archivo.
 */
function obtenerExtensionOriginal(fileName) {
  const match = String(fileName || "").match(/\.([^.]+)$/);
  return match?.[1]?.toLowerCase() || "img";
}

/**
 * Crea un canvas listo para recibir la imagen.
 */
function crearCanvas(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/**
 * Dibuja la imagen en el canvas.
 */
function dibujarImagen(canvas, image, dimensiones, formato) {
  const ctx = canvas.getContext("2d", {
    alpha: formato.mime === "image/png",
  });

  if (!ctx) {
    throw new Error("No fue posible obtener el contexto 2D del canvas.");
  }

  if (formato.mime === "image/jpeg") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.drawImage(image, 0, 0, dimensiones.width, dimensiones.height);

  return canvas;
}

/**
 * Convierte el contenido renderizado en un canvas a un objeto Blob.
 *
 * Aplica el tipo MIME y la calidad definidos para el formato de salida.
 *
 * @param {HTMLCanvasElement} canvas - Canvas que contiene la imagen procesada.
 * @param {Object} formato - Configuración del formato de salida.
 * @param {string} formato.mime - Tipo MIME que debe generar el canvas.
 * @param {number} [formato.quality] - Calidad de compresión aplicable.
 * @returns {Promise<Blob>} Blob resultante de la conversión.
 * @throws {Error} Si el navegador no puede generar el Blob.
 */
function convertirCanvasABlob(canvas, formato) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("No fue posible convertir la imagen optimizada."));
          return;
        }

        resolve(blob);
      },
      formato.mime,
      formato.quality,
    );
  });
}

/**
 * Determina si el resultado optimizado debe reemplazar al archivo original.
 *
 * Verifica que el Blob sea válido, tenga contenido, pese menos que el archivo
 * original y alcance el porcentaje mínimo de reducción definido por el perfil.
 *
 * @param {File} originalFile - Archivo original.
 * @param {Blob} blob - Resultado generado por el proceso de optimización.
 * @param {Object} profile - Perfil de optimización aplicado.
 * @returns {{
 *   usarOriginal: boolean,
 *   motivo: string|null,
 *   reductionPercent: number
 * }} Evaluación del resultado y porcentaje de reducción obtenido.
 */
function validarResultado(originalFile, blob, profile) {
  if (!(blob instanceof Blob)) {
    return {
      usarOriginal: true,
      motivo: "No se generó un Blob válido.",
      reductionPercent: 0,
    };
  }

  if (blob.size <= 0) {
    return {
      usarOriginal: true,
      motivo: "El Blob generado está vacío.",
      reductionPercent: 0,
    };
  }

  if (blob.size >= originalFile.size) {
    return {
      usarOriginal: true,
      motivo: "La optimización no redujo el tamaño.",
      reductionPercent: 0,
    };
  }

  const reductionPercent = (1 - blob.size / originalFile.size) * 100;

  if (reductionPercent < profile.minimumReductionPercent) {
    return {
      usarOriginal: true,
      motivo: `La reducción fue menor al ${profile.minimumReductionPercent}%.`,
      reductionPercent,
    };
  }

  return {
    usarOriginal: false,
    motivo: null,
    reductionPercent,
  };
}

/**
 * Genera el nombre final del archivo.
 */
function construirNombreArchivo(originalName, extension) {
  const base =
    String(originalName || "imagen")
      .replace(/\.[^.]+$/, "")
      .trim() || "imagen";

  return `${base}.${extension}`;
}

/**
 * Construye un File a partir del Blob optimizado.
 */
function construirArchivoOptimizado(blob, originalFile, formato) {
  return new File(
    [blob],
    construirNombreArchivo(originalFile.name, formato.extension),
    {
      type: formato.mime,
      lastModified: originalFile.lastModified,
    },
  );
}

/**
 * Libera recursos asociados a ImageBitmap.
 */
function liberarImagen(image) {
  if (image && typeof image.close === "function") {
    image.close();
  }
}

/**
 * Muestra información de la optimización.
 */
function registrarEstadisticas({
  original,
  optimizado,
  imageInfo,
  dimensiones,
  estrategia,
  formato,
  elapsedMs,
  reductionPercent,
}) {
  if (!IMAGE_OPTIMIZER_CONFIG.debug) return;

  console.groupCollapsed(
    `🖼 ${original.name} · ${reductionPercent.toFixed(1)}% menos`,
  );

  console.log("Versión:", IMAGE_OPTIMIZER_VERSION);
  console.log("Estrategia:", estrategia.tipo);
  console.log("Formato:", `${original.type} → ${formato.mime}`);
  console.log(
    "Resolución:",
    `${imageInfo.width}x${imageInfo.height} → ${dimensiones.width}x${dimensiones.height}`,
  );
  console.log("Peso original:", `${(original.size / MB).toFixed(2)} MB`);
  console.log("Peso optimizado:", `${(optimizado.size / MB).toFixed(2)} MB`);
  console.log("Reducción:", `${reductionPercent.toFixed(1)}%`);
  console.log("Tiempo:", `${elapsedMs.toFixed(0)} ms`);

  console.groupEnd();
}

/**
 * Muestra por consola por qué se conservó el original.
 */
function registrarOriginalConservado(file, motivo) {
  if (!IMAGE_OPTIMIZER_CONFIG.debug) return;

  console.info(`Se conserva "${file.name}" sin cambios: ${motivo}`);
}

/**
 * Optimiza una imagen antes de enviarla al servidor.
 *
 * Valida y carga el archivo, analiza sus características, selecciona una
 * estrategia de compresión, calcula las dimensiones, procesa la imagen en
 * un canvas y valida que el resultado represente una reducción efectiva.
 *
 * Si el archivo ya cumple el límite configurado, el resultado no mejora
 * su tamaño o se presenta un error, devuelve el archivo original.
 *
 * @async
 * @param {File} file - Archivo de imagen original.
 * @param {Object} [options={}] - Opciones de optimización.
 * @param {"inspection"|"pdf"|"thumbnail"} [options.profile="inspection"]
 * Perfil que determina los límites, dimensiones y calidad de compresión.
 * @returns {Promise<File>} Archivo optimizado o archivo original cuando
 * no sea necesario o posible aplicar la optimización.
 */
export async function optimizarImagen(
  file,
  { profile = IMAGE_OPTIMIZER_CONFIG.defaultProfile } = {},
) {
  const validacion = validarArchivo(file);

  if (!validacion.ok) {
    if (IMAGE_OPTIMIZER_CONFIG.showWarnings) {
      console.warn(validacion.motivo);
    }

    return file;
  }

  const selectedProfile = obtenerPerfil(profile);

  if (file.size <= selectedProfile.smallFileLimit) {
    registrarOriginalConservado(
      file,
      "El archivo está por debajo del límite configurado.",
    );
    return file;
  }

  const inicio = performance.now();
  let image = null;

  try {
    image = await cargarImagen(file);

    const imageInfo = analizarImagen(image, file);

    const estrategia = obtenerEstrategiaCompresion(
      file,
      imageInfo,
      selectedProfile,
    );

    if (!estrategia.optimizar) {
      registrarOriginalConservado(file, estrategia.motivo);
      return file;
    }

    const dimensiones = calcularDimensiones(
      imageInfo.width,
      imageInfo.height,
      estrategia.maxWidth,
      estrategia.maxHeight,
    );

    const formato = seleccionarFormatoSalida(file, estrategia);

    const canvas = crearCanvas(dimensiones.width, dimensiones.height);

    dibujarImagen(canvas, image, dimensiones, formato);

    const blob = await convertirCanvasABlob(canvas, formato);

    const resultado = validarResultado(file, blob, selectedProfile);

    if (resultado.usarOriginal) {
      registrarOriginalConservado(file, resultado.motivo);
      return file;
    }

    const archivoOptimizado = construirArchivoOptimizado(blob, file, formato);

    registrarEstadisticas({
      original: file,
      optimizado: archivoOptimizado,
      imageInfo,
      dimensiones,
      estrategia,
      formato,
      elapsedMs: performance.now() - inicio,
      reductionPercent: resultado.reductionPercent,
    });

    return archivoOptimizado;
  } catch (error) {
    if (IMAGE_OPTIMIZER_CONFIG.showWarnings) {
      console.warn(
        `No fue posible optimizar "${file.name}". Se conservará el archivo original.`,
        error,
      );
    }

    return file;
  } finally {
    liberarImagen(image);
  }
}
