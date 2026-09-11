/**
 * Router principal de la aplicación.
 *
 * Reúne los routers de cada dominio para que puedan registrarse
 * desde app.js mediante una sola dependencia.
 *
 * @module routes
 */

const { Router } = require("express");

const paginasRoutes = require("./paginas.routes");
const inspeccionesRoutes = require("./inspecciones.routes");
const aprobacionesRoutes = require("./aprobaciones.routes");
const estadisticasRoutes = require("./estadisticas.routes");
const excelRoutes = require("./excel.routes");
const catalogosRoutes = require("./catalogos.routes");

const router = Router();

router.use(paginasRoutes);
router.use(inspeccionesRoutes);
router.use(aprobacionesRoutes);
router.use(estadisticasRoutes);
router.use(excelRoutes);
router.use(catalogosRoutes);

module.exports = router;