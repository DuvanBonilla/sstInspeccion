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

/**
 * Ejecuta una consulta utilizando el pool compartido de PostgreSQL.
 *
 * Esta función permite que los modelos realicen consultas sin acceder
 * directamente a la instancia del pool. Los parámetros se envían por separado
 * para utilizarlos en consultas parametrizadas.
 *
 * @param {string} text Consulta SQL que será ejecutada.
 * @param {Array<*>} [params] Valores asociados a los parámetros de la consulta.
 * @returns {Promise<Object>} Resultado devuelto por PostgreSQL.
 * @throws {Error} Si falla la conexión o la ejecución de la consulta.
 */

function query(text, params) {
  return pool.query(text, params);
}

module.exports = {
  pool,
  query,
};