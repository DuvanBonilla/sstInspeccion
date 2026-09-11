/**
 * Rutas relacionadas con la actualización y sincronización de Excel.
 *
 * @module routes/excel
 */

const { Router } = require("express");

const {
  actualizarExcelSeguimientoSst,
  actualizarExcelSeguimientoEpp,
  sincronizarCierresExcelEpp,
} = require("../controllers/excel.controller");

const {
  autorizarAzureEpp,
} = require("../middlewares/autorizarAzureEpp.middleware");

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