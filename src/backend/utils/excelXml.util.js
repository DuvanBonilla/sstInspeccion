/**
 * Obtiene el contenido XML de un archivo interno del libro de Excel.
 *
 * Busca la entrada indicada dentro del contenedor ZIP y convierte su contenido
 * binario en una cadena UTF-8.
 *
 * @param {@param {AdmZip} zip} zip - Archivo Excel abierto como contenedor ZIP.
 * @param {string} rutaInterna - Ruta del archivo XML dentro del contenedor.
 * @returns {string} Contenido XML de la entrada solicitada.
 * @throws {Error} Si la ruta indicada no existe dentro del archivo Excel.
 */

function obtenerXml(zip, rutaInterna) {
  const entrada = zip.getEntry(rutaInterna);

  if (!entrada) {
    throw new Error(`No se encontró ${rutaInterna} dentro del archivo Excel`);
  }

  return entrada.getData().toString("utf8");
}

/**
 * Reemplaza el contenido de un archivo XML dentro del libro de Excel.
 *
 * Convierte el XML actualizado en un Buffer UTF-8 y lo almacena nuevamente
 * en la misma ruta interna del contenedor.
 *
 * @param {@param {AdmZip} zip} zip - Archivo Excel abierto como contenedor ZIP.
 * @param {string} rutaInterna - Ruta del archivo XML que debe reemplazarse.
 * @param {string} contenidoXml - Nuevo contenido XML.
 * @returns {void}
 * @throws {Error} Si la ruta indicada no existe dentro del archivo Excel.
 */

function reemplazarXml(zip, rutaInterna, contenidoXml) {
  const entrada = zip.getEntry(rutaInterna);

  if (!entrada) {
    throw new Error(`No se encontró ${rutaInterna} dentro del archivo Excel`);
  }

  zip.updateFile(rutaInterna, Buffer.from(contenidoXml, "utf8"));
}

function generarBufferExcel(zip) {
  return zip.toBuffer();
}

function obtenerNumeroColumna(columna) {
  let numero = 0;

  for (const letra of String(columna || "").toUpperCase()) {
    numero = numero * 26 + (letra.charCodeAt(0) - 64);
  }

  return numero;
}

function obtenerColumnasHasta(columnaFinal) {
  const totalColumnas = obtenerNumeroColumna(columnaFinal);

  const columnas = [];

  for (let numero = 1; numero <= totalColumnas; numero += 1) {
    let valor = numero;

    let columna = "";

    while (valor > 0) {
      valor -= 1;

      columna = String.fromCharCode(65 + (valor % 26)) + columna;

      valor = Math.floor(valor / 26);
    }

    columnas.push(columna);
  }

  return columnas;
}

function escaparXml(valor) {
  return String(valor ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Convierte una fecha de calendario al número serial utilizado por Excel.
 *
 * Valida que el valor tenga el formato `AAAA-MM-DD` y que represente una
 * fecha real antes de calcular los días transcurridos desde el origen
 * utilizado por Excel.
 *
 * @param {string} fecha - Fecha que debe convertirse.
 * @returns {number|null} Número serial de Excel, o `null` si la fecha no es válida.
 */

function convertirFechaAExcel(fecha) {
  const valor = String(fecha || "").trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return null;
  }

  const [anio, mes, dia] = valor.split("-").map(Number);

  const fechaUtc = Date.UTC(anio, mes - 1, dia);

  const fechaValidada = new Date(fechaUtc);

  if (
    fechaValidada.getUTCFullYear() !== anio ||
    fechaValidada.getUTCMonth() !== mes - 1 ||
    fechaValidada.getUTCDate() !== dia
  ) {
    return null;
  }

  const origenExcel = Date.UTC(1899, 11, 30);

  return Math.floor((fechaUtc - origenExcel) / 86400000);
}

function obtenerEstilosFilaPlantilla(hojaXml, numeroFila = 2) {
  const expresionFila = new RegExp(
    `<row\\b[^>]*\\br="${numeroFila}"[^>]*(?:\\/>|>[\\s\\S]*?<\\/row>)`,
  );

  const filaPlantilla = hojaXml.match(expresionFila)?.[0];

  if (!filaPlantilla) {
    throw new Error(`No se encontró la fila ${numeroFila} de la hoja Excel`);
  }

  const estilos = {};

  const celdas = filaPlantilla.match(/<c\b[^>]*(?:\/>|>[\s\S]*?<\/c>)/g) || [];

  for (const celda of celdas) {
    const referencia = celda.match(/\br="([A-Z]+)\d+"/)?.[1];

    if (!referencia) {
      continue;
    }

    const estilo = celda.match(/\bs="(\d+)"/)?.[1];

    estilos[referencia] = estilo || null;
  }

  return estilos;
}

function limpiarCeldaExistenteXml(celdaXml) {
  const referencia = celdaXml.match(/\br="([^"]+)"/)?.[1];

  if (!referencia) {
    return celdaXml;
  }

  const estilo = celdaXml.match(/\bs="(\d+)"/)?.[1];

  const atributoEstilo = estilo ? ` s="${estilo}"` : "";

  return `<c r="${referencia}"${atributoEstilo}/>`;
}

/**
 * Construye el XML de una celda para una fila del seguimiento.
 *
 * Conserva el estilo configurado para la columna y escribe el valor como
 * fecha, número o texto según la configuración recibida. Los valores vacíos
 * generan una celda sin contenido.
 *
 * @param {Object} configuracion - Configuración de la celda.
 * @param {string} configuracion.columna - Letra de la columna.
 * @param {number} configuracion.numeroFila - Número de la fila.
 * @param {*} configuracion.valor - Valor que debe escribirse.
 * @param {Object<string, string|null>} configuracion.estilos
 * Estilos obtenidos desde la fila utilizada como plantilla.
 * @param {string[]} [configuracion.columnasFecha=[]]
 * Columnas que deben almacenar fechas de Excel.
 * @param {string[]} [configuracion.columnasNumericas=[]]
 * Columnas que deben almacenar valores numéricos.
 * @returns {string} Representación XML de la celda.
 */

function construirCeldaXml({
  columna,
  numeroFila,
  valor,
  estilos,
  columnasFecha = [],
  columnasNumericas = [],
}) {
  const referencia = `${columna}${numeroFila}`;

  const estilo = estilos[columna] ? ` s="${estilos[columna]}"` : "";

  if (valor === null || valor === undefined || valor === "") {
    return `<c r="${referencia}"${estilo}/>`;
  }

  if (columnasFecha.includes(columna)) {
    const fechaExcel = convertirFechaAExcel(valor);

    if (fechaExcel !== null) {
      return `<c r="${referencia}"${estilo}>` + `<v>${fechaExcel}</v>` + `</c>`;
    }
  }

  if (columnasNumericas.includes(columna) && /^\d+$/.test(String(valor))) {
    return (
      `<c r="${referencia}"${estilo}>` + `<v>${String(valor)}</v>` + `</c>`
    );
  }

  return (
    `<c r="${referencia}"${estilo} t="inlineStr">` +
    `<is>` +
    `<t xml:space="preserve">` +
    `${escaparXml(valor)}` +
    `</t>` +
    `</is>` +
    `</c>`
  );
}

/**
 * Actualiza el rango de dimensiones declarado para una hoja de Excel.
 *
 * Amplía la última fila de la dimensión cuando los datos escritos superan
 * el rango existente, conservando el límite actual cuando ya es suficiente.
 *
 * @param {string} hojaXml - Contenido XML de la hoja.
 * @param {number} ultimaFilaNecesaria - Última fila requerida por los datos.
 * @returns {string} XML con la dimensión de la hoja actualizada.
 */

function actualizarDimensionHojaXml(hojaXml, ultimaFilaNecesaria) {
  return hojaXml.replace(
    /(<dimension\b[^>]*\bref=")([A-Z]+\d+):([A-Z]+)(\d+)(")/,
    (
      coincidencia,
      inicioEtiqueta,
      primeraCelda,
      ultimaColumna,
      ultimaFilaActual,
      cierre,
    ) => {
      const ultimaFila = Math.max(
        Number(ultimaFilaActual),
        Number(ultimaFilaNecesaria),
      );

      return (
        inicioEtiqueta +
        primeraCelda +
        ":" +
        ultimaColumna +
        ultimaFila +
        cierre
      );
    },
  );
}

/**
 * Reconstruye las filas administradas de una hoja de Excel.
 *
 * Conserva el encabezado y los estilos de la fila plantilla, reemplaza los
 * datos dentro del rango administrado y mantiene las celdas ubicadas después
 * de la última columna configurada. Las filas sobrantes se conservan con sus
 * estilos, pero sus valores administrados se eliminan.
 *
 * Finalmente actualiza la dimensión declarada de la hoja para cubrir todas
 * las filas necesarias.
 *
 * @param {Object} configuracion - Configuración de la actualización.
 * @param {string} configuracion.hojaXml - Contenido XML actual de la hoja.
 * @param {Array<Object<string, *>>} configuracion.filas
 * Filas que deben escribirse, indexadas mediante letras de columnas.
 * @param {string} configuracion.ultimaColumna
 * Última columna que pertenece al rango administrado.
 * @param {string} configuracion.nombreHoja
 * Nombre utilizado para identificar la hoja en los errores.
 * @param {string[]} [configuracion.columnasFecha=[]]
 * Columnas que deben escribirse como fechas.
 * @param {string[]} [configuracion.columnasNumericas=[]]
 * Columnas que deben escribirse como números.
 * @returns {string} XML de la hoja con sus filas actualizadas.
 * @throws {Error} Si no existe `sheetData`, el encabezado o la fila plantilla.
 */

function actualizarFilasHojaXml({
  hojaXml,
  filas,
  ultimaColumna,
  nombreHoja,
  columnasFecha = [],
  columnasNumericas = [],
}) {
  const coincidenciaSheetData = hojaXml.match(
    /<sheetData>([\s\S]*?)<\/sheetData>/,
  );

  if (!coincidenciaSheetData) {
    throw new Error(`No se encontró sheetData en la hoja ${nombreHoja}`);
  }

  const contenidoActual = coincidenciaSheetData[1];

  const estilos = obtenerEstilosFilaPlantilla(hojaXml);

  const columnas = obtenerColumnasHasta(ultimaColumna);

  const limiteColumna = obtenerNumeroColumna(ultimaColumna);

  const filasExistentes = new Map();

  const expresionFilas = /<row\b([^>]*)>([\s\S]*?)<\/row>/g;

  for (const coincidencia of contenidoActual.matchAll(expresionFilas)) {
    const atributosFila = coincidencia[1];

    const numeroFila = Number(atributosFila.match(/\br="(\d+)"/)?.[1]);

    if (!numeroFila) {
      continue;
    }

    filasExistentes.set(numeroFila, {
      atributos: atributosFila,
      contenido: coincidencia[2],
    });
  }

  if (!filasExistentes.has(1)) {
    throw new Error(`No se encontró el encabezado de la hoja ${nombreHoja}`);
  }

  const ultimaFilaDatos = Math.max(2, filas.length + 1);

  for (let numeroFila = 2; numeroFila <= ultimaFilaDatos; numeroFila += 1) {
    if (!filasExistentes.has(numeroFila)) {
      filasExistentes.set(numeroFila, {
        atributos: ` r="${numeroFila}"`,
        contenido: "",
      });
    }
  }

  const filasOrdenadas = [...filasExistentes.entries()].sort(
    ([filaA], [filaB]) => filaA - filaB,
  );

  const filasActualizadas = filasOrdenadas.map(([numeroFila, filaActual]) => {
    if (numeroFila === 1) {
      return (
        `<row${filaActual.atributos}>` + `${filaActual.contenido}` + `</row>`
      );
    }

    const celdasActuales =
      filaActual.contenido.match(/<c\b[^>]*(?:\/>|>[\s\S]*?<\/c>)/g) || [];

    const filaDatos = filas[numeroFila - 2] || null;

    const celdasResultado = [];

    if (filaDatos) {
      for (const columna of columnas) {
        celdasResultado.push(
          construirCeldaXml({
            columna,

            numeroFila,

            valor: filaDatos[columna],

            estilos,

            columnasFecha,

            columnasNumericas,
          }),
        );
      }
    }

    for (const celda of celdasActuales) {
      const columna = celda.match(/\br="([A-Z]+)\d+"/)?.[1];

      if (!columna) {
        continue;
      }

      const numeroColumna = obtenerNumeroColumna(columna);

      if (numeroColumna > limiteColumna) {
        celdasResultado.push(celda);

        continue;
      }

      if (!filaDatos) {
        celdasResultado.push(limpiarCeldaExistenteXml(celda));
      }
    }

    celdasResultado.sort((celdaA, celdaB) => {
      const columnaA = celdaA.match(/\br="([A-Z]+)\d+"/)?.[1];

      const columnaB = celdaB.match(/\br="([A-Z]+)\d+"/)?.[1];

      return obtenerNumeroColumna(columnaA) - obtenerNumeroColumna(columnaB);
    });

    return (
      `<row${filaActual.atributos}>` + `${celdasResultado.join("")}` + `</row>`
    );
  });

  const hojaActualizada = hojaXml.replace(
    /<sheetData>[\s\S]*?<\/sheetData>/,
    `<sheetData>${filasActualizadas.join("")}</sheetData>`,
  );

  return actualizarDimensionHojaXml(hojaActualizada, ultimaFilaDatos);
}

/**
 * Actualiza el rango ocupado por una tabla estructurada de Excel.
 *
 * Calcula el rango desde `A1` hasta la última columna y fila necesarias,
 * manteniendo como mínimo una fila de datos. Actualiza tanto la referencia
 * principal de la tabla como la del filtro automático.
 *
 * @param {Object} configuracion - Configuración del rango.
 * @param {string} configuracion.tablaXml - Contenido XML de la tabla.
 * @param {string} configuracion.ultimaColumna - Última columna de la tabla.
 * @param {number} configuracion.cantidadFilas - Cantidad de filas de datos.
 * @returns {{xml: string, rango: string}}
 * XML actualizado y nuevo rango asignado a la tabla.
 */

function actualizarRangoTablaXml({ tablaXml, ultimaColumna, cantidadFilas }) {
  const ultimaFila = Math.max(2, cantidadFilas + 1);

  const nuevoRango = `A1:${ultimaColumna}${ultimaFila}`;

  let xmlActualizado = tablaXml.replace(
    /(<table\b[^>]*\bref=")[^"]+(")/,
    `$1${nuevoRango}$2`,
  );

  xmlActualizado = xmlActualizado.replace(
    /(<autoFilter\b[^>]*\bref=")[^"]+(")/,
    `$1${nuevoRango}$2`,
  );

  return {
    xml: xmlActualizado,
    rango: nuevoRango,
  };
}

module.exports = {
  obtenerXml,
  reemplazarXml,
  generarBufferExcel,

  obtenerNumeroColumna,
  obtenerColumnasHasta,

  escaparXml,
  convertirFechaAExcel,

  obtenerEstilosFilaPlantilla,
  limpiarCeldaExistenteXml,

  construirCeldaXml,
  actualizarDimensionHojaXml,
  actualizarFilasHojaXml,
  actualizarRangoTablaXml,
};
