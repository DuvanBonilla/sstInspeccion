const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const rutaModulo = path.resolve(
  "src/views/js/shared/aprobacionContacto.js",
);

const codigoModulo = fs.readFileSync(rutaModulo, "utf8");

const moduloPromise = import(
  `data:text/javascript;base64,${Buffer.from(codigoModulo).toString("base64")}`
);

test("normalizarTelefonoColombia agrega el indicativo 57", async () => {
  const { normalizarTelefonoColombia } = await moduloPromise;

  assert.equal(normalizarTelefonoColombia("3001234567"), "573001234567");
});

test("normalizarTelefonoColombia conserva un indicativo existente", async () => {
  const { normalizarTelefonoColombia } = await moduloPromise;

  assert.equal(
    normalizarTelefonoColombia("+57 300 123 4567"),
    "573001234567",
  );
});

test("normalizarTelefonoColombia rechaza números inválidos", async () => {
  const {
    normalizarTelefonoColombia,
    validarTelefonoColombia,
  } = await moduloPromise;

  assert.equal(normalizarTelefonoColombia("123456"), "");
  assert.equal(validarTelefonoColombia("6011234567"), false);
});

test("validarTelefonoColombia acepta un celular colombiano", async () => {
  const { validarTelefonoColombia } = await moduloPromise;

  assert.equal(validarTelefonoColombia("310 555 6677"), true);
});

test("normalizarCorreo elimina espacios y convierte a minúsculas", async () => {
  const { normalizarCorreo } = await moduloPromise;

  assert.equal(
    normalizarCorreo("  Jefe@Cargoban.COM  "),
    "jefe@cargoban.com",
  );
});

test("validarCorreo distingue direcciones válidas e inválidas", async () => {
  const { validarCorreo } = await moduloPromise;

  assert.equal(validarCorreo("copasst@cargoban.com"), true);
  assert.equal(validarCorreo("correo-invalido"), false);
});

test("crearMensajeAprobacion incluye los datos de la inspección", async () => {
  const { crearMensajeAprobacion } = await moduloPromise;

  const mensaje = crearMensajeAprobacion({
    tipoInspeccion: "SST",
    rol: "Jefe responsable",
    numInspeccion: 125,
    inspeccionId: "INSP-20260914-ABCD",
    sede: "Urabá",
    area: "Operaciones",
    enlace: "https://ejemplo.com/aprobar/token",
  });

  assert.match(mensaje, /inspección SST/i);
  assert.match(mensaje, /Jefe responsable/);
  assert.match(mensaje, /N.º 125/);
  assert.match(mensaje, /Urabá/);
  assert.match(mensaje, /Operaciones/);
  assert.match(mensaje, /https:\/\/ejemplo\.com\/aprobar\/token/);
  assert.match(mensaje, /enlace es personal/i);
});

test("crearMensajeAprobacion usa el identificador sin consecutivo", async () => {
  const { crearMensajeAprobacion } = await moduloPromise;

  const mensaje = crearMensajeAprobacion({
    tipoInspeccion: "EPP",
    rol: "COPASST",
    inspeccionId: "INSP-20260914-EPP1",
    enlace: "https://ejemplo.com/aprobar/copasst",
  });

  assert.match(mensaje, /INSP-20260914-EPP1/);
});

test("crearUrlWhatsApp construye el enlace con el mensaje codificado", async () => {
  const { crearUrlWhatsApp } = await moduloPromise;

  const url = crearUrlWhatsApp({
    telefono: "3001234567",
    mensaje: "Apruebe la inspección SST",
  });

  assert.match(url, /^https:\/\/wa\.me\/573001234567\?text=/);
  assert.equal(
    new URL(url).searchParams.get("text"),
    "Apruebe la inspección SST",
  );
});

test("crearUrlWhatsApp devuelve vacío para un teléfono inválido", async () => {
  const { crearUrlWhatsApp } = await moduloPromise;

  assert.equal(
    crearUrlWhatsApp({
      telefono: "123",
      mensaje: "Mensaje",
    }),
    "",
  );
});

test("crearUrlCorreo construye el correo predeterminado", async () => {
  const { crearUrlCorreo } = await moduloPromise;

  const url = crearUrlCorreo({
    correo: "jefe@cargoban.com",
    asunto: "Aprobación de inspección SST",
    mensaje: "Revise el enlace de aprobación.",
  });

  assert.match(url, /^mailto:jefe@cargoban\.com\?/);

  const parametros = new URL(url).searchParams;

  assert.equal(parametros.get("subject"), "Aprobación de inspección SST");
  assert.equal(parametros.get("body"), "Revise el enlace de aprobación.");
});

test("crearUrlCorreo devuelve vacío para un correo inválido", async () => {
  const { crearUrlCorreo } = await moduloPromise;

  assert.equal(
    crearUrlCorreo({
      correo: "correo-invalido",
      asunto: "Prueba",
      mensaje: "Mensaje",
    }),
    "",
  );
});