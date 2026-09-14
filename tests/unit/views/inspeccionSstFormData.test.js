const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const rutaModulo = path.resolve(
  __dirname,
  "../../../src/views/js/sst/inspeccionSst.formData.js",
);

const codigoModulo = fs.readFileSync(rutaModulo, "utf8");

const moduloPromise = import(
  `data:text/javascript;base64,${
    Buffer.from(codigoModulo).toString("base64")
  }`
);

function crearFormDataFalso() {
  const campos = [];

  return {
    campos,

    append(nombre, valor) {
      campos.push([nombre, valor]);
    },
  };
}

function crearInput(file) {
  return {
    files: file ? [file] : [],
  };
}

function crearCard(archivos = []) {
  return {
    querySelectorAll() {
      return archivos.map(crearInput);
    },
  };
}

test("anexarArchivoOptimizado agrega archivo y fecha de modificación", async () => {
  const { anexarArchivoOptimizado } = await moduloPromise;

  const formData = crearFormDataFalso();

  const original = {
    name: "original.png",
  };

  const optimizado = {
    name: "optimizado.jpg",
    lastModified: 123456,
  };

  await anexarArchivoOptimizado(
    formData,
    "evidencia-0-0",
    original,
    {
      async optimizarImagen(file) {
        assert.strictEqual(file, original);

        return optimizado;
      },
    },
  );

  assert.deepEqual(formData.campos, [
    ["evidencia-0-0", optimizado],
    ["evidencia-0-0-lastmod", 123456],
  ]);
});

test("anexarEvidenciasMultiples omite campos sin archivo", async () => {
  const { anexarEvidenciasMultiples } = await moduloPromise;

  const formData = crearFormDataFalso();

  const archivo = {
    name: "foto.jpg",
    lastModified: 100,
  };

  const card = crearCard([
    null,
    archivo,
  ]);

  await anexarEvidenciasMultiples(
    formData,
    card,
    "evidencia",
    "evidencia",
    2,
    {
      async optimizarImagen(file) {
        return file;
      },
    },
  );

  assert.deepEqual(formData.campos, [
    ["evidencia-2-1", archivo],
    ["evidencia-2-1-lastmod", 100],
  ]);
});

test("construirFormData agrega el payload serializado", async () => {
  const { construirFormDataSst } = await moduloPromise;

  const formData = crearFormDataFalso();

  const inspeccion = {
    inspeccionId: "INSP-20260914-ABCD",
  };

  const resultado = await construirFormDataSst({
    inspeccionId: "INSP-20260914-ABCD",
    construirPayload(id) {
      assert.equal(id, "INSP-20260914-ABCD");

      return inspeccion;
    },
    documento: {
      querySelectorAll() {
        return [];
      },
    },
    async optimizarImagen(file) {
      return file;
    },
    crearFormData() {
      return formData;
    },
  });

  assert.strictEqual(resultado, formData);

  assert.deepEqual(formData.campos, [
    ["payload", JSON.stringify(inspeccion)],
  ]);
});

test("construirFormData agrega el número de inspección", async () => {
  const { construirFormDataSst } = await moduloPromise;

  const formData = crearFormDataFalso();

  await construirFormDataSst({
    inspeccionId: "INSP-20260914-ABCD",
    numInspeccion: 25,
    construirPayload() {
      return {
        inspeccionId: "INSP-20260914-ABCD",
      };
    },
    documento: {
      querySelectorAll() {
        return [];
      },
    },
    async optimizarImagen(file) {
      return file;
    },
    crearFormData() {
      return formData;
    },
  });

  assert.deepEqual(
    JSON.parse(formData.campos[0][1]),
    {
      inspeccionId: "INSP-20260914-ABCD",
      numInspeccion: 25,
    },
  );
});

test("construirFormData conserva los nombres de las evidencias", async () => {
  const { construirFormDataSst } = await moduloPromise;

  const formData = crearFormDataFalso();

  const configuraciones = new Map([
    [
      "[data-extintor-index]",
      [crearCard([{ lastModified: 1 }])],
    ],
    [
      "[data-camilla-index]",
      [crearCard([{ lastModified: 2 }])],
    ],
    [
      "[data-senalizacion-index]",
      [crearCard([{ lastModified: 3 }])],
    ],
    [
      "[data-equipo-tecnologico-index]",
      [crearCard([{ lastModified: 4 }])],
    ],
    [
      "[data-botiquin-index]",
      [crearCard([{ lastModified: 5 }])],
    ],
  ]);

  await construirFormDataSst({
    inspeccionId: "INSP-20260914-ABCD",
    construirPayload() {
      return {};
    },
    documento: {
      querySelectorAll(selector) {
        return configuraciones.get(selector) || [];
      },
    },
    async optimizarImagen(file) {
      return file;
    },
    crearFormData() {
      return formData;
    },
  });

  const nombres = formData.campos.map(([nombre]) => nombre);

  assert.deepEqual(nombres, [
    "payload",
    "evidencia-0-0",
    "evidencia-0-0-lastmod",
    "evidencia-camilla-0-0",
    "evidencia-camilla-0-0-lastmod",
    "evidencia-senalizacion-0-0",
    "evidencia-senalizacion-0-0-lastmod",
    "equipo-tecnologico-evidencia-0-0",
    "equipo-tecnologico-evidencia-0-0-lastmod",
    "botiquin-evidencia-0-0",
    "botiquin-evidencia-0-0-lastmod",
  ]);
});