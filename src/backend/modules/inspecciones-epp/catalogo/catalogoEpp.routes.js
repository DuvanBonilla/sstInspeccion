/**
 * Rutas para consultar los catálogos utilizados por la aplicación.
 *
 * @module modules/inspecciones-epp/catalogo/routes
 */

const { Router } = require("express");

const {
  listarCatalogoEpp,
  listarEppPredeterminados,
} = require("./catalogoEpp.controller");

const router = Router();

router.get(
  "/api/catalogo-epp",
  listarCatalogoEpp,
);

router.get(
  "/api/catalogo-epp/predeterminados",
  listarEppPredeterminados,
);

module.exports = router;