const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const rutaModulo = path.resolve(
  __dirname,
  "../../../src/views/js/epp/inspeccionEpp.payload.js",
);

const codigoModulo = fs.readFileSync(rutaModulo, "utf8");

const moduloPromise = import(
  `data:text/javascript;base64,${Buffer.from(codigoModulo).toString("base64")}`,
);

function crearObtenerValor(valores) {
  return (campo) => valores[campo] ?? "";
}

test("construirInspeccionEpp conserva la estructura actual", async () => {
  const { construirInspeccionEpp } = await moduloPromise;

  const trabajadores = [
    {
      trabajadorId: 1,
      nombre: "Ana Pérez",
      codigo: "000123",
    },
  ];

  const obtenerValor = crearObtenerValor({
    fecha: "2026-09-14",
    sedeOperacion: "Urabá",
    areaTrabajo: "Operaciones",
    jefeResponsable: "Carlos Gómez",
    cargoJefe: "Jefe de operaciones",
    responsableInspeccion: "Laura Díaz",
    cargoResponsable: "SST",
  });

  const resultado = construirInspeccionEpp({
    inspeccionId: "EPP-123",
    obtenerValor,
    trabajadores,
  });

  assert.deepEqual(resultado, {
    tipoInspeccion: "EPP",
    inspeccionId: "EPP-123",
    informacionGeneral: {
      fecha: "2026-09-14",
      sede: "Urabá",
      area: "Operaciones",
      jefeArea: "Carlos Gómez",
      cargoJefe: "Jefe de operaciones",
      responsableInspeccion: "Laura Díaz",
      cargoResponsable: "SST",
    },
    trabajadores,
  });
});

test("construirInspeccionEpp conserva inspeccionId nulo", async () => {
  const { construirInspeccionEpp } = await moduloPromise;

  const resultado = construirInspeccionEpp({
    obtenerValor: crearObtenerValor({}),
    trabajadores: [],
  });

  assert.equal(resultado.tipoInspeccion, "EPP");
  assert.equal(resultado.inspeccionId, null);
  assert.deepEqual(resultado.trabajadores, []);
});

test("construirInspeccionEpp consulta los campos generales actuales", async () => {
  const { construirInspeccionEpp } = await moduloPromise;

  const camposConsultados = [];

  construirInspeccionEpp({
    obtenerValor(campo) {
      camposConsultados.push(campo);

      return campo;
    },
    trabajadores: [],
  });

  assert.deepEqual(camposConsultados, [
    "fecha",
    "sedeOperacion",
    "areaTrabajo",
    "jefeResponsable",
    "cargoJefe",
    "responsableInspeccion",
    "cargoResponsable",
  ]);
});