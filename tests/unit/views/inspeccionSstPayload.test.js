const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const rutaModulo = path.resolve(
  __dirname,
  "../../../src/views/js/sst/inspeccionSst.payload.js",
);

const codigoModulo = fs.readFileSync(rutaModulo, "utf8");

const moduloPromise = import(
  `data:text/javascript;base64,${
    Buffer.from(codigoModulo).toString("base64")
  }`
);

function crearDependencias({
  inspeccionId = "INSP-20260914-ABCD",
  seccionesOmitidas = {},
} = {}) {
  const valores = {
    fecha: "2026-09-14",
    sedeOperacion: "Urabá",
    areaTrabajo: "Operaciones",
    jefeResponsable: "Ana Pérez",
    cargoJefe: "Jefe de área",
    responsableInspeccion: "Carlos Gómez",
    cargoResponsable: "Inspector SST",
    observacionesEquipos: "Sin observaciones",
  };

  return {
    inspeccionId,

    generarInspeccionId() {
      return "INSP-GENERADO";
    },

    obtenerValor(id) {
      return valores[id] || "";
    },

    seccionesOmitidas,

    leerExtintores() {
      return [{ id: "extintor-1" }];
    },

    leerCamillas() {
      return [{ id: "camilla-1" }];
    },

    leerSenalizaciones() {
      return [{ id: "senalizacion-1" }];
    },

    leerEquiposTecnologicos() {
      return [{ id: "equipo-1" }];
    },

    leerBotiquines() {
      return [{ id: "botiquin-1" }];
    },
  };
}

test("construirInspeccionSst conserva la información general", async () => {
  const { construirInspeccionSst } = await moduloPromise;

  const inspeccion = construirInspeccionSst(
    crearDependencias(),
  );

  assert.equal(inspeccion.inspeccionId, "INSP-20260914-ABCD");
  assert.equal(inspeccion.fecha, "2026-09-14");
  assert.equal(inspeccion.sedeOperacion, "Urabá");
  assert.equal(inspeccion.areaTrabajo, "Operaciones");
  assert.equal(inspeccion.jefeResponsable, "Ana Pérez");
  assert.equal(inspeccion.cargoJefe, "Jefe de área");
  assert.equal(inspeccion.responsableInspeccion, "Carlos Gómez");
  assert.equal(inspeccion.cargoResponsable, "Inspector SST");
  assert.equal(
    inspeccion.observacionesEquipos,
    "Sin observaciones",
  );
});

test("construirInspeccionSst conserva las secciones y sus alias", async () => {
  const { construirInspeccionSst } = await moduloPromise;

  const inspeccion = construirInspeccionSst(
    crearDependencias(),
  );

  assert.deepEqual(inspeccion.extintores, [
    { id: "extintor-1" },
  ]);
  assert.strictEqual(
    inspeccion.extintor,
    inspeccion.extintores[0],
  );

  assert.deepEqual(inspeccion.camillas, [
    { id: "camilla-1" },
  ]);
  assert.strictEqual(
    inspeccion.camilla,
    inspeccion.camillas[0],
  );

  assert.deepEqual(inspeccion.senalizaciones, [
    { id: "senalizacion-1" },
  ]);
  assert.strictEqual(
    inspeccion.senalizacion,
    inspeccion.senalizaciones[0],
  );

  assert.deepEqual(inspeccion.equiposTecnologicos, [
    { id: "equipo-1" },
  ]);
  assert.strictEqual(
    inspeccion.equipoTecnologico,
    inspeccion.equiposTecnologicos[0],
  );

  assert.deepEqual(inspeccion.botiquines, [
    { id: "botiquin-1" },
  ]);
  assert.strictEqual(
    inspeccion.botiquin,
    inspeccion.botiquines[0],
  );
});

test("construirInspeccionSst vacía las secciones omitidas", async () => {
  const { construirInspeccionSst } = await moduloPromise;

  const inspeccion = construirInspeccionSst(
    crearDependencias({
      seccionesOmitidas: {
        extintores: true,
        camillas: true,
        senalizaciones: true,
        equiposTecnologicos: true,
        botiquines: true,
      },
    }),
  );

  assert.deepEqual(inspeccion.extintores, []);
  assert.equal(inspeccion.extintor, null);

  assert.deepEqual(inspeccion.camillas, []);
  assert.equal(inspeccion.camilla, null);

  assert.deepEqual(inspeccion.senalizaciones, []);
  assert.equal(inspeccion.senalizacion, null);

  assert.deepEqual(inspeccion.equiposTecnologicos, []);
  assert.equal(inspeccion.equipoTecnologico, null);

  assert.deepEqual(inspeccion.botiquines, []);
  assert.equal(inspeccion.botiquin, null);
});

test("construirInspeccionSst genera el identificador cuando no se recibe", async () => {
  const { construirInspeccionSst } = await moduloPromise;

  const inspeccion = construirInspeccionSst(
    crearDependencias({
      inspeccionId: null,
    }),
  );

  assert.equal(inspeccion.inspeccionId, "INSP-GENERADO");
});