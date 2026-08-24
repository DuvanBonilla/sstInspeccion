function obtenerXml(zip, rutaInterna) {
  const entrada = zip.getEntry(rutaInterna);

  if (!entrada) {
    throw new Error(
      `No se encontró ${rutaInterna} dentro del archivo Excel`,
    );
  }

  return entrada.getData().toString("utf8");
}

function reemplazarXml(zip, rutaInterna, contenidoXml) {
  const entrada = zip.getEntry(rutaInterna);

  if (!entrada) {
    throw new Error(
      `No se encontró ${rutaInterna} dentro del archivo Excel`,
    );
  }

  zip.updateFile(
    rutaInterna,
    Buffer.from(contenidoXml, "utf8"),
  );
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

      columna =
        String.fromCharCode(65 + (valor % 26)) + columna;

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

function convertirFechaAExcel(fecha) {
  const valor = String(fecha || "").trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return null;
  }

  const [anio, mes, dia] = valor
    .split("-")
    .map(Number);

  const fechaUtc = Date.UTC(
    anio,
    mes - 1,
    dia,
  );

  const fechaValidada = new Date(fechaUtc);

  if (
    fechaValidada.getUTCFullYear() !== anio ||
    fechaValidada.getUTCMonth() !== mes - 1 ||
    fechaValidada.getUTCDate() !== dia
  ) {
    return null;
  }

  const origenExcel = Date.UTC(
    1899,
    11,
    30,
  );

  return Math.floor(
    (fechaUtc - origenExcel) / 86400000,
  );
}

function obtenerEstilosFilaPlantilla(hojaXml, numeroFila = 2) {
  const expresionFila = new RegExp(
    `<row\\b[^>]*\\br="${numeroFila}"[^>]*>[\\s\\S]*?<\\/row>`,
  );

  const filaPlantilla = hojaXml.match(expresionFila)?.[0];

  if (!filaPlantilla) {
    throw new Error(
      `No se encontró la fila ${numeroFila} de la hoja Excel`,
    );
  }

  const estilos = {};

  const celdas =
    filaPlantilla.match(
      /<c\b[^>]*(?:\/>|>[\s\S]*?<\/c>)/g,
    ) || [];

  for (const celda of celdas) {
    const referencia = celda.match(
      /\br="([A-Z]+)\d+"/,
    )?.[1];

    if (!referencia) {
      continue;
    }

    const estilo = celda.match(
      /\bs="(\d+)"/,
    )?.[1];

    estilos[referencia] = estilo || null;
  }

  return estilos;
}

function limpiarCeldaExistenteXml(celdaXml) {
  const referencia = celdaXml.match(
    /\br="([^"]+)"/,
  )?.[1];

  if (!referencia) {
    return celdaXml;
  }

  const estilo = celdaXml.match(
    /\bs="(\d+)"/,
  )?.[1];

  const atributoEstilo = estilo
    ? ` s="${estilo}"`
    : "";

  return `<c r="${referencia}"${atributoEstilo}/>`;
}

function construirCeldaXml({
  columna,
  numeroFila,
  valor,
  estilos,
  columnasFecha = [],
  columnasNumericas = [],
}) {
  const referencia = `${columna}${numeroFila}`;

  const estilo = estilos[columna]
    ? ` s="${estilos[columna]}"`
    : "";

  if (
    valor === null ||
    valor === undefined ||
    valor === ""
  ) {
    return `<c r="${referencia}"${estilo}/>`;
  }

  if (columnasFecha.includes(columna)) {
    const fechaExcel = convertirFechaAExcel(valor);

    if (fechaExcel !== null) {
      return (
        `<c r="${referencia}"${estilo}>` +
        `<v>${fechaExcel}</v>` +
        `</c>`
      );
    }
  }

  if (
    columnasNumericas.includes(columna) &&
    /^\d+$/.test(String(valor))
  ) {
    return (
      `<c r="${referencia}"${estilo}>` +
      `<v>${String(valor)}</v>` +
      `</c>`
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

function actualizarDimensionHojaXml(
  hojaXml,
  ultimaFilaNecesaria,
) {
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
    throw new Error(
      `No se encontró sheetData en la hoja ${nombreHoja}`,
    );
  }

  const contenidoActual = coincidenciaSheetData[1];

  const estilos = obtenerEstilosFilaPlantilla(
    hojaXml,
  );

  const columnas = obtenerColumnasHasta(
    ultimaColumna,
  );

  const limiteColumna = obtenerNumeroColumna(
    ultimaColumna,
  );

  const filasExistentes = new Map();

  const expresionFilas =
    /<row\b([^>]*)>([\s\S]*?)<\/row>/g;

  for (const coincidencia of contenidoActual.matchAll(
    expresionFilas,
  )) {
    const atributosFila = coincidencia[1];

    const numeroFila = Number(
      atributosFila.match(/\br="(\d+)"/)?.[1],
    );

    if (!numeroFila) {
      continue;
    }

    filasExistentes.set(numeroFila, {
      atributos: atributosFila,
      contenido: coincidencia[2],
    });
  }

  if (!filasExistentes.has(1)) {
    throw new Error(
      `No se encontró el encabezado de la hoja ${nombreHoja}`,
    );
  }

  const ultimaFilaDatos = Math.max(
    2,
    filas.length + 1,
  );

  for (
    let numeroFila = 2;
    numeroFila <= ultimaFilaDatos;
    numeroFila += 1
  ) {
    if (!filasExistentes.has(numeroFila)) {
      filasExistentes.set(numeroFila, {
        atributos: ` r="${numeroFila}"`,
        contenido: "",
      });
    }
  }

  const filasOrdenadas = [
    ...filasExistentes.entries(),
  ].sort(
    ([filaA], [filaB]) => filaA - filaB,
  );

  const filasActualizadas = filasOrdenadas.map(
    ([numeroFila, filaActual]) => {
      if (numeroFila === 1) {
        return (
          `<row${filaActual.atributos}>` +
          `${filaActual.contenido}` +
          `</row>`
        );
      }

      const celdasActuales =
        filaActual.contenido.match(
          /<c\b[^>]*(?:\/>|>[\s\S]*?<\/c>)/g,
        ) || [];

      const filaDatos =
        filas[numeroFila - 2] || null;

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
        const columna = celda.match(
          /\br="([A-Z]+)\d+"/,
        )?.[1];

        if (!columna) {
          continue;
        }

        const numeroColumna =
          obtenerNumeroColumna(columna);

        if (numeroColumna > limiteColumna) {
          celdasResultado.push(celda);

          continue;
        }

        if (!filaDatos) {
          celdasResultado.push(
            limpiarCeldaExistenteXml(celda),
          );
        }
      }

      celdasResultado.sort((celdaA, celdaB) => {
        const columnaA = celdaA.match(
          /\br="([A-Z]+)\d+"/,
        )?.[1];

        const columnaB = celdaB.match(
          /\br="([A-Z]+)\d+"/,
        )?.[1];

        return (
          obtenerNumeroColumna(columnaA) -
          obtenerNumeroColumna(columnaB)
        );
      });

      return (
        `<row${filaActual.atributos}>` +
        `${celdasResultado.join("")}` +
        `</row>`
      );
    },
  );

  const hojaActualizada = hojaXml.replace(
    /<sheetData>[\s\S]*?<\/sheetData>/,
    `<sheetData>${filasActualizadas.join("")}</sheetData>`,
  );

  return actualizarDimensionHojaXml(
    hojaActualizada,
    ultimaFilaDatos,
  );
}

function actualizarRangoTablaXml({
  tablaXml,
  ultimaColumna,
  cantidadFilas,
}) {
  const ultimaFila = Math.max(
    2,
    cantidadFilas + 1,
  );

  const nuevoRango =
    `A1:${ultimaColumna}${ultimaFila}`;

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