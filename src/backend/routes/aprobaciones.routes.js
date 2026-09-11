/**
 * Rutas correspondientes al flujo de aprobación de inspecciones.
 *
 * @module routes/aprobaciones
 */

const { Router } = require("express");

const {
  obtenerResumenAprobacion,
  registrarAprobacion,
  previsualizarAprobacion,
} = require("../controllers/aprobaciones.controller");

const router = Router();

router.get(
  "/api/aprobaciones/:token",
  obtenerResumenAprobacion,
);

router.get(
  "/api/aprobaciones/:token/preview",
  previsualizarAprobacion,
);

router.post(
  "/api/aprobaciones/:token",
  registrarAprobacion,
);

module.exports = router;