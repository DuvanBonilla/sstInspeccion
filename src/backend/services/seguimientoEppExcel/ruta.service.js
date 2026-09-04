/**
 * Obtiene y valida la ruta del archivo de seguimiento EPP en OneDrive.
 *
 * Lee la variable de entorno `ONEDRIVE_EPP_EXCEL_PATH`, elimina espacios
 * innecesarios y comprueba que exista y corresponda con un archivo `.xlsx`.
 *
 * @returns {string} Ruta configurada para el archivo Excel de seguimiento EPP.
 * @throws {Error} Si la variable de entorno no está configurada o la ruta
 * no termina con la extensión `.xlsx`.
 */

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