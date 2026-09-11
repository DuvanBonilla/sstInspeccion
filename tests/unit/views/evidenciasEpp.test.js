const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const rutaModulo = path.resolve(
  __dirname,
  "../../../src/views/js/epp/evidenciasEpp.js",
);

const codigoModulo = fs.readFileSync(rutaModulo, "utf8");

const moduloPromise = import(
  `data:text/javascript;base64,${Buffer.from(codigoModulo).toString("base64")}`
);

test("validarEvidenciaEpp rechaza una evidencia ausente", async () => {
  const { validarEvidenciaEpp } = await moduloPromise;

  assert.deepEqual(validarEvidenciaEpp(null), {
    valido: false,
    codigo: "AUSENTE",
    mensaje: null,
  });
});

test("validarEvidenciaEpp acepta JPEG, PNG y WebP", async () => {
  const { validarEvidenciaEpp } = await moduloPromise;

  for (const type of [
    "image/jpeg",
    "image/png",
    "image/webp",
  ]) {
    assert.deepEqual(
      validarEvidenciaEpp({
        type,
        size: 1024,
      }),
      {
        valido: true,
        codigo: null,
        mensaje: null,
      },
    );
  }
});

test("validarEvidenciaEpp rechaza tipos no permitidos", async () => {
  const { validarEvidenciaEpp } = await moduloPromise;

  const resultado = validarEvidenciaEpp({
    type: "application/pdf",
    size: 1024,
  });

  assert.equal(resultado.valido, false);
  assert.equal(resultado.codigo, "TIPO_NO_PERMITIDO");
  assert.ok(resultado.mensaje);
});

test("validarEvidenciaEpp acepta exactamente 10 MB", async () => {
  const {
    MAX_TAMANO_EVIDENCIA_BYTES,
    validarEvidenciaEpp,
  } = await moduloPromise;

  const resultado = validarEvidenciaEpp({
    type: "image/jpeg",
    size: MAX_TAMANO_EVIDENCIA_BYTES,
  });

  assert.equal(resultado.valido, true);
});

test("validarEvidenciaEpp rechaza archivos mayores de 10 MB", async () => {
  const {
    MAX_TAMANO_EVIDENCIA_BYTES,
    validarEvidenciaEpp,
  } = await moduloPromise;

  const resultado = validarEvidenciaEpp({
    type: "image/jpeg",
    size: MAX_TAMANO_EVIDENCIA_BYTES + 1,
  });

  assert.equal(resultado.valido, false);
  assert.equal(resultado.codigo, "TAMANO_EXCEDIDO");
  assert.ok(resultado.mensaje);
});

test("validarEvidenciaEpp conserva el comportamiento cuando size no existe", async () => {
  const { validarEvidenciaEpp } = await moduloPromise;

  const resultado = validarEvidenciaEpp({
    type: "image/png",
  });

  assert.equal(resultado.valido, true);
});

test("formatearPesoArchivo expresa tamaños menores de 1 MB en KB", async () => {
  const { formatearPesoArchivo } = await moduloPromise;

  assert.equal(
    formatearPesoArchivo(512 * 1024),
    "512 KB",
  );
});

test("formatearPesoArchivo expresa tamaños desde 1 MB en MB", async () => {
  const { formatearPesoArchivo } = await moduloPromise;

  assert.equal(
    formatearPesoArchivo(1.5 * 1024 * 1024),
    "1.50 MB",
  );
});

test("formatearPesoArchivo devuelve vacío para valores no finitos", async () => {
  const { formatearPesoArchivo } = await moduloPromise;

  assert.equal(formatearPesoArchivo(Number.NaN), "");
  assert.equal(formatearPesoArchivo(Infinity), "");
});