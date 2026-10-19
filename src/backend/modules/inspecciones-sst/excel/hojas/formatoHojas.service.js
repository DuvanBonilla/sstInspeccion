const {
  obtenerXml,
  reemplazarXml,
  obtenerNumeroColumna,
} = require("../../../../shared/utils/excelXml.util");

const {
  COLORES,
  FUENTES,
  FORMATOS,
  COLORES_PESTANA,
  ESTILOS_CALIFICACION,
  RegistroEstilos,
} = require("../seguimientoSstExcel.estilos");

const { leerEncabezados } = require("./encabezados.service");

/**
 * Límites de ancho de columna, en caracteres, y reserva para el botón de
 * filtro que Excel dibuja dentro de la celda del encabezado.
 */

const ANCHOS = {
  minimo: 12,
  maximo: 45,
  identificador: 26,
  textoLargo: 32,
  reservaFiltro: 5,
};

const ALTO_ENCABEZADO = 42;

const ALTO_FILA_DATOS = 20;

const COLUMNAS_TEXTO_LARGO =
  /OBSERVACION|EVIDENCIA|UBICACI[OÓ]N|[IÍ]TEM|PLAN_|AFECTACI[OÓ]N|PRODUCTIVIDAD|EQUIPO TECNOL/i;

const BORDE_CELDA = { estilo: "thin", color: COLORES.borde };

const BORDE_ENCABEZADO = { estilo: "thin", color: COLORES.verdeOscuro };

/**
 * Elementos que, según el esquema SpreadsheetML, deben ir después del formato
 * condicional dentro de una hoja.
 */

const ELEMENTOS_POSTERIORES_FORMATO_CONDICIONAL = [
  "dataValidations",
  "hyperlinks",
  "printOptions",
  "pageMargins",
  "pageSetup",
  "headerFooter",
  "rowBreaks",
  "colBreaks",
  "customProperties",
  "cellWatches",
  "ignoredErrors",
  "smartTags",
  "drawing",
  "legacyDrawing",
  "legacyDrawingHF",
  "picture",
  "oleObjects",
  "controls",
  "webPublishItems",
  "tableParts",
  "extLst",
];

function obtenerLetraColumna(numero) {
  let valor = numero;

  let letra = "";

  while (valor > 0) {
    valor -= 1;

    letra = String.fromCharCode(65 + (valor % 26)) + letra;

    valor = Math.floor(valor / 26);
  }

  return letra;
}

function estiloEncabezado() {
  return {
    fuente: {
      nombre: FUENTES.principal,
      tamano: 10,
      negrita: true,
      color: COLORES.blanco,
    },
    relleno: COLORES.verde,
    borde: { izquierdo: BORDE_ENCABEZADO, derecho: BORDE_ENCABEZADO },
    alineacion: { horizontal: "center", vertical: "center", ajustar: true },
  };
}

function estiloDato({ centrado = false, formato = null } = {}) {
  return {
    fuente: { nombre: FUENTES.principal, tamano: 10, color: COLORES.texto },
    relleno: COLORES.crema,
    borde: {
      izquierdo: BORDE_CELDA,
      derecho: BORDE_CELDA,
      superior: BORDE_CELDA,
      inferior: BORDE_CELDA,
    },
    alineacion: centrado
      ? { horizontal: "center", vertical: "center" }
      : { vertical: "center" },
    formato,
  };
}

/**
 * Clasifica las columnas de la tabla de una hoja según su tipo visual.
 *
 * @param {Object} configuracion Configuración de la hoja.
 * @returns {Map<number, string>} Tipo (`fecha`, `calificacion` o `texto`)
 * indexado por número de columna.
 */

function clasificarColumnas(configuracion) {
  const tipos = new Map();

  const ultima = obtenerNumeroColumna(configuracion.ultimaColumna);

  const desde = obtenerNumeroColumna(configuracion.calificaciones.desde);

  const hasta = obtenerNumeroColumna(configuracion.calificaciones.hasta);

  const fechas = new Set(configuracion.columnasFecha.map(obtenerNumeroColumna));

  for (let columna = 1; columna <= ultima; columna += 1) {
    if (fechas.has(columna)) {
      tipos.set(columna, "fecha");
    } else if (columna >= desde && columna <= hasta) {
      tipos.set(columna, "calificacion");
    } else {
      tipos.set(columna, "texto");
    }
  }

  return tipos;
}

/**
 * Calcula el ancho de una columna a partir del texto de su encabezado.
 *
 * Excel solo parte los títulos en los espacios, así que las palabras largas
 * (por ejemplo `INTEGRIDAD_EMPAQUE`) deben caber enteras. Los títulos con
 * espacios pueden ocupar dos líneas.
 *
 * @param {string} texto Texto del encabezado.
 * @returns {number} Ancho en caracteres, sin incluir los mínimos por contenido.
 */

function calcularAnchoEncabezado(texto) {
  const limpio = String(texto || "").trim();

  if (!limpio) {
    return ANCHOS.minimo;
  }

  const palabras = limpio.split(/\s+/);

  const palabraMasLarga = Math.max(...palabras.map((palabra) => palabra.length));

  const lineas = palabras.length > 1 && limpio.length > 12 ? 2 : 1;

  const ancho =
    Math.max(palabraMasLarga * 1.25, Math.ceil(limpio.length / lineas) * 1.2) +
    ANCHOS.reservaFiltro;

  return Math.min(ANCHOS.maximo, Math.max(ANCHOS.minimo, Math.ceil(ancho)));
}

function calcularAncho(columna, texto) {
  let ancho = calcularAnchoEncabezado(texto);

  if (columna === 1) ancho = Math.max(ancho, ANCHOS.identificador);

  if (COLUMNAS_TEXTO_LARGO.test(String(texto || ""))) {
    ancho = Math.max(ancho, ANCHOS.textoLargo);
  }

  return Math.min(ANCHOS.maximo, ancho);
}

/**
 * Reconstruye el bloque `<cols>` aplicando los anchos de la tabla y
 * conservando la definición original de las columnas posteriores.
 */

function actualizarColumnasXml(hojaXml, tipos, textos) {
  const definiciones = new Map();

  const bloque = hojaXml.match(/<cols>([\s\S]*?)<\/cols>/)?.[1] || "";

  for (const col of bloque.match(/<col\b[^>]*\/>/g) || []) {
    const min = Number(col.match(/\bmin="(\d+)"/)[1]);

    const max = Number(col.match(/\bmax="(\d+)"/)[1]);

    const atributos = col
      .replace(/^<col\b/, "")
      .replace(/\/>$/, "")
      .replace(/\s*\b(min|max)="\d+"/g, "")
      .trim();

    for (let columna = min; columna <= Math.min(max, 16384); columna += 1) {
      definiciones.set(columna, atributos);
    }
  }

  for (const columna of tipos.keys()) {
    const original = definiciones.get(columna) || "";

    const atributosConservados = original
      .replace(/\s*\b(width|customWidth|bestFit)="[^"]*"/g, "")
      .trim();

    definiciones.set(
      columna,
      `width="${calcularAncho(columna, textos.get(columna))}" customWidth="1"` +
        (atributosConservados ? ` ${atributosConservados}` : ""),
    );
  }

  const columnas = [...definiciones.keys()].sort((a, b) => a - b);

  const grupos = [];

  for (const columna of columnas) {
    const atributos = definiciones.get(columna);

    const ultimo = grupos[grupos.length - 1];

    if (ultimo && ultimo.max === columna - 1 && ultimo.atributos === atributos) {
      ultimo.max = columna;
    } else {
      grupos.push({ min: columna, max: columna, atributos });
    }
  }

  const nuevoBloque =
    "<cols>" +
    grupos
      .map(
        ({ min, max, atributos }) =>
          `<col min="${min}" max="${max}" ${atributos}/>`,
      )
      .join("") +
    "</cols>";

  if (/<cols>[\s\S]*?<\/cols>/.test(hojaXml)) {
    return hojaXml.replace(/<cols>[\s\S]*?<\/cols>/, nuevoBloque);
  }

  return hojaXml.replace("<sheetData", `${nuevoBloque}<sheetData`);
}

/**
 * Asigna el color de pestaña de una hoja conservando el resto de `sheetPr`.
 */

function actualizarColorPestanaXml(hojaXml, color) {
  const tabColor = `<tabColor rgb="FF${color}"/>`;

  if (/<sheetPr\b[^>]*\/>/.test(hojaXml)) {
    return hojaXml.replace(
      /<sheetPr\b([^>]*)\/>/,
      `<sheetPr$1>${tabColor}</sheetPr>`,
    );
  }

  if (/<sheetPr\b[^>]*>/.test(hojaXml)) {
    return hojaXml
      .replace(/(<sheetPr\b[^>]*>[\s\S]*?)<tabColor\b[^>]*\/>/, "$1")
      .replace(/(<sheetPr\b[^>]*>)/, `$1${tabColor}`);
  }

  return hojaXml.replace(
    /(<worksheet\b[^>]*>)/,
    `$1<sheetPr>${tabColor}</sheetPr>`,
  );
}

/**
 * Define el alto predeterminado de las filas de datos para que no se vean
 * apretadas. Las filas con alto propio conservan el suyo.
 */

function actualizarAltoFilasXml(hojaXml) {
  const formato = `<sheetFormatPr defaultRowHeight="${ALTO_FILA_DATOS}" customHeight="1"/>`;

  if (/<sheetFormatPr\b[^>]*\/>/.test(hojaXml)) {
    return hojaXml.replace(/<sheetFormatPr\b[^>]*\/>/, formato);
  }

  return hojaXml.replace(/(<cols>|<sheetData\b)/, `${formato}$1`);
}

/**
 * Oculta la cuadrícula e inmoviliza la fila de encabezados y la primera
 * columna.
 */

function actualizarVistaHojaXml(hojaXml) {
  return hojaXml.replace(
    /<sheetView\b([^>]*?)(\/>|>[\s\S]*?<\/sheetView>)/,
    (coincidencia, atributos) => {
      const atributosLimpios = atributos
        .replace(/\s*\b(showGridLines|topLeftCell)="[^"]*"/g, "")
        .trim();

      return (
        `<sheetView showGridLines="0" ${atributosLimpios}>` +
        '<pane xSplit="1" ySplit="1" topLeftCell="B2" activePane="bottomRight" state="frozen"/>' +
        '<selection pane="topRight" activeCell="B1" sqref="B1"/>' +
        '<selection pane="bottomLeft" activeCell="A2" sqref="A2"/>' +
        '<selection pane="bottomRight" activeCell="B2" sqref="B2"/>' +
        "</sheetView>"
      );
    },
  );
}

function asignarEstiloCeldaXml(celdaXml, estilo) {
  const autocerrada = /\/>$/.test(celdaXml);

  const apertura = celdaXml.match(/^<c\b[^>]*?(?=\/?>)/)[0];

  const aperturaConEstilo = /\bs="\d+"/.test(apertura)
    ? apertura.replace(/\bs="\d+"/, `s="${estilo}"`)
    : `${apertura} s="${estilo}"`;

  if (autocerrada) {
    // Se escribe con etiqueta de cierre para que el lector de filas del
    // aplicativo no confunda la celda con la siguiente.
    return `${aperturaConEstilo}></c>`;
  }

  return aperturaConEstilo + celdaXml.slice(apertura.length);
}

/**
 * Aplica los estilos de encabezado y de datos a las celdas de la tabla.
 *
 * Las celdas inexistentes dentro de la tabla se crean vacías, únicamente con
 * su estilo, para que la fila plantilla del aplicativo tenga formato en todas
 * las columnas. Los valores y fórmulas existentes no se modifican.
 */

function actualizarFilasXml(hojaXml, tipos, estilos) {
  const ultimaColumna = Math.max(...tipos.keys());

  return hojaXml.replace(
    /<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g,
    (coincidencia, atributos, contenido = "") => {
      const numeroFila = Number(atributos.match(/\br="(\d+)"/)[1]);

      const esEncabezado = numeroFila === 1;

      const celdas = contenido.match(/<c\b[^>]*?(?:\/>|>[\s\S]*?<\/c>)/g) || [];

      const porColumna = new Map();

      for (const celda of celdas) {
        const columna = obtenerNumeroColumna(
          celda.match(/\br="([A-Z]+)\d+"/)[1],
        );

        porColumna.set(columna, celda);
      }

      for (let columna = 1; columna <= ultimaColumna; columna += 1) {
        const estilo = esEncabezado
          ? estilos.encabezado
          : estilos[tipos.get(columna)];

        const celda =
          porColumna.get(columna) ||
          `<c r="${obtenerLetraColumna(columna)}${numeroFila}"/>`;

        porColumna.set(columna, asignarEstiloCeldaXml(celda, estilo));
      }

      const contenidoActualizado = [...porColumna.keys()]
        .sort((a, b) => a - b)
        .map((columna) => porColumna.get(columna))
        .join("");

      // `spans` es opcional; se retira para que no quede desalineado con
      // las celdas creadas.
      let atributosFila = atributos.replace(/\s*\bspans="[^"]*"/, "");

      // Todas las filas de datos tienen el mismo alto.
      atributosFila = atributosFila.replace(/\s*\b(ht|customHeight)="[^"]*"/g, "");

      atributosFila += ` ht="${esEncabezado ? ALTO_ENCABEZADO : ALTO_FILA_DATOS}" customHeight="1"`;

      return `<row${atributosFila}>${contenidoActualizado}</row>`;
    },
  );
}

function construirFilaVaciaXml(numeroFila, tipos, estilos) {
  const celdas = [...tipos].map(
    ([columna, tipo]) =>
      `<c r="${obtenerLetraColumna(columna)}${numeroFila}" s="${estilos[tipo]}"></c>`,
  );

  return `<row r="${numeroFila}" ht="${ALTO_FILA_DATOS}" customHeight="1">${celdas.join("")}</row>`;
}

/**
 * Extiende el formato de las celdas de datos hasta la fila final de la hoja.
 *
 * Crea las filas que faltan entre la fila 2 y `filaFinal`, con todas las
 * columnas de la tabla en blanco y con su estilo, de modo que la hoja se vea
 * igual de formateada tenga o no datos. Las filas existentes no se tocan.
 *
 * @param {string} hojaXml Contenido XML de la hoja.
 * @param {Map<number, string>} tipos Tipo de cada columna de la tabla.
 * @param {Object} estilos Índices de estilo por tipo de celda.
 * @param {number} filaFinal Última fila con formato.
 * @returns {string} XML de la hoja con las filas completas y su dimensión.
 */

function completarFilasXml(hojaXml, tipos, estilos, filaFinal) {
  const filas = new Map();

  for (const coincidencia of hojaXml.matchAll(
    /<row\b([^>]*?)(?:\/>|>[\s\S]*?<\/row>)/g,
  )) {
    filas.set(Number(coincidencia[1].match(/\br="(\d+)"/)[1]), coincidencia[0]);
  }

  for (let fila = 2; fila <= filaFinal; fila += 1) {
    if (!filas.has(fila)) {
      filas.set(fila, construirFilaVaciaXml(fila, tipos, estilos));
    }
  }

  const datos = [...filas.keys()]
    .sort((a, b) => a - b)
    .map((fila) => filas.get(fila))
    .join("");

  const ultimaFila = Math.max(...filas.keys());

  return hojaXml
    .replace(/<sheetData>[\s\S]*?<\/sheetData>|<sheetData\/>/, () => `<sheetData>${datos}</sheetData>`)
    .replace(
      /<dimension ref="([A-Z]+\d+):([A-Z]+)(\d+)"\/>/,
      (coincidencia, inicio, columna, fila) =>
        Number(fila) >= ultimaFila
          ? coincidencia
          : `<dimension ref="${inicio}:${columna}${ultimaFila}"/>`,
    );
}

function construirFormatoCondicionalXml(rango, diferenciales) {
  return (
    `<conditionalFormatting sqref="${rango}">` +
    ESTILOS_CALIFICACION.map(
      ({ valor }, indice) =>
        `<cfRule type="cellIs" dxfId="${diferenciales[indice]}" ` +
        `priority="${indice + 1}" operator="equal">` +
        `<formula>"${valor}"</formula>` +
        "</cfRule>",
    ).join("") +
    "</conditionalFormatting>"
  );
}

/**
 * Inserta el formato condicional de calificaciones en la posición que exige
 * el esquema, reemplazando el que la presentación hubiera creado antes.
 */

function actualizarFormatoCondicionalXml(hojaXml, rango, diferenciales) {
  const sinAnterior = hojaXml.replace(
    new RegExp(
      `<conditionalFormatting sqref="${rango}">[\\s\\S]*?<\\/conditionalFormatting>`,
      "g",
    ),
    "",
  );

  const bloque = construirFormatoCondicionalXml(rango, diferenciales);

  for (const elemento of ELEMENTOS_POSTERIORES_FORMATO_CONDICIONAL) {
    const posicion = sinAnterior.search(new RegExp(`<${elemento}\\b`));

    if (posicion !== -1) {
      return (
        sinAnterior.slice(0, posicion) + bloque + sinAnterior.slice(posicion)
      );
    }
  }

  return sinAnterior.replace("</worksheet>", `${bloque}</worksheet>`);
}

/**
 * Aplica formato de fecha a las columnas indicadas sin alterar el resto de
 * atributos de estilo de la hoja.
 */

function aplicarFormatoFechaXml(hojaXml, columnas, registro) {
  const cache = new Map();

  const xfs = registro.elementos.cellXfs;

  const formatoFecha = registro.formatoNumerico(FORMATOS.fecha);

  const columnasFecha = new Set(columnas);

  return hojaXml.replace(
    /<c\b([^>]*?)(\/>|>)/g,
    (coincidencia, atributos, cierre) => {
      const columna = atributos.match(/\br="([A-Z]+)(\d+)"/);

      if (!columna || !columnasFecha.has(columna[1]) || columna[2] === "1") {
        return coincidencia;
      }

      const estiloActual = Number(atributos.match(/\bs="(\d+)"/)?.[1] || 0);

      if (!cache.has(estiloActual)) {
        const xf = xfs[estiloActual]
          .replace(/\bnumFmtId="\d+"/, `numFmtId="${formatoFecha}"`)
          .replace(/\bapplyNumberFormat="0"/, 'applyNumberFormat="1"')
          .replace(/^<xf\b(?![^>]*applyNumberFormat)/, '<xf applyNumberFormat="1"');

        cache.set(estiloActual, registro.agregar("cellXfs", xf));
      }

      const atributosActualizados = /\bs="\d+"/.test(atributos)
        ? atributos.replace(/\bs="\d+"/, `s="${cache.get(estiloActual)}"`)
        : `${atributos} s="${cache.get(estiloActual)}"`;

      return `<c${atributosActualizados}${cierre}`;
    },
  );
}

/**
 * Aplica el formato visual a una hoja de datos del seguimiento SST.
 *
 * Solo modifica atributos de estilo, anchos de columna, alto del encabezado,
 * vista de la hoja, color de pestaña y formato condicional. Los valores,
 * fórmulas, filas, columnas, nombres de encabezado y tablas no cambian.
 *
 * @param {AdmZip} zip Archivo Excel abierto como contenedor ZIP.
 * @param {Object} configuracion Configuración visual de la hoja.
 * @param {string} configuracion.ruta Ruta interna de la hoja.
 * @param {string} configuracion.ultimaColumna Última columna de la tabla.
 * @param {string[]} configuracion.columnasFecha Columnas con fechas.
 * @param {{desde: string, hasta: string}} configuracion.calificaciones
 * Columnas con calificaciones `B`, `R`, `M`, `NC` y `NA`.
 * @param {number} configuracion.filaFinal Última fila que cubre
 * el formato condicional de las calificaciones.
 * @returns {void}
 */

function aplicarFormatoHojaDatos(zip, configuracion) {
  const registro = new RegistroEstilos(zip);

  const estilos = {
    encabezado: registro.celda(estiloEncabezado()),
    texto: registro.celda(estiloDato()),
    fecha: registro.celda(estiloDato({ centrado: true, formato: FORMATOS.fecha })),
    calificacion: registro.celda(estiloDato({ centrado: true })),
  };

  const diferenciales = ESTILOS_CALIFICACION.map((estilo) =>
    registro.diferencial(estilo),
  );

  const tipos = clasificarColumnas(configuracion);

  let hojaXml = obtenerXml(zip, configuracion.ruta);

  hojaXml = actualizarColorPestanaXml(hojaXml, COLORES_PESTANA.datos);

  hojaXml = actualizarVistaHojaXml(hojaXml);

  hojaXml = actualizarColumnasXml(hojaXml, tipos, leerEncabezados(zip, configuracion.ruta));

  hojaXml = actualizarAltoFilasXml(hojaXml);

  hojaXml = actualizarFilasXml(hojaXml, tipos, estilos);

  hojaXml = completarFilasXml(hojaXml, tipos, estilos, configuracion.filaFinal);

  const { desde, hasta } = configuracion.calificaciones;

  hojaXml = actualizarFormatoCondicionalXml(
    hojaXml,
    `${desde}2:${hasta}${configuracion.filaFinal}`,
    diferenciales,
  );

  reemplazarXml(zip, configuracion.ruta, hojaXml);

  registro.guardar();
}

/**
 * Asigna el color de pestaña de una hoja.
 *
 * @param {AdmZip} zip Archivo Excel abierto como contenedor ZIP.
 * @param {string} ruta Ruta interna de la hoja.
 * @param {string} color Color RGB en hexadecimal.
 * @returns {void}
 */

function aplicarColorPestana(zip, ruta, color) {
  reemplazarXml(zip, ruta, actualizarColorPestanaXml(obtenerXml(zip, ruta), color));
}

/**
 * Aplica formato de fecha `dd/mm/yyyy` a columnas de una hoja, conservando el
 * resto de su formato.
 *
 * @param {AdmZip} zip Archivo Excel abierto como contenedor ZIP.
 * @param {string} ruta Ruta interna de la hoja.
 * @param {string[]} columnas Columnas con fechas.
 * @returns {void}
 */

function aplicarFormatoFechaColumnas(zip, ruta, columnas) {
  const registro = new RegistroEstilos(zip);

  reemplazarXml(zip, ruta, aplicarFormatoFechaXml(obtenerXml(zip, ruta), columnas, registro));

  registro.guardar();
}

module.exports = {
  calcularAnchoEncabezado,
  aplicarFormatoHojaDatos,
  aplicarColorPestana,
  aplicarFormatoFechaColumnas,
  obtenerLetraColumna,
};
