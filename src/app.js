/*
  app.js — Punto de entrada del servidor Express.

  Qué hace:
  - Arranca el servidor HTTP en el puerto definido en .env (o 3000 por defecto).
  - Sirve los archivos estáticos del frontend (HTML, CSS, JS, imágenes) desde src/views/.
  - Define las rutas de la aplicación:
      GET  /                       → pantalla de inicio (index.html)
      GET  /inspeccion-sst         → formulario SST completo (inspeccion-sst.html)
      POST /enviar-onedrive-extintor → guarda la inspección en OneDrive (Excel + imágenes)
      POST /pdf-prueba             → genera y descarga el PDF de la inspección
      POST /enviar-pdf-prueba-correo → genera el PDF y lo envía por correo (Microsoft Graph)

  Cómo interactúa:
  - El frontend (inspeccion-sst.js) hace POST a las rutas anteriores con un FormData
    que incluye el campo "payload" (JSON) y los archivos de evidencia.
  - extintor.controller.js maneja /enviar-onedrive-extintor.
  - pdfInspeccion.controller.js maneja /pdf-prueba y /enviar-pdf-prueba-correo.
*/
const path = require("node:path");
require("dotenv").config();

// Diagnóstico temporal: confirma qué variables de entorno llegaron al proceso.
console.log("[ENV CHECK]", Object.fromEntries(
  ["MS_TENANT_ID", "MS_CLIENT_ID", "MS_CLIENT_SECRET", "ONEDRIVE_USER_ID",
   "ONEDRIVE_EXCEL_PATH", "ONEDRIVE_TABLE_NAME", "GRAPH_EMAIL_TO_TEST"]
    .map((k) => [k, Boolean(process.env[k])])
));

const express = require("express");
const multer = require("multer");
const { enviarExtintorOneDrive } = require("./controllers/inspeccion.controller");
const { generarPdfPrueba, enviarPdfPruebaCorreo } = require("./controllers/pdfInspeccion.controller");

const app = express();
const PORT = process.env.PORT || 3000;
const upload = multer({ storage: multer.memoryStorage() });

// Sirve archivos estaticos del frontend (HTML, CSS, JS).
app.use(express.static(path.resolve(__dirname, "views")));
app.use("/src", express.static(path.resolve(__dirname)));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.sendFile(path.resolve(__dirname, "views", "html", "index.html"));
});

app.get("/inspeccion-sst", (req, res) => {
  res.sendFile(path.resolve(__dirname, "views", "html", "inspeccion-sst.html"));
});

app.post("/enviar-onedrive-extintor", upload.any(), enviarExtintorOneDrive);
app.post("/pdf-prueba", upload.any(), generarPdfPrueba);
app.post("/enviar-pdf-prueba-correo", upload.any(), enviarPdfPruebaCorreo);

app.listen(PORT, () => {
  console.log(`Servidor MVC activo en http://localhost:${PORT}`);
});
