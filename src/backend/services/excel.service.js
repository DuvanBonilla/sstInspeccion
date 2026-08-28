const ExcelJS = require("exceljs");

/* =========================================================
   WORKBOOK
========================================================= */

function crearWorkbook() {
  return new ExcelJS.Workbook();
}

async function generarBuffer(workbook) {
  if (!workbook) {
    throw new Error("Se requiere un workbook");
  }

  return workbook.xlsx.writeBuffer();
}

/* =========================================================
   HOJAS
========================================================= */

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

/* =========================================================
   ESTRUCTURA
========================================================= */

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

/* =========================================================
   FORMATOS
========================================================= */

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

/* =========================================================
   ESTILO GENERAL
========================================================= */

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

/* =========================================================
   ALINEACIÓN
========================================================= */

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

/* =========================================================
   EXPORTS
========================================================= */

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
