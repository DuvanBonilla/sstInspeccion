const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const rutaModulo = path.resolve(
  __dirname,
  "../../../src/views/js/epp/catalogoEpp.api.js",
);

const codigoModulo = fs.readFileSync(rutaModulo, "utf8");

const moduloPromise = import(
  `data:text/javascript;base64,${Buffer.from(codigoModulo).toString("base64")}`
);

test("consultarCatalogoEpp devuelve los elementos recibidos", async () => {
  const { consultarCatalogoEpp } = await moduloPromise;

  const elementos = [
    {
      id: 1,
      nombre: "Casco",
      categoria: "Cabeza",
      predeterminado: true,
    },
  ];

  const fetchFn = async (url) => {
    assert.equal(url, "/api/catalogo-epp");

    return {
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        elementos,
      }),
    };
  };

  assert.deepEqual(
    await consultarCatalogoEpp(fetchFn),
    elementos,
  );
});

test("consultarCatalogoEpp informa errores HTTP", async () => {
  const { consultarCatalogoEpp } = await moduloPromise;

  const fetchFn = async () => ({
    ok: false,
    status: 500,
  });

  await assert.rejects(
    consultarCatalogoEpp(fetchFn),
    /Error cargando catálogo EPP\. HTTP 500/,
  );
});

test("consultarCatalogoEpp rechaza una respuesta sin resultado exitoso", async () => {
  const { consultarCatalogoEpp } = await moduloPromise;

  const fetchFn = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      ok: false,
      elementos: [],
    }),
  });

  await assert.rejects(
    consultarCatalogoEpp(fetchFn),
    /Respuesta inválida del catálogo EPP/,
  );
});

test("consultarCatalogoEpp rechaza elementos que no sean un arreglo", async () => {
  const { consultarCatalogoEpp } = await moduloPromise;

  const fetchFn = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      ok: true,
      elementos: null,
    }),
  });

  await assert.rejects(
    consultarCatalogoEpp(fetchFn),
    /Respuesta inválida del catálogo EPP/,
  );
});