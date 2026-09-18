const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const rutaModulo = path.resolve(
  __dirname,
  "../../../src/views/js/sst/inspeccionSst.id.js",
);

const codigoModulo = fs.readFileSync(rutaModulo, "utf8");

const moduloPromise = import(
  `data:text/javascript;base64,${
    Buffer.from(codigoModulo).toString("base64")
  }`
);

test("generarInspeccionId conserva el formato esperado", async () => {
  const { generarInspeccionId } = await moduloPromise;

  const resultado = generarInspeccionId({
    fechaActual: new Date(2026, 8, 14),
    generarAleatorio() {
      return 0.123456789;
    },
  });

  assert.match(
    resultado,
    /^INSP-20260914-[A-Z0-9]{4}$/,
  );
});

test("generarInspeccionId utiliza la fecha recibida", async () => {
  const { generarInspeccionId } = await moduloPromise;

  const resultado = generarInspeccionId({
    fechaActual: new Date(2025, 0, 7),
    generarAleatorio() {
      return 0.5;
    },
  });

  assert.match(resultado, /^INSP-20250107-/);
});

test("generarInspeccionId genera identificadores diferentes", async () => {
  const { generarInspeccionId } = await moduloPromise;

  const fechaActual = new Date(2026, 8, 14);

  const primero = generarInspeccionId({
    fechaActual,
    generarAleatorio() {
      return 0.123456789;
    },
  });

  const segundo = generarInspeccionId({
    fechaActual,
    generarAleatorio() {
      return 0.987654321;
    },
  });

  assert.notEqual(primero, segundo);
});