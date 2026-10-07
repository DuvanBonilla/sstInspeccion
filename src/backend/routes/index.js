/**
 * Router principal de la aplicación.
 *
 * Reúne los routers de cada dominio para que puedan registrarse
 * desde app.js mediante una sola dependencia.
 *
 * @module routes
 */

const { Router } = require("express");

const paginasRoutes = require("../modules/paginas/paginas.routes");
const inspeccionesRoutes = require("./inspecciones.routes");
const aprobacionesRoutes = require("../modules/aprobaciones/aprobaciones.routes");
const estadisticasRoutes = require("../modules/estadisticas/estadisticas.routes");
const excelRoutes = require("./excel.routes");
const catalogosRoutes = require("../modules/inspecciones-epp/catalogo/catalogoEpp.routes");

const router = Router();

router.use(paginasRoutes);
router.use(inspeccionesRoutes);
router.use(aprobacionesRoutes);
router.use(estadisticasRoutes);
router.use(excelRoutes);
router.use(catalogosRoutes);

module.exports = router;