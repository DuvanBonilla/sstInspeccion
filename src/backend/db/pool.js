/*
  pool.js — Conexión a PostgreSQL / Neon.

  Qué hace:
  - Crea un Pool de pg usando DATABASE_URL.
  - Detecta si la conexión apunta a PostgreSQL local.
  - Desactiva SSL para localhost / 127.0.0.1.
  - Mantiene SSL habilitado para Neon y bases remotas.
  - Expone query() como helper para todo el proyecto.

  Cómo interactúa:
  - Es usado por inspeccion.model.js.
  - Es usado por aprobaciones.model.js.
  - Es usado por inspeccionEpp.model.js.
  - Requiere DATABASE_URL en .env local o en las
    variables de entorno del servidor.
*/

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


/* =========================================================
   DETECTAR TIPO DE CONEXIÓN
========================================================= */

const esBaseLocal =
  databaseUrl.includes("localhost") ||
  databaseUrl.includes("127.0.0.1");


/* =========================================================
   LOG TEMPORAL DE DIAGNÓSTICO

   IMPORTANTE:
   No imprimimos DATABASE_URL porque contiene credenciales.
========================================================= */

console.log("==========================================");
console.log("🔎 CONFIGURACIÓN POSTGRES");
console.log("==========================================");

console.log(
  "DATABASE_URL definida:",
  Boolean(databaseUrl)
);

console.log(
  "Host detectado:",
  databaseUrl.includes("localhost")
    ? "localhost"
    : databaseUrl.includes("127.0.0.1")
      ? "127.0.0.1"
      : "remoto"
);

console.log(
  "Base local:",
  esBaseLocal
);

console.log(
  "SSL:",
  esBaseLocal
    ? "DESACTIVADO"
    : "ACTIVADO"
);

console.log("==========================================");


/* =========================================================
   POOL POSTGRESQL
========================================================= */

const pool = new Pool({
  connectionString: databaseUrl,

  /*
    PostgreSQL local:
      SSL desactivado.

    Neon / remoto:
      SSL habilitado.
  */
  ssl: esBaseLocal
    ? false
    : {
        rejectUnauthorized: false,
      },
});


/* =========================================================
   HELPER QUERY
========================================================= */

function query(text, params) {
  return pool.query(text, params);
}


/* =========================================================
   EXPORTACIONES
========================================================= */

module.exports = {
  pool,
  query,
};