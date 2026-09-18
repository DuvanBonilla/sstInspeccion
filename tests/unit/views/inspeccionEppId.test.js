const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const rutaModulo = path.resolve(
  __dirname,
  "../../../src/views/js/epp/inspeccionEpp.id.js",
);

const codigoModulo = fs.readFileSync(
  rutaModulo,
  "utf8",
);

const moduloPromise = import(
  `data:text/javascript;base64,${Buffer.from(codigoModulo).toString("base64")}`,
);

test("generarInspeccionId conserva el formato actual", async () => {
  const { generarInspeccionId } =
    await moduloPromise;

  const resultado =
    generarInspeccionId({
      fecha: new Date(2026, 8, 14),

      aleatorio() {
        return {
          toString(base) {
            assert.equal(base, 36);

            return "0.abcd999";
          },
        };
      },
    });

  assert.equal(
    resultado,
    "INSP-20260914-ABCD",
  );
});

test("generarInspeccionId completa mes y día con ceros", async () => {
  const { generarInspeccionId } =
    await moduloPromise;

  const resultado =
    generarInspeccionId({
      fecha: new Date(2026, 0, 5),

      aleatorio() {
        return {
          toString() {
            return "0.xyzw999";
          },
        };
      },
    });

  assert.equal(
    resultado,
    "INSP-20260105-XYZW",
  );
});

test("generarInspeccionId utiliza cuatro caracteres en mayúsculas", async () => {
  const { generarInspeccionId } =
    await moduloPromise;

  const resultado =
    generarInspeccionId({
      fecha: new Date(2026, 11, 31),

      aleatorio() {
        return {
          toString() {
            return "0.a1b2c3d4";
          },
        };
      },
    });

  assert.equal(
    resultado,
    "INSP-20261231-A1B2",
  );
});