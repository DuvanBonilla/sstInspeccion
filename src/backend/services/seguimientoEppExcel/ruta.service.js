function obtenerRutaExcelEpp() {
  const ruta = String(
    process.env.ONEDRIVE_EPP_EXCEL_PATH || "",
  ).trim();

  if (!ruta) {
    throw new Error(
      "Falta configurar ONEDRIVE_EPP_EXCEL_PATH en el archivo .env",
    );
  }

  if (!ruta.toLowerCase().endsWith(".xlsx")) {
    throw new Error(
      "ONEDRIVE_EPP_EXCEL_PATH debe terminar en .xlsx",
    );
  }

  return ruta;
}

module.exports = {
  obtenerRutaExcelEpp,
};