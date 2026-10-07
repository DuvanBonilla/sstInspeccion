// Ruta: src/backend/modules/paginas/paginas.controller.js
/**
 * Controlador encargado de servir las páginas HTML de la aplicación.
 *
 * Este archivo no contiene lógica de negocio ni acceso a datos.
 *
 * @module modules/paginas/controller
 */

const path = require("node:path");

const VIEWS_HTML_DIR = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "views",
  "html",
);

/**
 * Sirve la página principal.
 *
 * Corresponde al endpoint GET /.
 *
 * @param {Object} req Solicitud HTTP de Express.
 * @param {Object} res Respuesta HTTP de Express.
 */
function mostrarInicio(req, res) {
  res.sendFile(path.resolve(VIEWS_HTML_DIR, "index.html"));
}

/**
 * Sirve la página de inspección SST.
 *
 * Corresponde al endpoint GET /inspeccion-sst.
 *
 * @param {Object} req Solicitud HTTP de Express.
 * @param {Object} res Respuesta HTTP de Express.
 */
function mostrarInspeccionSst(req, res) {
  res.sendFile(path.resolve(VIEWS_HTML_DIR, "inspeccion-sst.html"));
}

/**
 * Sirve la página de inspección EPP.
 *
 * Corresponde al endpoint GET /inspeccion-epp.
 *
 * @param {Object} req Solicitud HTTP de Express.
 * @param {Object} res Respuesta HTTP de Express.
 */
function mostrarInspeccionEpp(req, res) {
  res.sendFile(path.resolve(VIEWS_HTML_DIR, "inspeccion-epp.html"));
}

/**
 * Sirve la página de aprobación.
 *
 * Corresponde al endpoint GET /aprobar/:token.
 *
 * @param {Object} req Solicitud HTTP de Express.
 * @param {Object} res Respuesta HTTP de Express.
 */
function mostrarAprobar(req, res) {
  res.sendFile(path.resolve(VIEWS_HTML_DIR, "aprobar.html"));
}

/**
 * Sirve la página de estadísticas SST.
 *
 * Corresponde al endpoint GET /estadisticas.
 *
 * @param {Object} req Solicitud HTTP de Express.
 * @param {Object} res Respuesta HTTP de Express.
 */
function mostrarEstadisticas(req, res) {
  res.sendFile(path.resolve(VIEWS_HTML_DIR, "estadisticas.html"));
}

/**
 * Sirve la página de estadísticas EPP.
 *
 * Corresponde al endpoint GET /estadisticas-epp.
 *
 * @param {Object} req Solicitud HTTP de Express.
 * @param {Object} res Respuesta HTTP de Express.
 */
function mostrarEstadisticasEpp(req, res) {
  res.sendFile(path.resolve(VIEWS_HTML_DIR, "estadisticas-epp.html"));
}

module.exports = {
  mostrarInicio,
  mostrarInspeccionSst,
  mostrarInspeccionEpp,
  mostrarAprobar,
  mostrarEstadisticas,
  mostrarEstadisticasEpp,
};
