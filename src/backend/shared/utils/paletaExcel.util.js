/**
 * Paleta, tipografías y formatos compartidos por los tableros de seguimiento
 * en Excel (SST y EPP), para que ambos mantengan la misma identidad visual.
 *
 * Todos los colores se expresan en hexadecimal RGB sin el canal alfa. Las
 * librerías que exigen el canal alfa lo agregan con `aArgb`.
 */

const COLORES = {
  verde: "1E9E57",
  verdeOscuro: "137A42",
  verdeSuave: "D9F2E3",
  blanco: "FFFFFF",
  texto: "1F2937",
  textoSecundario: "6B7280",
  borde: "D5DBE1",
  gris: "9CA3AF",
  grisSuave: "EDEFF2",
  ambar: "F2C94C",
  ambarTexto: "9A6700",
  ambarSuave: "FFF0C2",
  rojo: "D64545",
  rojoTexto: "B42318",
  rojoSuave: "FAD4D4",
  verdeAgua: "2E9E5B",
  serieBueno: "1E9E57",
  serieRegular: "F2B33D",
  serieMalo: "E0533D",
  serieNoCumple: "8B1E1E",
};

const FUENTES = {
  principal: "Calibri",
  iconos: "Segoe UI Emoji",
};

const FORMATOS = {
  fecha: "dd/mm/yyyy",
  porcentaje: "0%",
  conformidad: '"Conformidad "0%',
};

/**
 * Colores de las pestañas según el rol de cada hoja.
 */

const COLORES_PESTANA = {
  inicio: COLORES.verde,
  general: COLORES.verdeOscuro,
  datos: COLORES.gris,
};

/**
 * Convierte un color hexadecimal RGB al formato ARGB opaco de ExcelJS.
 *
 * @param {string} hex Color de seis dígitos, por ejemplo `1E9E57`.
 * @returns {string} Color con canal alfa, por ejemplo `FF1E9E57`.
 */

function aArgb(hex) {
  return `FF${hex}`;
}

module.exports = {
  COLORES,
  FUENTES,
  FORMATOS,
  COLORES_PESTANA,
  aArgb,
};
