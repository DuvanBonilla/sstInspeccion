const {
  COLORES: PALETA,
  aArgb,
} = require("../../../../shared/utils/paletaExcel.util");

/**
 * Colores de las celdas de resultado y de evaluación del EPP. Usan la paleta
 * del tablero SST para que ambos seguimientos compartan la misma identidad.
 */

const COLORES_RESULTADO = {
  "CON NOVEDAD": {
    fondo: aArgb(PALETA.rojoSuave),
    texto: aArgb(PALETA.rojoTexto),
  },

  "SIN NOVEDAD": {
    fondo: aArgb(PALETA.verdeSuave),
    texto: aArgb(PALETA.verdeOscuro),
  },

  "SIN EVALUACIÓN": {
    fondo: aArgb(PALETA.grisSuave),
    texto: aArgb(PALETA.textoSecundario),
  },
};

const COLORES_EVALUACION = {
  B: {
    fondo: aArgb(PALETA.verdeSuave),
    texto: aArgb(PALETA.verdeOscuro),
  },

  R: {
    fondo: aArgb(PALETA.ambarSuave),
    texto: aArgb(PALETA.ambarTexto),
  },

  M: {
    fondo: aArgb(PALETA.rojoSuave),
    texto: aArgb(PALETA.rojoTexto),
  },

  NA: {
    fondo: aArgb(PALETA.grisSuave),
    texto: aArgb(PALETA.textoSecundario),
  },
};

module.exports = {
  COLORES_RESULTADO,
  COLORES_EVALUACION,
};
