/**
 * Pruebas de integración de las páginas HTML.
 *
 * Se monta únicamente el router de páginas para evitar cargar controladores,
 * servicios o conexiones de base de datos.
 */

const {
  test,
  before,
  after,
} = require("node:test");

const assert = require("node:assert/strict");
const express = require("express");

const paginasRoutes = require(
  "../../../src/backend/routes/paginas.routes"
);

let server;
let baseUrl;

before(async () => {
  const app = express();

  app.use(paginasRoutes);

  await new Promise((resolve, reject) => {
    server = app.listen(0, "127.0.0.1", () => {
      const address = server.address();

      baseUrl = `http://127.0.0.1:${address.port}`;
      resolve();
    });

    server.once("error", reject);
  });
});

after(async () => {
  if (!server) return;

  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
});

const paginas = [
  {
    ruta: "/",
    nombre: "página principal",
  },
  {
    ruta: "/inspeccion-sst",
    nombre: "página de inspección SST",
  },
  {
    ruta: "/inspeccion-epp",
    nombre: "página de inspección EPP",
  },
  {
    ruta: "/aprobar/token-prueba",
    nombre: "página de aprobación",
  },
  {
    ruta: "/estadisticas",
    nombre: "página de estadísticas SST",
  },
  {
    ruta: "/estadisticas-epp",
    nombre: "página de estadísticas EPP",
  },
];

for (const pagina of paginas) {
  test(`${pagina.nombre} responde HTML con estado 200`, async () => {
    const response = await fetch(`${baseUrl}${pagina.ruta}`);
    const contenido = await response.text();

    assert.equal(response.status, 200);

    assert.match(
      response.headers.get("content-type") || "",
      /^text\/html\b/,
    );

    assert.ok(
      contenido.trim().length > 0,
      `${pagina.ruta} no debe devolver contenido vacío`,
    );
  });
}