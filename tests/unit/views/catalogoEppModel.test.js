const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const rutaModulo = path.resolve(
  __dirname,
  "../../../src/views/js/epp/catalogoEpp.model.js",
);

const codigoModulo = fs.readFileSync(rutaModulo, "utf8");

const moduloPromise = import(
  `data:text/javascript;base64,${Buffer.from(codigoModulo).toString("base64")}`
);

test("clasificarCatalogoEpp separa predeterminados y adicionales", async () => {
  const { clasificarCatalogoEpp } = await moduloPromise;

  const elementos = [
    {
      id: 1,
      nombre: "Casco",
      predeterminado: true,
    },
    {
      id: 2,
      nombre: "Respirador",
      predeterminado: false,
    },
    {
      id: 3,
      nombre: "Protector auditivo",
    },
  ];

  const resultado = clasificarCatalogoEpp(elementos);

  assert.deepEqual(resultado.todos, elementos);
  assert.deepEqual(resultado.predeterminados, [
    elementos[0],
  ]);
  assert.deepEqual(resultado.otros, [
    elementos[1],
    elementos[2],
  ]);
});

test("clasificarCatalogoEpp no modifica el arreglo recibido", async () => {
  const { clasificarCatalogoEpp } = await moduloPromise;

  const elementos = [
    {
      id: 1,
      predeterminado: true,
    },
  ];

  const resultado = clasificarCatalogoEpp(elementos);

  assert.notStrictEqual(resultado.todos, elementos);
  assert.deepEqual(elementos, [
    {
      id: 1,
      predeterminado: true,
    },
  ]);
});

test("clasificarCatalogoEpp admite un catálogo vacío", async () => {
  const { clasificarCatalogoEpp } = await moduloPromise;

  assert.deepEqual(clasificarCatalogoEpp([]), {
    todos: [],
    predeterminados: [],
    otros: [],
  });
});

test("prepararElementosPredeterminadosEpp adapta los nombres de las propiedades", async () => {
  const {
    prepararElementosPredeterminadosEpp,
  } = await moduloPromise;

  const resultado = prepararElementosPredeterminadosEpp([
    {
      id: 15,
      nombre: "Casco",
      categoria: "Cabeza",
      predeterminado: true,
    },
  ]);

  assert.deepEqual(resultado, [
    {
      elementoEppId: 15,
      elemento: "Casco",
      categoria: "Cabeza",
    },
  ]);
});

test("prepararElementosPredeterminadosEpp admite una lista vacía", async () => {
  const {
    prepararElementosPredeterminadosEpp,
  } = await moduloPromise;

  assert.deepEqual(
    prepararElementosPredeterminadosEpp([]),
    [],
  );
});