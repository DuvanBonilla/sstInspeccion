// Ruta: src/backend/modules/paginas/paginas.routes.js
/**
 * Rutas encargadas de servir las páginas HTML de la aplicación.
 *
 * Este archivo solo asocia cada URL con su controlador; no contiene
 * lógica de negocio ni acceso a datos.
 *
 * @module modules/paginas/routes
 */

const { Router } = require("express");

const {
  mostrarInicio,
  mostrarInspeccionSst,
  mostrarInspeccionEpp,
  mostrarAprobar,
  mostrarEstadisticas,
  mostrarEstadisticasEpp,
} = require("./paginas.controller");

const router = Router();

router.get("/", mostrarInicio);

router.get("/inspeccion-sst", mostrarInspeccionSst);

router.get("/inspeccion-epp", mostrarInspeccionEpp);

router.get("/aprobar/:token", mostrarAprobar);

router.get("/estadisticas", mostrarEstadisticas);

router.get("/estadisticas-epp", mostrarEstadisticasEpp);

module.exports = router;
