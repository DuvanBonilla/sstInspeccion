const { aArgb } = require("../../../../shared/utils/paletaExcel.util");

/**
 * Convierte las letras de una columna en su número, a partir de 1.
 *
 * @param {string} letras Letras de la columna, por ejemplo `AB`.
 * @returns {number} Número de la columna.
 */

function obtenerNumeroColumna(letras) {
  return [...letras].reduce(
    (total, letra) => total * 26 + (letra.charCodeAt(0) - 64),
    0,
  );
}

/**
 * Convierte el número de una columna en sus letras.
 *
 * @param {number} numero Número de la columna, a partir de 1.
 * @returns {string} Letras de la columna.
 */

function obtenerLetraColumna(numero) {
  let letras = "";

  for (let resto = numero; resto > 0; resto = Math.floor((resto - 1) / 26)) {
    letras = String.fromCharCode(65 + ((resto - 1) % 26)) + letras;
  }

  return letras;
}

/**
 * Separa una referencia de celda en columna y fila.
 *
 * @param {string} referencia Referencia, por ejemplo `C11`.
 * @returns {{columna: number, fila: number}} Columna y fila numéricas.
 */

function separarReferencia(referencia) {
  const [, columna, fila] = referencia.match(/^([A-Z]+)(\d+)$/);

  return { columna: obtenerNumeroColumna(columna), fila: Number(fila) };
}

/**
 * Recorre cada celda de un rango.
 *
 * @param {string} rango Rango, por ejemplo `B8:F12`, o una sola celda.
 * @param {Function} callback Recibe `{referencia, fila, columna}` y los
 * indicadores de borde del rango.
 * @returns {void}
 */

function recorrerRango(rango, callback) {
  const [inicio, fin = inicio] = rango.split(":");

  const desde = separarReferencia(inicio);

  const hasta = separarReferencia(fin);

  for (let fila = desde.fila; fila <= hasta.fila; fila += 1) {
    for (let columna = desde.columna; columna <= hasta.columna; columna += 1) {
      callback({
        referencia: `${obtenerLetraColumna(columna)}${fila}`,
        fila,
        columna,
        primeraFila: fila === desde.fila,
        ultimaFila: fila === hasta.fila,
        primeraColumna: columna === desde.columna,
        ultimaColumna: columna === hasta.columna,
      });
    }
  }
}

/**
 * Une dos estilos declarados con el formato del lienzo; el segundo prevalece.
 *
 * @param {Object} [base] Estilo de partida.
 * @param {Object} [parcial] Propiedades que se agregan o reemplazan.
 * @returns {Object} Estilo combinado.
 */

function fusionarEstilos(base = {}, parcial = {}) {
  return {
    ...base,
    ...parcial,
    fuente: { ...(base.fuente || {}), ...(parcial.fuente || {}) },
    borde: { ...(base.borde || {}), ...(parcial.borde || {}) },
    alineacion: { ...(base.alineacion || {}), ...(parcial.alineacion || {}) },
  };
}

/**
 * Convierte un borde del lienzo en un borde de ExcelJS.
 *
 * @param {{estilo: string, color: string}} borde Borde declarado.
 * @returns {Object} Borde con el color en formato ARGB.
 */

function convertirBorde(borde) {
  return { style: borde.estilo, color: { argb: aArgb(borde.color) } };
}

/**
 * Aplica un estilo declarado a una celda de ExcelJS.
 *
 * @param {ExcelJS.Cell} celda Celda que recibe el estilo.
 * @param {Object} estilo Estilo con relleno, fuente, alineación, formato y
 * bordes.
 * @returns {void}
 */

function aplicarEstilo(celda, estilo) {
  if (estilo.relleno) {
    celda.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: aArgb(estilo.relleno) },
    };
  }

  const { nombre, tamano, negrita, color } = estilo.fuente || {};

  if (nombre) {
    celda.font = {
      name: nombre,
      size: tamano,
      bold: Boolean(negrita),
      color: { argb: aArgb(color) },
    };
  }

  if (Object.keys(estilo.alineacion || {}).length) {
    const { horizontal, vertical, reducir } = estilo.alineacion;

    celda.alignment = {
      horizontal,
      vertical: vertical === "center" ? "middle" : vertical,
      shrinkToFit: Boolean(reducir),
    };
  }

  if (estilo.formato) {
    celda.numFmt = estilo.formato;
  }

  const bordes = {};

  for (const [lado, nombreLado] of [
    ["superior", "top"],
    ["inferior", "bottom"],
    ["izquierdo", "left"],
    ["derecho", "right"],
  ]) {
    if (estilo.borde?.[lado]) {
      bordes[nombreLado] = convertirBorde(estilo.borde[lado]);
    }
  }

  if (Object.keys(bordes).length) {
    celda.border = bordes;
  }
}

/**
 * Hoja de ExcelJS que se construye declarando textos, fórmulas, estilos por
 * rango, celdas combinadas y dimensiones, y se escribe al final con `aplicar`.
 *
 * Reproduce la forma de declarar del lienzo del tablero SST para que ambos
 * tableros se construyan igual y compartan el mismo diseño.
 */

class LienzoExcel {
  /**
   * @param {ExcelJS.Worksheet} hoja Hoja que se va a dibujar.
   */

  constructor(hoja) {
    this.hoja = hoja;

    this.celdas = new Map();

    this.combinadas = [];

    this.altos = new Map();

    this.anchos = [];

    this.imagenes = [];
  }

  obtenerCelda(referencia) {
    if (!this.celdas.has(referencia)) {
      this.celdas.set(referencia, { estilo: {} });
    }

    return this.celdas.get(referencia);
  }

  /**
   * Agrega propiedades de estilo a todas las celdas de un rango.
   *
   * @param {string} rango Rango o celda.
   * @param {Object} parcial Propiedades de estilo.
   * @returns {LienzoExcel} El mismo lienzo, para encadenar llamadas.
   */

  estilo(rango, parcial) {
    recorrerRango(rango, ({ referencia }) => {
      const celda = this.obtenerCelda(referencia);

      celda.estilo = fusionarEstilos(celda.estilo, parcial);
    });

    return this;
  }

  /**
   * Dibuja el contorno de un rango; cada lado puede tener un borde distinto.
   *
   * @param {string} rango Rango que se enmarca.
   * @param {Object} lados Bordes `superior`, `izquierdo`, `derecho` e
   * `inferior`.
   * @returns {LienzoExcel} El mismo lienzo.
   */

  contorno(rango, lados) {
    recorrerRango(
      rango,
      ({ referencia, primeraFila, ultimaFila, primeraColumna, ultimaColumna }) => {
        const borde = {};

        if (primeraFila && lados.superior) borde.superior = lados.superior;
        if (ultimaFila && lados.inferior) borde.inferior = lados.inferior;
        if (primeraColumna && lados.izquierdo) borde.izquierdo = lados.izquierdo;
        if (ultimaColumna && lados.derecho) borde.derecho = lados.derecho;

        this.estilo(referencia, { borde });
      },
    );

    return this;
  }

  /**
   * Escribe un texto o un número, con estilo opcional.
   */

  texto(referencia, valor, estilo = {}) {
    const celda = this.obtenerCelda(referencia);

    celda.valor = valor;

    celda.estilo = fusionarEstilos(celda.estilo, estilo);

    return this;
  }

  /**
   * Escribe una fórmula, con estilo opcional. El resultado se guarda como
   * valor previo hasta que Excel recalcula el libro.
   */

  formula(referencia, formula, estilo = {}, resultado = undefined) {
    const celda = this.obtenerCelda(referencia);

    celda.valor = { formula, result: resultado };

    celda.estilo = fusionarEstilos(celda.estilo, estilo);

    return this;
  }

  /**
   * Combina las celdas de un rango.
   */

  combinar(rango) {
    this.combinadas.push(rango);

    return this;
  }

  /**
   * Fija el alto de una fila, en puntos.
   */

  alto(fila, alto) {
    this.altos.set(fila, alto);

    return this;
  }

  /**
   * Fija el ancho de una o varias columnas, por ejemplo `B:Z`.
   */

  ancho(columnas, ancho, { oculta = false } = {}) {
    this.anchos.push({ columnas, ancho, oculta });

    return this;
  }

  /**
   * Declara una imagen anclada a una celda; se dibuja con `aplicar`.
   *
   * @param {string} nombre Nombre del ícono, sin ruta ni extensión.
   * @param {Object} posicion Ubicación de la imagen.
   * @param {string} posicion.celda Celda donde empieza, por ejemplo `B9`.
   * @param {number} [posicion.tamano=40] Lado de la imagen, en píxeles.
   * @param {number} [posicion.margenX=4] Píxeles desde el borde izquierdo.
   * @param {number} [posicion.margenY=4] Píxeles desde el borde superior.
   * @param {number} [posicion.altoFila=20] Alto en píxeles de la fila de la celda.
   * @returns {LienzoExcel} El mismo lienzo.
   */

  imagen(nombre, { celda, tamano = 40, margenX = 4, margenY = 4, altoFila = 20 }) {
    this.imagenes.push({ nombre, celda, tamano, margenX, margenY, altoFila });

    return this;
  }

  /**
   * Escribe en la hoja de ExcelJS todo lo declarado.
   *
   * @returns {void}
   */

  aplicar() {
    for (const { columnas, ancho, oculta } of this.anchos) {
      const [desde, hasta = desde] = columnas.split(":");

      for (
        let columna = obtenerNumeroColumna(desde);
        columna <= obtenerNumeroColumna(hasta);
        columna += 1
      ) {
        const objetivo = this.hoja.getColumn(columna);

        objetivo.width = ancho;

        objetivo.hidden = oculta;
      }
    }

    for (const [fila, alto] of this.altos) {
      this.hoja.getRow(fila).height = alto;
    }

    // Se combina antes de dar estilo para que cada celda del rango conserve
    // su propio borde y relleno.
    for (const rango of this.combinadas) {
      this.hoja.mergeCells(rango);
    }

    for (const [referencia, { valor, estilo }] of this.celdas) {
      const celda = this.hoja.getCell(referencia);

      if (valor !== undefined) {
        celda.value = valor;
      }

      aplicarEstilo(celda, estilo);
    }
  }
}

module.exports = {
  LienzoExcel,
  obtenerLetraColumna,
  obtenerNumeroColumna,
  recorrerRango,
};
