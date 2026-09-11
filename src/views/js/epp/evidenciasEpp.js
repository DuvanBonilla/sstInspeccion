/**
 * Tamaño máximo permitido para una evidencia EPP.
 */
export const MAX_TAMANO_EVIDENCIA_MB = 10;

export const MAX_TAMANO_EVIDENCIA_BYTES =
  MAX_TAMANO_EVIDENCIA_MB * 1024 * 1024;

/**
 * Tipos de imagen permitidos como evidencia EPP.
 */
export const TIPOS_EVIDENCIA_PERMITIDOS = Object.freeze([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const TIPOS_EVIDENCIA_SET = new Set(
  TIPOS_EVIDENCIA_PERMITIDOS,
);

/**
 * Valida el tipo y tamaño de una evidencia EPP.
 *
 * Esta función no modifica el archivo ni elementos del DOM.
 *
 * @param {File|Object|null|undefined} archivo Archivo que debe validarse.
 * @returns {{
 *   valido: boolean,
 *   codigo: "AUSENTE"|"TIPO_NO_PERMITIDO"|"TAMANO_EXCEDIDO"|null,
 *   mensaje: string|null
 * }} Resultado de la validación.
 */
export function validarEvidenciaEpp(archivo) {
  if (!archivo) {
    return {
      valido: false,
      codigo: "AUSENTE",
      mensaje: null,
    };
  }

  if (!TIPOS_EVIDENCIA_SET.has(archivo.type)) {
    return {
      valido: false,
      codigo: "TIPO_NO_PERMITIDO",
      mensaje:
        "⚠ La evidencia debe ser una imagen en formato JPG, PNG o WebP.",
    };
  }

  if (archivo.size > MAX_TAMANO_EVIDENCIA_BYTES) {
    return {
      valido: false,
      codigo: "TAMANO_EXCEDIDO",
      mensaje:
        `⚠ La imagen no puede superar los ${MAX_TAMANO_EVIDENCIA_MB} MB.`,
    };
  }

  return {
    valido: true,
    codigo: null,
    mensaje: null,
  };
}

/**
 * Convierte el tamaño de un archivo en un texto legible.
 *
 * @param {number} bytes Tamaño del archivo expresado en bytes.
 * @returns {string} Tamaño expresado en KB o MB.
 */
export function formatearPesoArchivo(bytes) {
  if (!Number.isFinite(bytes)) {
    return "";
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}