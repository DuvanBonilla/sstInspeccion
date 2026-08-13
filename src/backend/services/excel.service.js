const ExcelJS = require("exceljs");

function crearWorkbook() {
  return new ExcelJS.Workbook();
}

async function cargarWorkbook(buffer) {
  if (!buffer) {
    throw new Error("Se requiere un archivo Excel para cargar el workbook");
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  return workbook;
}

async function generarBuffer(workbook) {
  if (!workbook) {
    throw new Error("Se requiere un workbook");
  }

  return workbook.xlsx.writeBuffer();
}

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

function eliminarHojaSiExiste(workbook, nombre) {
  const worksheet = workbook.getWorksheet(nombre);

  if (worksheet) {
    workbook.removeWorksheet(worksheet.id);
  }
}

function ocultarHoja(worksheet) {
  if (!worksheet) {
    return;
  }

  worksheet.state = "hidden";
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

function configurarColumnas(worksheet, columnas) {
  if (!worksheet) {
    throw new Error("Se requiere una hoja");
  }

  if (!Array.isArray(columnas)) {
    throw new Error("Las columnas deben ser un arreglo");
  }

  worksheet.columns = columnas;
}

function activarFiltro(worksheet, rango) {
  if (!worksheet || !rango) {
    return;
  }

  worksheet.autoFilter = rango;
}

function aplicarListaDesplegable(
  worksheet,
  columna,
  filaInicio,
  filaFin,
  formula,
) {
  if (!worksheet) {
    throw new Error("Se requiere una hoja");
  }

  for (let fila = filaInicio; fila <= filaFin; fila += 1) {
    worksheet.getCell(`${columna}${fila}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [formula],
      showErrorMessage: true,
      errorStyle: "error",
      errorTitle: "Valor no permitido",
      error: "Seleccione un valor de la lista.",
    };
  }
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

module.exports = {
  crearWorkbook,
  cargarWorkbook,
  generarBuffer,

  obtenerOCrearHoja,
  eliminarHojaSiExiste,
  ocultarHoja,

  congelarEncabezado,
  configurarColumnas,
  activarFiltro,

  aplicarListaDesplegable,
  aplicarFormatoFecha,
};