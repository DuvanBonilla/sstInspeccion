const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const rutaModulo = path.resolve(
  __dirname,
  "../../../src/views/js/epp/catalogoEpp.search.js",
);

const codigoModulo = fs.readFileSync(rutaModulo, "utf8");

const moduloPromise = import(
  `data:text/javascript;base64,${Buffer.from(codigoModulo).toString("base64")}`
);

test("normalizarTextoBusqueda elimina espacios, mayúsculas y tildes", async () => {
  const { normalizarTextoBusqueda } = await moduloPromise;

  assert.equal(
    normalizarTextoBusqueda("  PROTECCIÓN ÁUDITIVA  "),
    "proteccion auditiva",
  );
});

test("normalizarTextoBusqueda devuelve vacío para valores ausentes", async () => {
  const { normalizarTextoBusqueda } = await moduloPromise;

  assert.equal(normalizarTextoBusqueda(), "");
  assert.equal(normalizarTextoBusqueda(null), "");
});

test("filtrarCatalogoEpp devuelve disponibles cuando la búsqueda está vacía", async () => {
  const { filtrarCatalogoEpp } = await moduloPromise;

  const elementos = [
    { id: 1, nombre: "Casco" },
    { id: 2, nombre: "Guantes" },
    { id: 3, nombre: "Gafas" },
  ];

  const resultado = filtrarCatalogoEpp({
    elementos,
    idsActuales: new Set(["2"]),
  });

  assert.deepEqual(resultado, [
    elementos[0],
    elementos[2],
  ]);
});

test("filtrarCatalogoEpp busca sin distinguir mayúsculas ni tildes", async () => {
  const { filtrarCatalogoEpp } = await moduloPromise;

  const elementos = [
    { id: 1, nombre: "Protección auditiva" },
    { id: 2, nombre: "Casco" },
  ];

  const resultado = filtrarCatalogoEpp({
    elementos,
    idsActuales: new Set(),
    terminoBusqueda: "PROTECCION",
  });

  assert.deepEqual(resultado, [
    elementos[0],
  ]);
});

test("filtrarCatalogoEpp excluye coincidencias ya agregadas", async () => {
  const { filtrarCatalogoEpp } = await moduloPromise;

  const elementos = [
    { id: 1, nombre: "Casco de seguridad" },
    { id: 2, nombre: "Casco dieléctrico" },
  ];

  const resultado = filtrarCatalogoEpp({
    elementos,
    idsActuales: new Set(["1"]),
    terminoBusqueda: "casco",
  });

  assert.deepEqual(resultado, [
    elementos[1],
  ]);
});

test("filtrarCatalogoEpp devuelve vacío cuando no hay coincidencias", async () => {
  const { filtrarCatalogoEpp } = await moduloPromise;

  const resultado = filtrarCatalogoEpp({
    elementos: [
      { id: 1, nombre: "Casco" },
    ],
    idsActuales: new Set(),
    terminoBusqueda: "guantes",
  });

  assert.deepEqual(resultado, []);
});