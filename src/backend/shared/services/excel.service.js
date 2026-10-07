const ExcelJS = require("exceljs");

/**
 * Crea un nuevo libro de Excel utilizando ExcelJS.
 *
 * @returns {ExcelJS.Workbook} Libro vacío preparado para agregar hojas,
 * columnas y registros.
 */

function crearWorkbook() {
  return new ExcelJS.Workbook();
}

/**
 * Convierte un libro de Excel en contenido binario XLSX.
 *
 * El Buffer resultante puede utilizarse para descargar el archivo, adjuntarlo
 * o almacenarlo en OneDrive.
 *
 * @async
 * @param {ExcelJS.Workbook} workbook Libro que será serializado.
 * @returns {Promise<Buffer>} Contenido binario del archivo XLSX.
 * @throws {Error} Si no se proporciona un libro o falla la serialización.
 */

async function generarBuffer(workbook) {
  if (!workbook) {
    throw new Error("Se requiere un workbook");
  }

  return workbook.xlsx.writeBuffer();
}

/**
 * Obtiene una hoja existente o crea una nueva dentro del libro.
 *
 * Si ya existe una hoja con el nombre indicado, devuelve esa misma instancia.
 * En caso contrario, crea la hoja utilizando las opciones proporcionadas.
 *
 * @param {ExcelJS.Workbook} workbook Libro que contiene la hoja.
 * @param {string} nombre Nombre de la hoja.
 * @param {Object} [opciones={}] Opciones utilizadas al crear una nueva hoja.
 * @returns {ExcelJS.Worksheet} Hoja existente o recién creada.
 * @throws {Error} Si no se proporciona el libro o el nombre de la hoja.
 */

function obtenerOCrearHoja(workbook, nombre, opciones = {}) {
  if (!workbook) {
    throw new Error("Se requiere un workbook");
  }

  if (!nombre) {
    throw new Error("El nombre de la hoja es obligatorio");
  }

  let worksheet = workbook.getWorksheet(nombre);

  if (!worksheet) {
    worksheet = workbook.addWorksheet(nombre, opciones);
  }

  return worksheet;
}

/**
 * Configura las columnas de una hoja de Excel.
 *
 * @param {ExcelJS.Worksheet} worksheet Hoja que recibirá la configuración.
 * @param {Array<Object>} columnas Definiciones de columnas compatibles con ExcelJS.
 * @returns {void}
 * @throws {Error} Si no se recibe una hoja o las columnas no son un arreglo.
 */

function configurarColumnas(worksheet, columnas) {
  if (!worksheet) {
    throw new Error("Se requiere una hoja");
  }

  if (!Array.isArray(columnas)) {
    throw new Error("Las columnas deben ser un arreglo");
  }

  worksheet.columns = columnas;
}

/**
 * Congela las filas superiores de una hoja para mantener visible el encabezado.
 *
 * @param {ExcelJS.Worksheet} worksheet Hoja que se configurará.
 * @param {number} [filas=1] Cantidad de filas que permanecerán fijas.
 * @returns {void}
 */

function congelarEncabezado(worksheet, filas = 1) {
  if (!worksheet) {
    return;
  }

  worksheet.views = [
    {
      state: "frozen",
      ySplit: filas,
    },
  ];
}

/**
 * Activa el filtro automático en un rango de la hoja.
 *
 * @param {ExcelJS.Worksheet} worksheet Hoja que se configurará.
 * @param {string} rango Rango de celdas al que se aplicará el filtro.
 * @returns {void}
 */

function activarFiltro(worksheet, rango) {
  if (!worksheet || !rango) {
    return;
  }

  worksheet.autoFilter = rango;
}

/**
 * Aplica un formato de fecha a una columna dentro de un rango de filas.
 *
 * @param {ExcelJS.Worksheet} worksheet Hoja que contiene las celdas.
 * @param {string} columna Letra o referencia de la columna.
 * @param {number} filaInicio Primera fila que recibirá el formato.
 * @param {number} filaFin Última fila que recibirá el formato.
 * @param {string} [formato="dd/mm/yyyy"] Formato de fecha compatible con Excel.
 * @returns {void}
 * @throws {Error} Si no se recibe una hoja.
 */

function aplicarFormatoFecha(
  worksheet,
  columna,
  filaInicio,
  filaFin,
  formato = "dd/mm/yyyy",
) {
  if (!worksheet) {
    throw new Error("Se requiere una hoja");
  }

  for (let fila = filaInicio; fila <= filaFin; fila += 1) {
    worksheet.getCell(`${columna}${fila}`).numFmt = formato;
  }
}

/**
 * Aplica el estilo visual estándar al encabezado de una hoja.
 *
 * Configura altura, tipografía, color de fondo, alineación y bordes.
 *
 * @param {ExcelJS.Worksheet} worksheet Hoja que contiene el encabezado.
 * @param {number} [fila=1] Número de la fila de encabezado.
 * @returns {void}
 * @throws {Error} Si no se recibe una hoja.
 */

function aplicarEstiloEncabezado(worksheet, fila = 1) {
  if (!worksheet) {
    throw new Error("Se requiere una hoja");
  }

  const encabezado = worksheet.getRow(fila);

  encabezado.height = 32;

  encabezado.eachCell((cell) => {
    cell.font = {
      bold: true,
      color: {
        argb: "FFFFFFFF",
      },
    };

    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: {
        argb: "FF102A5C",
      },
    };

    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };

    cell.border = {
      top: {
        style: "thin",
        color: { argb: "FFD9E1F2" },
      },
      left: {
        style: "thin",
        color: { argb: "FFD9E1F2" },
      },
      bottom: {
        style: "thin",
        color: { argb: "FFD9E1F2" },
      },
      right: {
        style: "thin",
        color: { argb: "FFD9E1F2" },
      },
    };
  });
}

/**
 * Aplica el formato visual estándar a las filas de contenido de una hoja.
 *
 * @param {ExcelJS.Worksheet} worksheet Hoja que contiene los registros.
 * @param {number} [filaInicio=2] Primera fila de datos.
 * @param {number} [filaFin=worksheet.rowCount] Última fila de datos.
 * @returns {void}
 * @throws {Error} Si no se recibe una hoja.
 */

function aplicarFormatoCuerpo(
  worksheet,
  filaInicio = 2,
  filaFin = worksheet.rowCount,
) {
  if (!worksheet) {
    throw new Error("Se requiere una hoja");
  }

  for (let fila = filaInicio; fila <= filaFin; fila += 1) {
    const row = worksheet.getRow(fila);

    row.height = 20;

    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.font = {
        name: "Calibri",
        size: 10,
      };

      cell.alignment = {
        vertical: "middle",
        wrapText: false,
      };

      cell.border = {
        bottom: {
          style: "hair",
          color: { argb: "FFD9E2F3" },
        },
      };
    });
  }
}

/**
 * Centra horizontal y verticalmente las celdas de columnas seleccionadas.
 *
 * @param {ExcelJS.Worksheet} worksheet Hoja que contiene las columnas.
 * @param {string[]} columnas Referencias de las columnas que se centrarán.
 * @param {number} [filaInicio=2] Primera fila que se procesará.
 * @param {number} [filaFin=worksheet.rowCount] Última fila que se procesará.
 * @returns {void}
 */

function centrarColumnas(
  worksheet,
  columnas,
  filaInicio = 2,
  filaFin = worksheet.rowCount,
) {
  if (!worksheet || !Array.isArray(columnas)) {
    return;
  }

  columnas.forEach((columna) => {
    for (let fila = filaInicio; fila <= filaFin; fila += 1) {
      worksheet.getCell(`${columna}${fila}`).alignment = {
        horizontal: "center",
        vertical: "middle",
        wrapText: true,
      };
    }
  });
}

/**
 * Alinea a la izquierda las celdas de columnas seleccionadas.
 *
 * @param {ExcelJS.Worksheet} worksheet Hoja que contiene las columnas.
 * @param {string[]} columnas Referencias de las columnas que se alinearán.
 * @param {number} [filaInicio=2] Primera fila que se procesará.
 * @param {number} [filaFin=worksheet.rowCount] Última fila que se procesará.
 * @returns {void}
 */

function alinearColumnasIzquierda(
  worksheet,
  columnas,
  filaInicio = 2,
  filaFin = worksheet.rowCount,
) {
  if (!worksheet || !Array.isArray(columnas)) {
    return;
  }

  columnas.forEach((columna) => {
    for (let fila = filaInicio; fila <= filaFin; fila += 1) {
      worksheet.getCell(`${columna}${fila}`).alignment = {
        horizontal: "left",
        vertical: "middle",
        wrapText: true,
      };
    }
  });
}

/**
 * Alinea a la izquierda las celdas de columnas seleccionadas.
 *
 * @param {ExcelJS.Worksheet} worksheet Hoja que contiene las columnas.
 * @param {string[]} columnas Referencias de las columnas que se alinearán.
 * @param {number} [filaInicio=2] Primera fila que se procesará.
 * @param {number} [filaFin=worksheet.rowCount] Última fila que se procesará.
 * @returns {void}
 */

function aplicarColorPorValor(
  worksheet,
  columna,
  filaInicio,
  filaFin,
  coloresPorValor,
) {
  if (!worksheet) {
    throw new Error("Se requiere una hoja");
  }

  if (!columna || !coloresPorValor) {
    return;
  }

  for (let fila = filaInicio; fila <= filaFin; fila += 1) {
    const cell = worksheet.getCell(`${columna}${fila}`);

    const valor = String(cell.value ?? "")
      .trim()
      .toUpperCase();

    const estilo = coloresPorValor[valor];

    if (!estilo) {
      continue;
    }

    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: {
        argb: estilo.fondo,
      },
    };

    cell.font = {
      ...cell.font,
      bold: true,
      color: {
        argb: estilo.texto,
      },
    };

    cell.alignment = {
      ...cell.alignment,
      horizontal: "center",
      vertical: "middle",
    };
  }
}

module.exports = {
  crearWorkbook,
  generarBuffer,

  obtenerOCrearHoja,

  configurarColumnas,
  congelarEncabezado,
  activarFiltro,

  aplicarFormatoFecha,

  aplicarEstiloEncabezado,
  aplicarFormatoCuerpo,
  centrarColumnas,
  alinearColumnasIzquierda,

  aplicarColorPorValor,
};
