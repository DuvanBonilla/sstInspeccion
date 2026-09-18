const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const rutaModulo = path.resolve(
  __dirname,
  "../../../src/views/js/epp/catalogoEpp.templates.js",
);

const codigoModulo = fs.readFileSync(rutaModulo, "utf8");

const moduloPromise = import(
  `data:text/javascript;base64,${Buffer.from(codigoModulo).toString("base64")}`
);

test("crearPanelCatalogoEpp incluye los controles principales", async () => {
  const { crearPanelCatalogoEpp } = await moduloPromise;

  const html = crearPanelCatalogoEpp();

  assert.match(html, /epp-catalogo-panel/);
  assert.match(html, /epp-catalogo-buscador/);
  assert.match(html, /epp-catalogo-resultados/);
  assert.match(
    html,
    /epp-catalogo-agregar-seleccionados/,
  );
});

test("crearMensajeCatalogoSinResultados conserva el mensaje esperado", async () => {
  const {
    crearMensajeCatalogoSinResultados,
  } = await moduloPromise;

  const html = crearMensajeCatalogoSinResultados();

  assert.match(
    html,
    /No se encontraron elementos EPP disponibles\./,
  );
});

test("crearOpcionesCatalogoEpp representa los datos del elemento", async () => {
  const { crearOpcionesCatalogoEpp } = await moduloPromise;

  const html = crearOpcionesCatalogoEpp(
    [
      {
        id: 7,
        nombre: "Casco",
        categoria: "Cabeza",
      },
    ],
    new Set(),
  );

  assert.match(html, /data-elemento-epp-id="7"/);
  assert.match(html, /data-elemento="Casco"/);
  assert.match(html, />\s*Casco\s*</);
  assert.match(html, />\s*Cabeza\s*</);
});

test("crearOpcionesCatalogoEpp marca los elementos seleccionados", async () => {
  const { crearOpcionesCatalogoEpp } = await moduloPromise;

  const html = crearOpcionesCatalogoEpp(
    [
      {
        id: 7,
        nombre: "Casco",
        categoria: "Cabeza",
      },
    ],
    new Set(["7"]),
  );

  assert.match(html, /\schecked\s/);
});

test("crearOpcionesCatalogoEpp usa EPP cuando no existe categoría", async () => {
  const { crearOpcionesCatalogoEpp } = await moduloPromise;

  const html = crearOpcionesCatalogoEpp(
    [
      {
        id: 8,
        nombre: "Guantes",
      },
    ],
    new Set(),
  );

  assert.match(html, />\s*EPP\s*</);
});

test("crearOpcionesCatalogoEpp devuelve vacío para una lista vacía", async () => {
  const { crearOpcionesCatalogoEpp } = await moduloPromise;

  assert.equal(
    crearOpcionesCatalogoEpp([], new Set()),
    "",
  );
});