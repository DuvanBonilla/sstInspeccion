/**
 * Configuración principal de la aplicación Express.
 *
 * Crea la aplicación, configura los middlewares generales,
 * expone los archivos estáticos y registra las rutas.
 *
 * Este módulo no inicia el servidor HTTP.
 *
 * @module app
 */

const path = require("node:path");
const express = require("express");

const routes = require("./routes");

const app = express();

const VIEWS_DIR = path.resolve(
  __dirname,
  "..",
  "views",
);

const FLATPICKR_DIR = path.resolve(
  __dirname,
  "..",
  "..",
  "node_modules",
  "flatpickr",
  "dist",
);

app.set("trust proxy", true);

app.use(express.static(VIEWS_DIR));

app.use(
  "/flatpickr",
  express.static(FLATPICKR_DIR),
);

app.use(
  express.json({
    limit: "2mb",
  }),
);

app.use(
  express.urlencoded({
    extended: true,
  }),
);

app.use(routes);

module.exports = app;