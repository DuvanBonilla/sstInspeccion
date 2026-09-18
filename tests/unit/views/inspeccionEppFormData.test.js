const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const rutaModulo = path.resolve(
  __dirname,
  "../../../src/views/js/epp/inspeccionEpp.formData.js",
);

const codigoModulo = fs.readFileSync(rutaModulo, "utf8");

const moduloPromise = import(
  `data:text/javascript;base64,${Buffer.from(codigoModulo).toString("base64")}`,
);

function crearFormDataSimulado() {
  const campos = [];

  return {
    campos,

    append(...argumentos) {
      campos.push(argumentos);
    },
  };
}

test("construirFormDataEpp incorpora el payload serializado", async () => {
  const { construirFormDataEpp } = await moduloPromise;

  const inspeccion = {
    tipoInspeccion: "EPP",
    inspeccionId: "EPP-123",
    trabajadores: [],
  };

  const formData = crearFormDataSimulado();

  const resultado = construirFormDataEpp({
    inspeccion,
    evidencias: [],
    crearFormData: () => formData,
  });

  assert.strictEqual(resultado, formData);

  assert.deepEqual(formData.campos, [
    ["payload", JSON.stringify(inspeccion)],
  ]);
});

test("construirFormDataEpp incorpora evidencias y fecha de modificación", async () => {
  const { construirFormDataEpp } = await moduloPromise;

  const archivo = {
    name: "trabajador.jpg",
    lastModified: 1789344000000,
  };

  const formData = crearFormDataSimulado();

  construirFormDataEpp({
    inspeccion: {
      tipoInspeccion: "EPP",
    },
    evidencias: [
      {
        indice: 2,
        archivo,
      },
    ],
    crearFormData: () => formData,
  });

  assert.deepEqual(formData.campos, [
    [
      "payload",
      JSON.stringify({
        tipoInspeccion: "EPP",
      }),
    ],
    [
      "evidencia_trabajador_2",
      archivo,
      "trabajador.jpg",
    ],
    [
      "evidencia_trabajador_2_lastmod",
      "1789344000000",
    ],
  ]);
});

test("construirFormDataEpp omite evidencias sin archivo", async () => {
  const { construirFormDataEpp } = await moduloPromise;

  const formData = crearFormDataSimulado();

  construirFormDataEpp({
    inspeccion: {},
    evidencias: [
      {
        indice: 0,
        archivo: null,
      },
    ],
    crearFormData: () => formData,
  });

  assert.deepEqual(formData.campos, [
    ["payload", "{}"],
  ]);
});

test("construirFormDataEpp conserva lastModified vacío", async () => {
  const { construirFormDataEpp } = await moduloPromise;

  const archivo = {
    name: "evidencia.png",
    lastModified: 0,
  };

  const formData = crearFormDataSimulado();

  construirFormDataEpp({
    inspeccion: {},
    evidencias: [
      {
        indice: 0,
        archivo,
      },
    ],
    crearFormData: () => formData,
  });

  assert.deepEqual(
    formData.campos.at(-1),
    ["evidencia_trabajador_0_lastmod", ""],
  );
});