/*
  app.js — Punto de entrada del servidor Express.

  Qué hace:
  - Arranca el servidor HTTP en el puerto definido en .env (o 3000 por defecto).
  - Sirve los archivos estáticos del frontend (HTML, CSS, JS, imágenes) desde src/views/.
  - Define las rutas de la aplicación:
      GET  /                       → pantalla de inicio (index.html)
      GET  /inspeccion-sst         → formulario SST completo (inspeccion-sst.html)
      GET  /aprobar/:token         → página de aprobación (aprobar.html)
      POST /enviar-onedrive-extintor → guarda la inspección en Neon + evidencias en OneDrive; el Inspector queda aprobado automáticamente y devuelve los links de aprobación de Jefe de Área y COPASST
      POST /pdf-prueba             → genera y descarga el PDF de la inspección (sin aprobar, vista previa)
      POST /enviar-pdf-prueba-correo → genera el PDF y lo envía por correo (Microsoft Graph) — uso manual/no automático
      GET  /api/aprobaciones/:token  → resumen de la inspección para el rol dueño del token
      POST /api/aprobaciones/:token  → guarda la aprobación del rol dueño del token; si completa las 3, archiva el PDF final y envía el correo

  Cómo interactúa:
  - El frontend (inspeccion-sst.js) hace POST a /enviar-onedrive-extintor con un FormData
    que incluye el campo "payload" (JSON) y los archivos de evidencia.
  - inspeccion.controller.js maneja /enviar-onedrive-extintor (Neon + OneDrive).
  - pdfInspeccion.controller.js maneja /pdf-prueba y /enviar-pdf-prueba-correo.
  - aprobaciones.controller.js maneja /api/aprobaciones/:token (GET y POST); la
    página aprobar.js consume esa API (nombre + cédula, sin firma dibujada).
*/
const path = require("node:path");
require("dotenv").config();

// Diagnóstico temporal: confirma qué variables de entorno llegaron al proceso.
console.log("[ENV CHECK]", Object.fromEntries(
  ["MS_TENANT_ID", "MS_CLIENT_ID", "MS_CLIENT_SECRET", "ONEDRIVE_USER_ID",
   "ONEDRIVE_EXCEL_PATH", "GRAPH_EMAIL_TO_TEST", "DATABASE_URL"]
    .map((k) => [k, Boolean(process.env[k])])
));

const express = require("express");
const multer = require("multer");
const { enviarExtintorOneDrive, obtenerLinks } = require("./controllers/inspeccion.controller");
const { generarPdfPrueba, enviarPdfPruebaCorreo,  } = require("./controllers/pdfInspeccion.controller");
const { obtenerResumenAprobacion, registrarAprobacion, previsualizarAprobacion } = require("./controllers/aprobaciones.controller");
const { obtenerResumen, listarInspecciones } = require("./controllers/estadisticas.controller");

const app = express();
app.set("trust proxy", true); // para que req.protocol refleje https detrás del proxy de Render
const PORT = process.env.PORT || 3000;
const upload = multer({ storage: multer.memoryStorage() });

// Sirve archivos estaticos del frontend (HTML, CSS, JS) desde src/views/ (hermano de backend/).
const VIEWS_DIR = path.resolve(__dirname, "..", "views");
const FLATPICKR_DIR = path.resolve(__dirname,"..","..","node_modules","flatpickr","dist");


app.use(express.static(VIEWS_DIR));
app.use("/flatpickr", express.static(FLATPICKR_DIR));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.sendFile(path.resolve(VIEWS_DIR, "html", "index.html"));
});

app.get("/inspeccion-sst", (req, res) => {
  res.sendFile(path.resolve(VIEWS_DIR, "html", "inspeccion-sst.html"));
});

app.get("/aprobar/:token", (req, res) => {
  res.sendFile(path.resolve(VIEWS_DIR, "html", "aprobar.html"));
});

app.get("/estadisticas", (req, res) => {
  res.sendFile(path.resolve(VIEWS_DIR, "html", "estadisticas.html"));
});

  app.get(
    "/api/inspecciones/:id/links",
    obtenerLinks
);

app.post("/enviar-onedrive-extintor", upload.any(), enviarExtintorOneDrive);


app.post("/pdf-prueba", upload.any(), generarPdfPrueba);
app.post("/enviar-pdf-prueba-correo", upload.any(), enviarPdfPruebaCorreo);

app.get("/api/aprobaciones/:token", obtenerResumenAprobacion);
app.get("/api/aprobaciones/:token/preview", previsualizarAprobacion);
app.post("/api/aprobaciones/:token", registrarAprobacion);
app.get("/api/estadisticas/resumen", obtenerResumen);
app.get("/api/estadisticas/inspecciones", listarInspecciones);
app.get("/api/inspecciones/:id/links", obtenerLinks);

app.listen(PORT, () => {
  console.log(`Servidor MVC activo en http://localhost:${PORT}`);
});
