/**
 * Router principal de la aplicación.
 *
 * Monta el router de cada módulo para que puedan registrarse desde app.js
 * mediante una sola dependencia. Es el único lugar que conoce todos los
 * módulos.
 *
 * @module routes
 */

const { Router } = require("express");

const paginasRoutes = require("../modules/paginas/paginas.routes");
const inspeccionSstRoutes = require("../modules/inspecciones-sst/inspeccionSst.routes");
const inspeccionEppRoutes = require("../modules/inspecciones-epp/inspeccionEpp.routes");
const aprobacionesRoutes = require("../modules/aprobaciones/aprobaciones.routes");
const estadisticasRoutes = require("../modules/estadisticas/estadisticas.routes");
const excelRoutes = require("../modules/excel/excel.routes");
const catalogoEppRoutes = require("../modules/inspecciones-epp/catalogo/catalogoEpp.routes");

const router = Router();

router.use(paginasRoutes);
router.use(inspeccionSstRoutes);
router.use(inspeccionEppRoutes);
router.use(aprobacionesRoutes);
router.use(estadisticasRoutes);
router.use(excelRoutes);
router.use(catalogoEppRoutes);

module.exports = router;
