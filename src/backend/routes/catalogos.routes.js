/**
 * Rutas para consultar los catálogos utilizados por la aplicación.
 *
 * @module routes/catalogos
 */

const { Router } = require("express");

const {
  listarCatalogoEpp,
  listarEppPredeterminados,
} = require("../controllers/catalogoEpp.controller");

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