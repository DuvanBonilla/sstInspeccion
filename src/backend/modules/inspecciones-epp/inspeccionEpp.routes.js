/**
 * Rutas del módulo de inspecciones EPP.
 *
 * Conserva el endpoint existente y la recepción de archivos en memoria.
 *
 * @module modules/inspecciones-epp/routes
 */

const { Router } = require("express");

const { upload } = require("../../shared/middlewares/upload.middleware");

const {
  enviarInspeccionEpp,
} = require("./inspeccionEpp.controller");

const router = Router();

router.post(
  "/enviar-inspeccion-epp",
  upload.any(),
  enviarInspeccionEpp,
);

module.exports = router;
