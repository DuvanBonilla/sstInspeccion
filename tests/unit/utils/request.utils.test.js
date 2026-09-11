/**
 * Pruebas de lectura del payload de solicitudes HTTP.
 *
 * Estas pruebas documentan el comportamiento actual de request.utils.js.
 */

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  leerPayload,
} = require("../../../src/backend/utils/request.utils");

test("leerPayload convierte un payload JSON en un objeto", () => {
  const req = {
    body: {
      payload: JSON.stringify({
        fecha: "2026-09-11",
        sede: "Apartadó",
      }),
    },
  };

  const resultado = leerPayload(req);

  assert.deepEqual(resultado, {
    fecha: "2026-09-11",
    sede: "Apartadó",
  });
});

test("leerPayload admite un arreglo serializado como JSON", () => {
  const req = {
    body: {
      payload: JSON.stringify([
        { id: 1 },
        { id: 2 },
      ]),
    },
  };

  assert.deepEqual(leerPayload(req), [
    { id: 1 },
    { id: 2 },
  ]);
});

test("leerPayload devuelve directamente el cuerpo cuando payload no existe", () => {
  const body = {
    fecha: "2026-09-11",
    sede: "Apartadó",
  };

  const resultado = leerPayload({ body });

  assert.strictEqual(resultado, body);
});

test("leerPayload devuelve directamente el cuerpo cuando payload no es una cadena", () => {
  const body = {
    payload: {
      fecha: "2026-09-11",
    },
  };

  const resultado = leerPayload({ body });

  assert.strictEqual(resultado, body);
});

test("leerPayload devuelve un objeto vacío cuando body no existe", () => {
  assert.deepEqual(leerPayload({}), {});
});

test("leerPayload devuelve un objeto vacío cuando body es null", () => {
  assert.deepEqual(leerPayload({ body: null }), {});
});

test("leerPayload lanza SyntaxError cuando payload contiene JSON inválido", () => {
  const req = {
    body: {
      payload: '{"fecha":"2026-09-11"',
    },
  };

  assert.throws(
    () => leerPayload(req),
    SyntaxError,
  );
});

test("leerPayload interpreta la cadena JSON null como null", () => {
  const req = {
    body: {
      payload: "null",
    },
  };

  assert.equal(leerPayload(req), null);
});