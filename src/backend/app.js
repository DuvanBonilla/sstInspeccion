const path = require("node:path");
require("dotenv").config();

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
    ].map((k) => [k, Boolean(process.env[k])]),
  ),
);

const express = require("express");
const multer = require("multer");
const {
  enviarExtintorOneDrive,
  obtenerLinks,
} = require("./controllers/inspeccion.controller");
const {
  generarPdfPrueba,
  enviarPdfPruebaCorreo,
} = require("./controllers/pdfInspeccion.controller");
const {
  obtenerResumenAprobacion,
  registrarAprobacion,
  previsualizarAprobacion,
} = require("./controllers/aprobaciones.controller");
const {
  obtenerResumen,
  listarInspecciones,
  obtenerResumenEpp,
  listarInspeccionesEpp,
} = require("./controllers/estadisticas.controller");
const {
  enviarInspeccionEpp,
} = require("./controllers/inspeccionEpp.controller");

const {
  actualizarExcelSeguimientoEpp,
  sincronizarCierresExcelEpp,
} = require("./controllers/excel.controller");

const {
  listarCatalogoEpp,
  listarEppPredeterminados,
} = require("./controllers/catalogoEpp.controller");

const app = express();
app.set("trust proxy", true);
const PORT = process.env.PORT || 3000;
const upload = multer({ storage: multer.memoryStorage() });

const VIEWS_DIR = path.resolve(__dirname, "..", "views");
const FLATPICKR_DIR = path.resolve(
  __dirname,
  "..",
  "..",
  "node_modules",
  "flatpickr",
  "dist",
);

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

app.get("/inspeccion-epp", (req, res) => {
  res.sendFile(path.resolve(VIEWS_DIR, "html", "inspeccion-epp.html"));
});

app.get("/aprobar/:token", (req, res) => {
  res.sendFile(path.resolve(VIEWS_DIR, "html", "aprobar.html"));
});

app.get("/estadisticas", (req, res) => {
  res.sendFile(path.resolve(VIEWS_DIR, "html", "estadisticas.html"));
});

app.get("/estadisticas-epp", (req, res) => {
  res.sendFile(path.resolve(VIEWS_DIR, "html", "estadisticas-epp.html"));
});

app.post("/enviar-onedrive-extintor", upload.any(), enviarExtintorOneDrive);
app.post("/enviar-inspeccion-epp", upload.any(), enviarInspeccionEpp);
app.post("/pdf-prueba", upload.any(), generarPdfPrueba);
app.post("/enviar-pdf-prueba-correo", upload.any(), enviarPdfPruebaCorreo);

app.get("/api/aprobaciones/:token", obtenerResumenAprobacion);
app.get("/api/aprobaciones/:token/preview", previsualizarAprobacion);
app.post("/api/aprobaciones/:token", registrarAprobacion);
app.get("/api/estadisticas/resumen", obtenerResumen);
app.get("/api/estadisticas/inspecciones", listarInspecciones);
app.get("/api/estadisticas-epp/resumen", obtenerResumenEpp);
app.get("/api/estadisticas-epp/inspecciones", listarInspeccionesEpp);
app.post("/api/excel/epp/actualizar-onedrive", actualizarExcelSeguimientoEpp);
app.post("/api/excel/epp/sincronizar-cierres", sincronizarCierresExcelEpp);
app.get("/api/inspecciones/:id/links", obtenerLinks);
app.get("/api/catalogo-epp", listarCatalogoEpp);
app.get("/api/catalogo-epp/predeterminados", listarEppPredeterminados);

app.listen(PORT, () => {
  console.log(`Servidor MVC activo en http://localhost:${PORT}`);
});
