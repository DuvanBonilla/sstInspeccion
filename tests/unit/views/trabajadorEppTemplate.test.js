const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const rutaModulo = path.resolve(
  __dirname,
  "../../../src/views/js/epp/trabajadorEpp.template.js",
);

const codigoModulo = fs.readFileSync(rutaModulo, "utf8");

const moduloPromise = import(
  `data:text/javascript;base64,${Buffer.from(codigoModulo).toString("base64")}`
);

test("crearContenidoTrabajador incluye los datos generales del trabajador", async () => {
  const { crearContenidoTrabajador } = await moduloPromise;

  const html = crearContenidoTrabajador();

  assert.match(html, /data-role="nombre"/);
  assert.match(html, /data-role="codigo"/);
  assert.match(html, /data-role="cargo"/);
  assert.match(html, /data-role="nombreResumen"/);
});

test("crearContenidoTrabajador conserva los controles de la tarjeta", async () => {
  const { crearContenidoTrabajador } = await moduloPromise;

  const html = crearContenidoTrabajador();

  assert.match(html, /data-action="toggle-trabajador"/);
  assert.match(html, /data-action="eliminar-trabajador"/);
  assert.match(html, /data-role="toggleIcon"/);
});

test("crearContenidoTrabajador incorpora las filas EPP recibidas", async () => {
  const { crearContenidoTrabajador } = await moduloPromise;

  const html = crearContenidoTrabajador({
    filasEppHtml:
      '<tr data-prueba="fila-epp"><td>Casco</td></tr>',
  });

  assert.match(html, /data-prueba="fila-epp"/);
  assert.match(html, />Casco</);
});

test("crearContenidoTrabajador incorpora el panel del catálogo", async () => {
  const { crearContenidoTrabajador } = await moduloPromise;

  const html = crearContenidoTrabajador({
    panelCatalogoHtml:
      '<div data-prueba="panel-catalogo"></div>',
  });

  assert.match(html, /data-prueba="panel-catalogo"/);
});

test("crearContenidoTrabajador conserva observaciones y evidencia", async () => {
  const { crearContenidoTrabajador } = await moduloPromise;

  const html = crearContenidoTrabajador();

  assert.match(html, /data-role="observaciones"/);
  assert.match(html, /data-role="evidencia"/);
  assert.match(html, /data-role="evidenciaEstado"/);
  assert.match(html, /accept="image\/jpeg,image\/png,image\/webp"/);
});

test("crearContenidoTrabajador admite contenido inyectado vacío", async () => {
  const { crearContenidoTrabajador } = await moduloPromise;

  const html = crearContenidoTrabajador();

  assert.equal(typeof html, "string");
  assert.match(html, /class="trabajador-card-header"/);
  assert.match(html, /class="trabajador-card-body"/);
});