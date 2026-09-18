/**
 * Rutas encargadas de servir las páginas HTML de la aplicación.
 *
 * Este archivo no contiene lógica de negocio ni acceso a datos.
 *
 * @module routes/paginas
 */

const path = require("node:path");
const { Router } = require("express");

const router = Router();

const VIEWS_HTML_DIR = path.resolve(
  __dirname,
  "..",
  "..",
  "views",
  "html",
);

router.get("/", (req, res) => {
  res.sendFile(path.resolve(VIEWS_HTML_DIR, "index.html"));
});

router.get("/inspeccion-sst", (req, res) => {
  res.sendFile(path.resolve(VIEWS_HTML_DIR, "inspeccion-sst.html"));
});

router.get("/inspeccion-epp", (req, res) => {
  res.sendFile(path.resolve(VIEWS_HTML_DIR, "inspeccion-epp.html"));
});

router.get("/aprobar/:token", (req, res) => {
  res.sendFile(path.resolve(VIEWS_HTML_DIR, "aprobar.html"));
});

router.get("/estadisticas", (req, res) => {
  res.sendFile(path.resolve(VIEWS_HTML_DIR, "estadisticas.html"));
});

router.get("/estadisticas-epp", (req, res) => {
  res.sendFile(path.resolve(VIEWS_HTML_DIR, "estadisticas-epp.html"));
});

module.exports = router;