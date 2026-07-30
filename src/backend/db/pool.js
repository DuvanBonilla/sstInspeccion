/*
  pool.js — Conexión a Neon (Postgres).

  Qué hace:
  - Crea un Pool de pg usando DATABASE_URL.
  - Expone query() como helper único para todo el proyecto.

  Cómo interactúa:
  - Es usado por inspeccion.model.js y aprobaciones.model.js para leer/escribir
    en la tabla `inspecciones`.
  - Requiere DATABASE_URL en .env (local) o en las variables de entorno de Render.
*/
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

function query(text, params) {
  return pool.query(text, params);
}

module.exports = { pool, query };
