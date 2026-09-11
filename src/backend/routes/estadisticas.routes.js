/**
 * Rutas para consultar estadísticas de inspecciones SST y EPP.
 *
 * @module routes/estadisticas
 */

const { Router } = require("express");

const {
  obtenerResumen,
  listarInspecciones,
  obtenerResumenEpp,
  listarInspeccionesEpp,
} = require("../controllers/estadisticas.controller");

const router = Router();

router.get(
  "/api/estadisticas/resumen",
  obtenerResumen,
);

router.get(
  "/api/estadisticas/inspecciones",
  listarInspecciones,
);

router.get(
  "/api/estadisticas-epp/resumen",
  obtenerResumenEpp,
);

router.get(
  "/api/estadisticas-epp/inspecciones",
  listarInspeccionesEpp,
);

module.exports = router;