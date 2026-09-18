const test = require("node:test");
const assert = require("node:assert/strict");

const {
  generarCodigoReinicio,
  crearHashCodigoReinicio,
  compararCodigoReinicio,
  calcularVencimientoCodigo,
  validarCodigoReinicio,
} = require("../../../src/backend/services/codigoReinicioAprobaciones.service");

test("genera un código temporal de seis dígitos", () => {
  const codigo = generarCodigoReinicio();

  assert.match(codigo, /^\d{6}$/);
});

test("crea un hash y salt sin conservar el código en texto plano", () => {
  const codigo = "123456";
  const resultado = crearHashCodigoReinicio(codigo);

  assert.ok(resultado.hash);
  assert.ok(resultado.salt);
  assert.notEqual(resultado.hash, codigo);
  assert.notEqual(resultado.salt, codigo);
});

test("compara correctamente un código con su hash", () => {
  const codigo = "123456";
  const { hash, salt } = crearHashCodigoReinicio(codigo);

  assert.equal(compararCodigoReinicio(codigo, hash, salt), true);
  assert.equal(compararCodigoReinicio("654321", hash, salt), false);
});

test("calcula el vencimiento a diez minutos", () => {
  const ahora = new Date("2026-09-17T12:00:00.000Z");
  const vencimiento = calcularVencimientoCodigo(ahora);

  assert.equal(
    vencimiento.toISOString(),
    "2026-09-17T12:10:00.000Z",
  );
});

test("valida un código vigente y correcto", () => {
  const codigo = "123456";
  const { hash, salt } = crearHashCodigoReinicio(codigo);

  const resultado = validarCodigoReinicio({
    codigo,
    hash,
    salt,
    venceEn: new Date("2026-09-17T12:10:00.000Z"),
    fechaActual: new Date("2026-09-17T12:00:00.000Z"),
    intentos: 0,
    usadoEn: null,
  });

  assert.deepEqual(resultado, { valido: true });
});

test("rechaza códigos vencidos, usados, bloqueados o incorrectos", () => {
  const codigo = "123456";
  const { hash, salt } = crearHashCodigoReinicio(codigo);
  const base = {
    codigo,
    hash,
    salt,
    venceEn: new Date("2026-09-17T12:10:00.000Z"),
    fechaActual: new Date("2026-09-17T12:00:00.000Z"),
    intentos: 0,
    usadoEn: null,
  };

  assert.deepEqual(
    validarCodigoReinicio({
      ...base,
      fechaActual: new Date("2026-09-17T12:10:01.000Z"),
    }),
    { valido: false, motivo: "EXPIRADO" },
  );

  assert.deepEqual(
    validarCodigoReinicio({
      ...base,
      usadoEn: new Date("2026-09-17T12:01:00.000Z"),
    }),
    { valido: false, motivo: "UTILIZADO" },
  );

  assert.deepEqual(
    validarCodigoReinicio({
      ...base,
      intentos: 5,
    }),
    { valido: false, motivo: "BLOQUEADO" },
  );

  assert.deepEqual(
    validarCodigoReinicio({
      ...base,
      codigo: "000000",
    }),
    { valido: false, motivo: "INCORRECTO" },
  );
});