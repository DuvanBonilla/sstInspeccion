/**
 * Rutas relacionadas con la actualización y sincronización de Excel.
 *
 * @module modules/excel/routes
 */

const { Router } = require("express");

const {
  actualizarExcelSeguimientoSst,
  actualizarExcelSeguimientoEpp,
  sincronizarCierresExcelEpp,
} = require("./excel.controller");

const {
  autorizarAzureEpp,
} = require("../../shared/middlewares/autorizarAzureEpp.middleware");

const router = Router();

router.post(
  "/api/excel/epp/actualizar-onedrive",
  actualizarExcelSeguimientoEpp,
);

router.post(
  "/api/excel/sst/actualizar-onedrive",
  actualizarExcelSeguimientoSst,
);

router.post(
  "/api/excel/epp/sincronizar-cierres",
  autorizarAzureEpp,
  sincronizarCierresExcelEpp,
);

module.exports = router;