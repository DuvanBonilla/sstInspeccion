/**
 * Pruebas del normalizador de texto.
 *
 * Estas pruebas documentan el comportamiento actual de texto.util.js.
 */

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  normalizarTexto,
} = require("../../../src/backend/utils/texto.util");

test("normalizarTexto elimina espacios al inicio y al final", () => {
  const resultado = normalizarTexto("  Cargoban  ");

  assert.equal(resultado, "Cargoban");
});

test("normalizarTexto conserva los espacios internos", () => {
  const resultado = normalizarTexto(
    "Responsable de inspección",
  );

  assert.equal(
    resultado,
    "Responsable de inspección",
  );
});

test("normalizarTexto devuelve cadena vacía para undefined", () => {
  assert.equal(normalizarTexto(undefined), "");
});

test("normalizarTexto devuelve cadena vacía para null", () => {
  assert.equal(normalizarTexto(null), "");
});

test("normalizarTexto devuelve cadena vacía para números", () => {
  assert.equal(normalizarTexto(123), "");
});

test("normalizarTexto devuelve cadena vacía para objetos", () => {
  assert.equal(normalizarTexto({}), "");
});

test("normalizarTexto devuelve cadena vacía para arreglos", () => {
  assert.equal(normalizarTexto([]), "");
});

test("normalizarTexto conserva una cadena vacía", () => {
  assert.equal(normalizarTexto(""), "");
});

test("normalizarTexto convierte una cadena de espacios en cadena vacía", () => {
  assert.equal(normalizarTexto("   "), "");
});