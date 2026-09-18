/**
 * Pruebas de validación de inspecciones y evidencias EPP.
 *
 * Estas pruebas documentan el comportamiento actual de
 * inspeccionEpp.validator.js.
 */

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  validarInspeccionEpp,
  validarEvidenciaTrabajador,
} = require(
  "../../../src/backend/validators/inspeccionEpp.validator"
);

const {
  crearInspeccionEppValida,
  crearEvidenciaTrabajadorValida,
} = require("../../fixtures/inspeccionEpp.fixture");

/* ---------------------------------------------------------
   VALIDACIÓN DEL PAYLOAD
--------------------------------------------------------- */

test("validarInspeccionEpp acepta una inspección completa", () => {
  const payload = crearInspeccionEppValida();

  const resultado = validarInspeccionEpp(payload);

  assert.equal(resultado.ok, true);
  assert.equal(
    resultado.data.general.inspeccionId,
    "INSP-EPP-PRUEBA-001",
  );
  assert.equal(resultado.data.trabajadores.length, 1);
  assert.equal(resultado.data.trabajadores[0].idx, 0);
  assert.equal(
    resultado.data.trabajadores[0].elementos[0].idx,
    0,
  );
  assert.equal(
    resultado.data.trabajadores[0].elementos[0].elementoEppId,
    1,
  );
});

test("validarInspeccionEpp normaliza espacios y calificaciones", () => {
  const payload = crearInspeccionEppValida();

  payload.informacionGeneral.fecha = "  2026-09-11  ";
  payload.trabajadores[0].nombre = "  Trabajador de prueba  ";
  payload.trabajadores[0].codigo = "  TRAB-001  ";
  payload.trabajadores[0].cargo = "  Auxiliar operativo  ";
  payload.trabajadores[0].elementos[0].condicion = " b ";
  payload.trabajadores[0].elementos[0].uso = " na ";

  const resultado = validarInspeccionEpp(payload);

  assert.equal(resultado.ok, true);
  assert.equal(resultado.data.general.fecha, "2026-09-11");
  assert.equal(
    resultado.data.trabajadores[0].nombre,
    "Trabajador de prueba",
  );
  assert.equal(
    resultado.data.trabajadores[0].codigo,
    "TRAB-001",
  );
  assert.equal(
    resultado.data.trabajadores[0].cargo,
    "Auxiliar operativo",
  );
  assert.equal(
    resultado.data.trabajadores[0].elementos[0].condicion,
    "B",
  );
  assert.equal(
    resultado.data.trabajadores[0].elementos[0].uso,
    "NA",
  );
});

test("validarInspeccionEpp admite los alias de información general", () => {
  const payload = crearInspeccionEppValida();

  payload.informacionGeneral.inspeccionId =
    "INSP-EPP-ALIAS-001";
  payload.informacionGeneral.sede = "Apartadó";
  payload.informacionGeneral.area = "Operaciones";
  payload.informacionGeneral.jefeArea = "Jefe de prueba";

  delete payload.inspeccionId;
  delete payload.informacionGeneral.sedeOperacion;
  delete payload.informacionGeneral.areaTrabajo;
  delete payload.informacionGeneral.jefeResponsable;

  const resultado = validarInspeccionEpp(payload);

  assert.equal(resultado.ok, true);
  assert.equal(
    resultado.data.general.inspeccionId,
    "INSP-EPP-ALIAS-001",
  );
  assert.equal(
    resultado.data.general.sedeOperacion,
    "Apartadó",
  );
  assert.equal(
    resultado.data.general.areaTrabajo,
    "Operaciones",
  );
  assert.equal(
    resultado.data.general.jefeResponsable,
    "Jefe de prueba",
  );
});

test("validarInspeccionEpp informa todos los campos generales obligatorios", () => {
  const payload = crearInspeccionEppValida();

  payload.informacionGeneral = {};

  const resultado = validarInspeccionEpp(payload);

  assert.equal(resultado.ok, false);

  assert.deepEqual(resultado.errores, [
    "Fecha de inspección es obligatoria",
    "Sede de operación es obligatoria",
    "Área de trabajo es obligatoria",
    "Nombre del jefe responsable es obligatorio",
    "Cargo del jefe es obligatorio",
    "Responsable de la inspección es obligatorio",
    "Cargo del responsable es obligatorio",
  ]);
});

test("validarInspeccionEpp exige al menos un trabajador", () => {
  const payload = crearInspeccionEppValida();

  payload.trabajadores = [];

  const resultado = validarInspeccionEpp(payload);

  assert.equal(resultado.ok, false);
  assert.deepEqual(resultado.errores, [
    "Debe existir al menos un trabajador",
  ]);
});

test("validarInspeccionEpp valida los datos obligatorios del trabajador", () => {
  const payload = crearInspeccionEppValida();

  payload.trabajadores[0].nombre = "";
  payload.trabajadores[0].codigo = "";
  payload.trabajadores[0].cargo = "";

  const resultado = validarInspeccionEpp(payload);

  assert.equal(resultado.ok, false);

  assert.deepEqual(resultado.errores, [
    "Trabajador 1: nombre es obligatorio",
    "Trabajador 1: código es obligatorio",
    "Trabajador 1: cargo es obligatorio",
  ]);
});

test("validarInspeccionEpp exige al menos un elemento por trabajador", () => {
  const payload = crearInspeccionEppValida();

  payload.trabajadores[0].elementos = [];

  const resultado = validarInspeccionEpp(payload);

  assert.equal(resultado.ok, false);

  assert.deepEqual(resultado.errores, [
    "Trabajador 1: debe contener al menos una evaluación EPP",
  ]);
});

test("validarInspeccionEpp rechaza catálogo, nombre y calificaciones inválidas", () => {
  const payload = crearInspeccionEppValida();
  const elemento = payload.trabajadores[0].elementos[0];

  elemento.elementoEppId = 0;
  elemento.elemento = "";
  elemento.condicion = "X";
  elemento.uso = "X";

  const resultado = validarInspeccionEpp(payload);

  assert.equal(resultado.ok, false);

  assert.ok(
    resultado.errores.includes(
      "Trabajador 1, elemento 1: catálogo EPP inválido",
    ),
  );

  assert.ok(
    resultado.errores.includes(
      "Trabajador 1, elemento 1: nombre inválido",
    ),
  );

  assert.ok(
    resultado.errores.includes(
      "Trabajador 1, elemento 1: condición inválida",
    ),
  );

  assert.ok(
    resultado.errores.includes(
      "Trabajador 1, elemento 1: uso inválido",
    ),
  );
});

test("validarInspeccionEpp admite nombre como alias del elemento", () => {
  const payload = crearInspeccionEppValida();
  const elemento = payload.trabajadores[0].elementos[0];

  elemento.nombre = elemento.elemento;
  delete elemento.elemento;

  const resultado = validarInspeccionEpp(payload);

  assert.equal(resultado.ok, true);
  assert.equal(
    resultado.data.trabajadores[0].elementos[0].elemento,
    "Casco de seguridad",
  );
});

test("validarInspeccionEpp exige plan y fecha cuando existe R o M", () => {
  const payload = crearInspeccionEppValida();
  const elemento = payload.trabajadores[0].elementos[0];

  elemento.condicion = "R";
  elemento.uso = "B";
  elemento.planAccion = "";
  elemento.fechaPlanAccion = "";

  const resultado = validarInspeccionEpp(payload);

  assert.equal(resultado.ok, false);

  assert.deepEqual(resultado.errores, [
    "Trabajador 1, Casco de seguridad: debe registrar un plan de acción",
    "Trabajador 1, Casco de seguridad: debe registrar la fecha límite del plan de acción",
  ]);
});

test("validarInspeccionEpp acepta R o M cuando existe un plan completo", () => {
  const payload = crearInspeccionEppValida();
  const elemento = payload.trabajadores[0].elementos[0];

  elemento.condicion = "M";
  elemento.uso = "R";
  elemento.planAccion = "Reemplazar el casco";
  elemento.fechaPlanAccion = "2026-09-30";

  const resultado = validarInspeccionEpp(payload);

  assert.equal(resultado.ok, true);
  assert.equal(
    resultado.data.trabajadores[0].elementos[0].planAccion,
    "Reemplazar el casco",
  );
  assert.equal(
    resultado.data.trabajadores[0].elementos[0].fechaPlanAccion,
    "2026-09-30",
  );
});

test("validarInspeccionEpp convierte el plan vacío en null cuando no es requerido", () => {
  const payload = crearInspeccionEppValida();

  const resultado = validarInspeccionEpp(payload);
  const elemento = resultado.data.trabajadores[0].elementos[0];

  assert.equal(resultado.ok, true);
  assert.equal(elemento.planAccion, null);
  assert.equal(elemento.fechaPlanAccion, null);
});

/* ---------------------------------------------------------
   VALIDACIÓN DE EVIDENCIAS
--------------------------------------------------------- */

test("validarEvidenciaTrabajador acepta una evidencia JPEG válida", () => {
  const file = crearEvidenciaTrabajadorValida();

  const resultado = validarEvidenciaTrabajador(file, 1);

  assert.equal(resultado.ok, true);
  assert.strictEqual(resultado.data, file);
});

test("validarEvidenciaTrabajador rechaza una evidencia ausente", () => {
  const resultado = validarEvidenciaTrabajador(undefined, 2);

  assert.deepEqual(resultado, {
    ok: false,
    errores: [
      "Trabajador 2: debe adjuntar una evidencia.",
    ],
  });
});

test("validarEvidenciaTrabajador rechaza un buffer vacío", () => {
  const file = crearEvidenciaTrabajadorValida();

  file.buffer = Buffer.alloc(0);
  file.size = 0;

  const resultado = validarEvidenciaTrabajador(file, 1);

  assert.equal(resultado.ok, false);

  assert.ok(
    resultado.errores.includes(
      "Trabajador 1: la evidencia está vacía.",
    ),
  );
});

test("validarEvidenciaTrabajador rechaza tipos diferentes de JPG y PNG", () => {
  const file = crearEvidenciaTrabajadorValida();

  file.mimetype = "application/pdf";

  const resultado = validarEvidenciaTrabajador(file, 1);

  assert.equal(resultado.ok, false);

  assert.ok(
    resultado.errores.includes(
      "Trabajador 1: la evidencia debe ser una imagen JPG o PNG.",
    ),
  );
});

test("validarEvidenciaTrabajador rechaza archivos mayores de 10 MB", () => {
  const file = crearEvidenciaTrabajadorValida();

  file.size = (10 * 1024 * 1024) + 1;

  const resultado = validarEvidenciaTrabajador(file, 1);

  assert.equal(resultado.ok, false);

  assert.ok(
    resultado.errores.includes(
      "Trabajador 1: la evidencia supera el tamaño máximo permitido de 10 MB.",
    ),
  );
});

test("validarEvidenciaTrabajador conserva el comportamiento actual cuando size no existe", () => {
  const file = crearEvidenciaTrabajadorValida();

  delete file.size;

  const resultado = validarEvidenciaTrabajador(file, 1);

  assert.equal(resultado.ok, true);
});