/**
 * Pruebas del coordinador de validaciones SST.
 *
 * Estas pruebas documentan las reglas y formas de entrada que actualmente
 * admite inspeccion.validator.js.
 */

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  validarInspeccion,
} = require("../../../src/backend/validators/inspeccion.validator");

const {
  crearInspeccionSstValida,
} = require("../../fixtures/inspeccionSst.fixture");

test("validarInspeccion acepta una inspección SST completa", () => {
  const payload = crearInspeccionSstValida();

  const resultado = validarInspeccion(payload);

  assert.equal(resultado.ok, true);
  assert.equal(resultado.data.extintores.length, 1);
  assert.equal(resultado.data.camillas.length, 1);
  assert.equal(resultado.data.senalizaciones.length, 1);
  assert.equal(resultado.data.equiposTecnologicos.length, 1);
  assert.equal(resultado.data.botiquines.length, 1);

  assert.strictEqual(
    resultado.data.camilla,
    resultado.data.camillas[0],
  );

  assert.strictEqual(
    resultado.data.senalizacion,
    resultado.data.senalizaciones[0],
  );

  assert.strictEqual(
    resultado.data.equipoTecnologico,
    resultado.data.equiposTecnologicos[0],
  );

  assert.strictEqual(
    resultado.data.botiquin,
    resultado.data.botiquines[0],
  );
});

test("validarInspeccion normaliza los espacios de los datos generales", () => {
  const payload = crearInspeccionSstValida();

  payload.inspeccionId = "  INSP-PRUEBA-001  ";
  payload.fecha = "  2026-09-11  ";
  payload.sedeOperacion = "  Bogotá  ";
  payload.areaTrabajo = "  Administrativa  ";
  payload.jefeResponsable = "  Jefe de prueba  ";
  payload.cargoJefe = "  Jefe de área  ";
  payload.responsableInspeccion = "  Inspector de prueba  ";
  payload.cargoResponsable = "  Inspector SST  ";

  const resultado = validarInspeccion(payload);

  assert.equal(resultado.ok, true);

  assert.deepEqual(resultado.data.general, {
    inspeccionId: "INSP-PRUEBA-001",
    fecha: "2026-09-11",
    sedeOperacion: "Bogotá",
    areaTrabajo: "Administrativa",
    jefeResponsable: "Jefe de prueba",
    cargoJefe: "Jefe de área",
    responsableInspeccion: "Inspector de prueba",
    cargoResponsable: "Inspector SST",
  });
});

test("validarInspeccion informa todos los campos generales obligatorios", () => {
  const payload = crearInspeccionSstValida();

  payload.fecha = " ";
  payload.sedeOperacion = " ";
  payload.areaTrabajo = " ";
  payload.jefeResponsable = " ";
  payload.cargoJefe = " ";
  payload.responsableInspeccion = " ";
  payload.cargoResponsable = " ";

  const resultado = validarInspeccion(payload);

  assert.equal(resultado.ok, false);

  assert.deepEqual(resultado.errores, [
    "Fecha de inspeccion es obligatoria",
    "Sede de operacion es obligatoria",
    "Area de trabajo es obligatoria",
    "Nombre del jefe responsable es obligatorio",
    "Cargo del jefe es obligatorio",
    "Nombre del responsable de inspeccion es obligatorio",
    "Cargo del responsable es obligatorio",
  ]);
});

test("validarInspeccion exige las cinco secciones en una sede ordinaria", () => {
  const payload = crearInspeccionSstValida();

  payload.extintores = [];
  payload.camillas = [];
  payload.senalizaciones = [];
  payload.equiposTecnologicos = [];
  payload.botiquines = [];

  const resultado = validarInspeccion(payload);

  assert.equal(resultado.ok, false);

  assert.deepEqual(resultado.errores, [
    "Debe agregar al menos un extintor",
    "Debe agregar al menos una camilla",
    "Debe agregar al menos una senalizacion",
    "Debe agregar al menos un equipo tecnologico",
    "Debe agregar al menos un botiquin",
  ]);
});

test("validarInspeccion permite omitir secciones en una sede de Urabá", () => {
  const payload = crearInspeccionSstValida();

  payload.sedeOperacion = "Apartadó - Urabá";
  payload.extintores = [];
  payload.camillas = [];
  payload.senalizaciones = [];
  payload.equiposTecnologicos = [];
  payload.botiquines = [];

  const resultado = validarInspeccion(payload);

  assert.equal(resultado.ok, true);
  assert.deepEqual(resultado.data.extintores, []);
  assert.deepEqual(resultado.data.camillas, []);
  assert.deepEqual(resultado.data.senalizaciones, []);
  assert.deepEqual(resultado.data.equiposTecnologicos, []);
  assert.deepEqual(resultado.data.botiquines, []);
});

test("validarInspeccion permite omitir secciones en Santa Marta sin importar mayúsculas", () => {
  const payload = crearInspeccionSstValida();

  payload.sedeOperacion = "SANTA MARTA";
  payload.extintores = [];
  payload.camillas = [];
  payload.senalizaciones = [];
  payload.equiposTecnologicos = [];
  payload.botiquines = [];

  const resultado = validarInspeccion(payload);

  assert.equal(resultado.ok, true);
});

test("validarInspeccion valida los elementos enviados aunque la sede permita omitir secciones", () => {
  const payload = crearInspeccionSstValida();

  payload.sedeOperacion = "Urabá";
  payload.extintores = [{}];
  payload.camillas = [];
  payload.senalizaciones = [];
  payload.equiposTecnologicos = [];
  payload.botiquines = [];

  const resultado = validarInspeccion(payload);

  assert.equal(resultado.ok, false);

  assert.ok(
    resultado.errores.includes(
      "Numero de extintor es obligatorio en extintor 1",
    ),
  );

  assert.ok(
    resultado.errores.includes(
      "Estado invalido para acceso en extintor 1",
    ),
  );
});

test("validarInspeccion conserva las formas singulares compatibles", () => {
  const payload = crearInspeccionSstValida();

  payload.extintor = payload.extintores[0];
  payload.camilla = payload.camillas[0];
  payload.equipoTecnologico = payload.equiposTecnologicos[0];
  payload.botiquin = payload.botiquines[0];

  delete payload.extintores;
  delete payload.camillas;
  delete payload.equiposTecnologicos;
  delete payload.botiquines;

  const resultado = validarInspeccion(payload);

  assert.equal(resultado.ok, true);
  assert.equal(resultado.data.extintores.length, 1);
  assert.equal(resultado.data.camillas.length, 1);
  assert.equal(resultado.data.equiposTecnologicos.length, 1);
  assert.equal(resultado.data.botiquines.length, 1);
});

test("validarInspeccion acepta condiciones de extintor en minúsculas pero conserva el valor original", () => {
  const payload = crearInspeccionSstValida();

  payload.extintores[0].condiciones.acceso = "b";

  const resultado = validarInspeccion(payload);

  assert.equal(resultado.ok, true);
  assert.equal(
    resultado.data.extintores[0].condiciones.acceso,
    "b",
  );
});

test("validarInspeccion devuelve las normalizaciones realizadas antes de validar", () => {
  const payload = crearInspeccionSstValida();

  payload.camillas[0].afectacionProductividad = " no ";
  payload.senalizaciones[0].estado = "b";
  payload.senalizaciones[0].aseo = "r";
  payload.equiposTecnologicos[0].estado = "b";
  payload.equiposTecnologicos[0].mantenimiento = "r";
  payload.equiposTecnologicos[0].afectacionServicio = " no ";
  payload.botiquines[0].items[0].integridadEmpaque = "b";
  payload.botiquines[0].items[0].planIntervencion = "reponer";

  const resultado = validarInspeccion(payload);

  assert.equal(resultado.ok, true);
  assert.equal(
    resultado.data.camillas[0].afectacionProductividad,
    "NO",
  );
  assert.equal(resultado.data.senalizaciones[0].estado, "B");
  assert.equal(resultado.data.senalizaciones[0].aseo, "R");
  assert.equal(
    resultado.data.equiposTecnologicos[0].estado,
    "B",
  );
  assert.equal(
    resultado.data.equiposTecnologicos[0].mantenimiento,
    "R",
  );
  assert.equal(
    resultado.data.equiposTecnologicos[0].afectacionServicio,
    "NO",
  );
  assert.equal(
    resultado.data.botiquines[0].items[0].integridadEmpaque,
    "B",
  );
  assert.equal(
    resultado.data.botiquines[0].items[0].planIntervencion,
    "REPONER",
  );
});

test("validarInspeccion conserva la validación exacta de Sí y No en botiquines", () => {
  const payload = crearInspeccionSstValida();

  payload.botiquines[0].items[0].cumplimiento = "SI";
  payload.botiquines[0].items[0].afectacionServicio = "NO";

  const resultado = validarInspeccion(payload);

  assert.equal(resultado.ok, false);

  assert.ok(
    resultado.errores.includes(
      "Cumplimiento invalido en botiquin 1, fila 1",
    ),
  );

  assert.ok(
    resultado.errores.includes(
      "Afectacion al servicio invalida en botiquin 1, fila 1",
    ),
  );
});