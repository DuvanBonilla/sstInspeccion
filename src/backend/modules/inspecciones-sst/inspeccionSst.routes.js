/**
 * Rutas del módulo de inspecciones SST.
 *
 * Registro de inspecciones, PDF de prueba y consulta de enlaces de
 * aprobación. Conserva los endpoints existentes y la recepción de archivos
 * en memoria.
 *
 * @module modules/inspecciones-sst/routes
 */

const { Router } = require("express");

const { upload } = require("../../shared/middlewares/upload.middleware");

const {
  enviarExtintorOneDrive,
  obtenerLinks,
} = require("./inspeccionSst.controller");

const {
  generarPdfPrueba,
  enviarPdfPruebaCorreo,
} = require("./pdfPrueba.controller");

const router = Router();

router.post(
  "/enviar-onedrive-extintor",
  upload.any(),
  enviarExtintorOneDrive,
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
