const {
  escaparXml,
  obtenerNumeroColumna,
} = require("../../../../shared/utils/excelXml.util");

const { obtenerLetraColumna } = require("./formatoHojas.service");

function separarReferencia(referencia) {
  const [, columna, fila] = referencia.match(/^([A-Z]+)(\d+)$/);

  return { columna: obtenerNumeroColumna(columna), fila: Number(fila) };
}

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
 * Representación en memoria de una hoja que se construye celda por celda.
 *
 * Permite declarar textos, fórmulas, estilos por rango, celdas combinadas y
 * dimensiones, y finalmente genera el contenido de `<sheetData>`, `<cols>` y
 * `<mergeCells>` con los índices de estilo del libro.
 */

class LienzoHoja {
  constructor() {
    this.celdas = new Map();

    this.combinadas = [];

    this.altos = new Map();

    this.anchos = new Map();

    this.ocultas = new Set();
  }

  obtenerCelda(referencia) {
    if (!this.celdas.has(referencia)) {
      this.celdas.set(referencia, { estilo: {}, valor: null });
    }

    return this.celdas.get(referencia);
  }

  /**
   * Combina un estilo parcial con el que ya tienen las celdas del rango.
   */

  estilo(rango, parcial) {
    recorrerRango(rango, ({ referencia }) => {
      const celda = this.obtenerCelda(referencia);

      celda.estilo = fusionarEstilos(celda.estilo, parcial);
    });

    return this;
  }

  /**
   * Dibuja un contorno alrededor del rango sin modificar el resto del estilo.
   *
   * @param {string} rango Rango, por ejemplo `B8:E12`.
   * @param {Object} lados Bordes `superior`, `inferior`, `izquierdo` y `derecho`.
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

        if (Object.keys(borde).length > 0) {
          const celda = this.obtenerCelda(referencia);

          celda.estilo = fusionarEstilos(celda.estilo, { borde });
        }
      },
    );

    return this;
  }

  texto(referencia, texto, estilo = {}) {
    const celda = this.obtenerCelda(referencia);

    celda.valor = { tipo: "texto", contenido: texto };

    celda.estilo = fusionarEstilos(celda.estilo, estilo);

    return this;
  }

  formula(referencia, formula, estilo = {}) {
    const celda = this.obtenerCelda(referencia);

    celda.valor = { tipo: "formula", contenido: formula.replace(/^=/, "") };

    celda.estilo = fusionarEstilos(celda.estilo, estilo);

    return this;
  }

  combinar(rango) {
    this.combinadas.push(rango);

    return this;
  }

  alto(fila, alto) {
    this.altos.set(fila, alto);

    return this;
  }

  ancho(columnas, ancho, { oculta = false } = {}) {
    const [inicio, fin = inicio] = columnas.split(":");

    for (
      let columna = obtenerNumeroColumna(inicio);
      columna <= obtenerNumeroColumna(fin);
      columna += 1
    ) {
      this.anchos.set(columna, ancho);

      if (oculta) this.ocultas.add(columna);
    }

    return this;
  }

  construirColumnasXml() {
    const columnas = [...this.anchos.keys()].sort((a, b) => a - b);

    const grupos = [];

    for (const columna of columnas) {
      const ancho = this.anchos.get(columna);

      const oculta = this.ocultas.has(columna);

      const ultimo = grupos[grupos.length - 1];

      if (
        ultimo &&
        ultimo.max === columna - 1 &&
        ultimo.ancho === ancho &&
        ultimo.oculta === oculta
      ) {
        ultimo.max = columna;
      } else {
        grupos.push({ min: columna, max: columna, ancho, oculta });
      }
    }

    return (
      "<cols>" +
      grupos
        .map(
          ({ min, max, ancho, oculta }) =>
            `<col min="${min}" max="${max}" width="${ancho}" customWidth="1"` +
            (oculta ? ' hidden="1"' : "") +
            "/>",
        )
        .join("") +
      "</cols>"
    );
  }

  construirDatosXml(registro) {
    const filas = new Map();

    for (const [referencia, celda] of this.celdas) {
      const { fila, columna } = separarReferencia(referencia);

      if (!filas.has(fila)) filas.set(fila, []);

      filas.get(fila).push({ referencia, columna, celda });
    }

    for (const fila of this.altos.keys()) {
      if (!filas.has(fila)) filas.set(fila, []);
    }

    const numerosFila = [...filas.keys()].sort((a, b) => a - b);

    const filasXml = numerosFila.map((fila) => {
      const alto = this.altos.get(fila);

      const atributos = alto ? ` ht="${alto}" customHeight="1"` : "";

      const celdasXml = filas
        .get(fila)
        .sort((a, b) => a.columna - b.columna)
        .map(({ referencia, celda }) => {
          const estilo = registro.celda(celda.estilo);

          if (!celda.valor) {
            return `<c r="${referencia}" s="${estilo}"></c>`;
          }

          if (celda.valor.tipo === "formula") {
            return (
              `<c r="${referencia}" s="${estilo}">` +
              `<f>${escaparXml(celda.valor.contenido)}</f>` +
              "</c>"
            );
          }

          return (
            `<c r="${referencia}" s="${estilo}" t="inlineStr">` +
            `<is><t xml:space="preserve">${escaparXml(celda.valor.contenido)}</t></is>` +
            "</c>"
          );
        })
        .join("");

      return `<row r="${fila}"${atributos}>${celdasXml}</row>`;
    });

    return `<sheetData>${filasXml.join("")}</sheetData>`;
  }

  construirCombinadasXml() {
    if (this.combinadas.length === 0) return "";

    return (
      `<mergeCells count="${this.combinadas.length}">` +
      this.combinadas.map((rango) => `<mergeCell ref="${rango}"/>`).join("") +
      "</mergeCells>"
    );
  }

  obtenerDimension() {
    let maxFila = 1;

    let maxColumna = 1;

    for (const referencia of this.celdas.keys()) {
      const { fila, columna } = separarReferencia(referencia);

      maxFila = Math.max(maxFila, fila);

      maxColumna = Math.max(maxColumna, columna);
    }

    return `A1:${obtenerLetraColumna(maxColumna)}${maxFila}`;
  }
}

module.exports = {
  LienzoHoja,
  recorrerRango,
};
