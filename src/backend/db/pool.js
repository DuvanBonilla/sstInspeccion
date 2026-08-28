const { Pool } = require("pg");

/* =========================================================
   CONFIGURACIÓN
========================================================= */

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL no está definida en las variables de entorno."
  );
}

const esBaseLocal =
  databaseUrl.includes("localhost") ||
  databaseUrl.includes("127.0.0.1");



const pool = new Pool({
  connectionString: databaseUrl,
  ssl: esBaseLocal
    ? false
    : {
        rejectUnauthorized: false,
      },
});

function query(text, params) {
  return pool.query(text, params);
}

module.exports = {
  pool,
  query,
};