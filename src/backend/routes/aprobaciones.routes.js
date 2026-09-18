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
  reiniciarAprobaciones,
  solicitarCodigoReinicioAprobaciones,
  confirmarReinicioAprobaciones,
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

router.post(
  "/api/inspecciones/:id/reiniciar-aprobaciones",
  reiniciarAprobaciones,
);

router.post(
  "/api/inspecciones/:id/reinicio-aprobaciones/solicitar-codigo",
  solicitarCodigoReinicioAprobaciones,
);

router.post(
  "/api/inspecciones/:id/reinicio-aprobaciones/confirmar",
  confirmarReinicioAprobaciones,
);

module.exports = router;