/**
 * Punto de entrada del servidor HTTP.
 *
 * Carga las variables de entorno e inicia la aplicación Express.
 *
 * @module server
 */

require("dotenv").config();

const app = require("./app");

const PORT = process.env.PORT || 3000;

console.log(
  "[ENV CHECK]",
  Object.fromEntries(
    [
      "MS_TENANT_ID",
      "MS_CLIENT_ID",
      "MS_CLIENT_SECRET",
      "ONEDRIVE_USER_ID",
      "ONEDRIVE_EXCEL_PATH",
      "GRAPH_EMAIL_TO_TEST",
      "DATABASE_URL",
    ].map((key) => [key, Boolean(process.env[key])]),
  ),
);

app.listen(PORT, () => {
  console.log(`Servidor MVC activo en http://localhost:${PORT}`);
});