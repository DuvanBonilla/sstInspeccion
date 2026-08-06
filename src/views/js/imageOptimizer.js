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
      quality: 0.80,
    }),

    large: Object.freeze({
      maxWidth: 1400,
      maxHeight: 1400,
      quality: 0.70,
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
 * Valida el archivo recibido.
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
 * Carga la imagen usando createImageBitmap cuando está disponible.
 * Si el navegador no lo soporta, usa FileReader + Image.
 */
async function cargarImagen(file) {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch (error) {
      if (IMAGE_OPTIMIZER_CONFIG.debug) {
        console.info(
          `createImageBitmap no pudo abrir "${file.name}". Se usará el método compatible.`,
          error
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
 * Obtiene información normalizada de la imagen cargada.
 */
function analizarImagen(image, file) {
  const width = Number(image.naturalWidth || image.width || 0);
  const height = Number(image.naturalHeight || image.height || 0);

  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
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
 * Elige la estrategia de optimización.
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
    file.size > profile.largeFileLimit
      ? profile.large
      : profile.medium;

  const tipo =
    file.size > profile.largeFileLimit
      ? "large"
      : "medium";

  const requiereRedimension =
    imageInfo.width > base.maxWidth ||
    imageInfo.height > base.maxHeight;

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
 * Calcula las dimensiones nuevas sin deformar ni ampliar la imagen.
 */
function calcularDimensiones(width, height, maxWidth, maxHeight) {
  const ratio = Math.min(
    maxWidth / width,
    maxHeight / height,
    1
  );

  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
    ratio,
  };
}

/**
 * Decide el formato de salida.
 *
 * JPEG se mantiene como JPEG.
 * PNG se mantiene como PNG para preservar texto, líneas y transparencia.
 * WebP se mantiene como WebP.
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

  ctx.drawImage(
    image,
    0,
    0,
    dimensiones.width,
    dimensiones.height
  );

  return canvas;
}

/**
 * Convierte un canvas en Blob.
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
      formato.quality
    );
  });
}

/**
 * Valida si el resultado realmente mejora el archivo original.
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

  const reductionPercent =
    (1 - blob.size / originalFile.size) * 100;

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
  const base = String(originalName || "imagen")
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
    }
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
    `🖼 ${original.name} · ${reductionPercent.toFixed(1)}% menos`
  );

  console.log("Versión:", IMAGE_OPTIMIZER_VERSION);
  console.log("Estrategia:", estrategia.tipo);
  console.log("Formato:", `${original.type} → ${formato.mime}`);
  console.log(
    "Resolución:",
    `${imageInfo.width}x${imageInfo.height} → ${dimensiones.width}x${dimensiones.height}`
  );
  console.log(
    "Peso original:",
    `${(original.size / MB).toFixed(2)} MB`
  );
  console.log(
    "Peso optimizado:",
    `${(optimizado.size / MB).toFixed(2)} MB`
  );
  console.log("Reducción:", `${reductionPercent.toFixed(1)}%`);
  console.log("Tiempo:", `${elapsedMs.toFixed(0)} ms`);

  console.groupEnd();
}

/**
 * Muestra por consola por qué se conservó el original.
 */
function registrarOriginalConservado(file, motivo) {
  if (!IMAGE_OPTIMIZER_CONFIG.debug) return;

  console.info(
    `Se conserva "${file.name}" sin cambios: ${motivo}`
  );
}

/**
 * Optimiza una imagen y devuelve el archivo más conveniente.
 *
 * @param {File} file Archivo original.
 * @param {Object} options Opciones del optimizador.
 * @param {string} options.profile Perfil: inspection, pdf o thumbnail.
 * @returns {Promise<File>} Archivo optimizado o archivo original.
 */
export async function optimizarImagen(
  file,
  { profile = IMAGE_OPTIMIZER_CONFIG.defaultProfile } = {}
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
      "El archivo está por debajo del límite configurado."
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
      selectedProfile
    );

    if (!estrategia.optimizar) {
      registrarOriginalConservado(file, estrategia.motivo);
      return file;
    }

    const dimensiones = calcularDimensiones(
      imageInfo.width,
      imageInfo.height,
      estrategia.maxWidth,
      estrategia.maxHeight
    );

    const formato = seleccionarFormatoSalida(
      file,
      estrategia
    );

    const canvas = crearCanvas(
      dimensiones.width,
      dimensiones.height
    );

    dibujarImagen(
      canvas,
      image,
      dimensiones,
      formato
    );

    const blob = await convertirCanvasABlob(
      canvas,
      formato
    );

    const resultado = validarResultado(
      file,
      blob,
      selectedProfile
    );

    if (resultado.usarOriginal) {
      registrarOriginalConservado(file, resultado.motivo);
      return file;
    }

    const archivoOptimizado = construirArchivoOptimizado(
      blob,
      file,
      formato
    );

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
        error
      );
    }

    return file;
  } finally {
    liberarImagen(image);
  }
}
