/**
 * Pruebas de resolución de fechas para evidencias fotográficas.
 *
 * Estas pruebas documentan el comportamiento actual de fechaEvidencia.js.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const exifr = require("exifr");

const {
  extraerFechaExif,
  formatearFechaMs,
  resolverFechaEvidencia,
} = require("../../../src/backend/utils/fechaEvidencia");

function crearFechaLocal() {
  return new Date(2026, 8, 11, 8, 5);
}

test("formatearFechaMs convierte milisegundos al formato esperado", () => {
  const fecha = crearFechaLocal();

  assert.equal(
    formatearFechaMs(fecha.getTime()),
    "2026-09-11 08:05",
  );
});

test("formatearFechaMs admite milisegundos como cadena", () => {
  const fecha = crearFechaLocal();

  assert.equal(
    formatearFechaMs(String(fecha.getTime())),
    "2026-09-11 08:05",
  );
});

test("formatearFechaMs devuelve null para un valor inválido", () => {
  assert.equal(formatearFechaMs("fecha-invalida"), null);
});

test("extraerFechaExif devuelve null cuando no recibe un buffer", async () => {
  assert.equal(await extraerFechaExif(), null);
});

test("extraerFechaExif devuelve null para un buffer vacío", async () => {
  assert.equal(await extraerFechaExif(Buffer.alloc(0)), null);
});

test("extraerFechaExif formatea DateTimeOriginal", async () => {
  const parseOriginal = exifr.parse;

  exifr.parse = async () => ({
    DateTimeOriginal: crearFechaLocal(),
  });

  try {
    assert.equal(
      await extraerFechaExif(Buffer.from([1])),
      "2026-09-11 08:05",
    );
  } finally {
    exifr.parse = parseOriginal;
  }
});

test("extraerFechaExif usa DateTime cuando DateTimeOriginal no existe", async () => {
  const parseOriginal = exifr.parse;

  exifr.parse = async () => ({
    DateTime: crearFechaLocal(),
  });

  try {
    assert.equal(
      await extraerFechaExif(Buffer.from([1])),
      "2026-09-11 08:05",
    );
  } finally {
    exifr.parse = parseOriginal;
  }
});

test("extraerFechaExif devuelve null cuando exifr produce un error", async () => {
  const parseOriginal = exifr.parse;

  exifr.parse = async () => {
    throw new Error("Imagen sin metadatos válidos");
  };

  try {
    assert.equal(
      await extraerFechaExif(Buffer.from([1])),
      null,
    );
  } finally {
    exifr.parse = parseOriginal;
  }
});

test("resolverFechaEvidencia prioriza la fecha EXIF", async () => {
  const parseOriginal = exifr.parse;

  exifr.parse = async () => ({
    DateTimeOriginal: crearFechaLocal(),
  });

  const fechaModificacion = new Date(
    2025,
    0,
    15,
    10,
    30,
  ).getTime();

  try {
    assert.equal(
      await resolverFechaEvidencia(
        { buffer: Buffer.from([1]) },
        fechaModificacion,
      ),
      "2026-09-11 08:05",
    );
  } finally {
    exifr.parse = parseOriginal;
  }
});

test("resolverFechaEvidencia usa lastModMs cuando no existe fecha EXIF", async () => {
  const parseOriginal = exifr.parse;

  exifr.parse = async () => null;

  try {
    assert.equal(
      await resolverFechaEvidencia(
        { buffer: Buffer.from([1]) },
        crearFechaLocal().getTime(),
      ),
      "2026-09-11 08:05",
    );
  } finally {
    exifr.parse = parseOriginal;
  }
});

test("resolverFechaEvidencia devuelve null cuando no hay ninguna fecha", async () => {
  assert.equal(
    await resolverFechaEvidencia(
      { buffer: Buffer.alloc(0) },
      undefined,
    ),
    null,
  );
});

test("resolverFechaEvidencia conserva el comportamiento actual para lastModMs igual a cero", async () => {
  assert.equal(
    await resolverFechaEvidencia(
      { buffer: Buffer.alloc(0) },
      0,
    ),
    null,
  );
});