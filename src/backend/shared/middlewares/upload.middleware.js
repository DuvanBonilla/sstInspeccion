// Ruta: src/backend/shared/middlewares/upload.middleware.js
/**
 * Middleware de recepción de archivos.
 *
 * Configura Multer con almacenamiento en memoria para que los controladores
 * reciban las evidencias en `req.files` como buffers.
 *
 * @module middlewares/upload
 */

const multer = require("multer");

const upload = multer({
  storage: multer.memoryStorage(),
});

module.exports = {
  upload,
};
