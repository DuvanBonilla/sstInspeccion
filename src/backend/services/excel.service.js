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
 * @returns { @returns {ExcelJS.Worksheet} Hoja existente o recién creada.
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

function configurarColumnas(worksheet, columnas) {
  if (!worksheet) {
    throw new Error("Se requiere una hoja");
  }

  if (!Array.isArray(columnas)) {
    throw new Error("Las columnas deben ser un arreglo");
  }

  worksheet.columns = columnas;
}

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

function activarFiltro(worksheet, rango) {
  if (!worksheet || !rango) {
    return;
  }

  worksheet.autoFilter = rango;
}

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
