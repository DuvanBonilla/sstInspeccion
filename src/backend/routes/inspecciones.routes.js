// Ruta: src/backend/routes/inspecciones.routes.js
/**
 * Rutas relacionadas con el registro y consulta de inspecciones.
 *
 * Conserva los endpoints existentes y la recepción de archivos en memoria.
 *
 * @module routes/inspecciones
 */

const { Router } = require("express");

const { upload } = require("../shared/middlewares/upload.middleware");

const {
  enviarExtintorOneDrive,
  obtenerLinks,
} = require("../controllers/inspeccion.controller");

const {
  enviarInspeccionEpp,
} = require("../controllers/inspeccionEpp.controller");

const {
  generarPdfPrueba,
  enviarPdfPruebaCorreo,
} = require("../controllers/pdfInspeccion.controller");

const router = Router();

router.post(
  "/enviar-onedrive-extintor",
  upload.any(),
  enviarExtintorOneDrive,
);

router.post(
  "/enviar-inspeccion-epp",
  upload.any(),
  enviarInspeccionEpp,
);

router.post(
  "/pdf-prueba",
  upload.any(),
  generarPdfPrueba,
);

router.post(
  "/enviar-pdf-prueba-correo",
  upload.any(),
  enviarPdfPruebaCorreo,
);

router.get(
  "/api/inspecciones/:id/links",
  obtenerLinks,
);

module.exports = router;
