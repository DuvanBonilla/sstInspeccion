const test = require("node:test");
const assert = require("node:assert/strict");

const {
  leerContactosAprobacion,
  enviarSolicitudesAprobacion,
} = require("../../../src/backend/services/correoAprobacion.service");

const links = {
  jefe: "https://ejemplo.com/aprobar/token-jefe",
  copasst: "https://ejemplo.com/aprobar/token-copasst",
};

const inspeccion = {
  links,
  tipoInspeccion: "SST",
  numInspeccion: 24,
  inspeccionId: "INSP-20260915-ABCD",
  fecha: "2026-09-15",
  sede: "Santa Marta",
  area: "Administración",
};

test("valida y separa los contactos del payload", () => {
  const contactos = leerContactosAprobacion(
    JSON.stringify({
      jefe: { metodo: "correo", destino: "jefe@ejemplo.com" },
      copasst: { metodo: "whatsapp", destino: "3001234567" },
    }),
  );

  assert.equal(contactos.jefe.destino, "jefe@ejemplo.com");
  assert.equal(contactos.copasst.metodo, "whatsapp");
  assert.equal(leerContactosAprobacion(undefined), null);
});

test("rechaza contactos inválidos", () => {
  assert.throws(
    () =>
      leerContactosAprobacion(
        JSON.stringify({
          jefe: { metodo: "correo", destino: "correo-invalido" },
          copasst: { metodo: "whatsapp", destino: "3001234567" },
        }),
      ),
    /correo de jefe/i,
  );
});

test("envía solo el correo y deja WhatsApp como acción manual", async () => {
  const enviados = [];

  const estados = await enviarSolicitudesAprobacion({
    ...inspeccion,
    contactos: {
      jefe: { metodo: "correo", destino: "jefe@ejemplo.com" },
      copasst: { metodo: "whatsapp", destino: "3001234567" },
    },
    async enviarCorreo(datos) {
      enviados.push(datos);
    },
  });

  assert.deepEqual(estados, {
    jefe: "enviado",
    copasst: "manual",
  });
  assert.equal(enviados.length, 1);
  assert.equal(enviados[0].to, "jefe@ejemplo.com");
  assert.match(enviados[0].html, /token-jefe/);
  assert.doesNotMatch(enviados[0].html, /token-copasst/);
});

test("un error del correo devuelve fallido sin lanzar una excepción", async () => {
  const estados = await enviarSolicitudesAprobacion({
    ...inspeccion,
    contactos: {
      jefe: { metodo: "correo", destino: "jefe@ejemplo.com" },
      copasst: { metodo: "whatsapp", destino: "3001234567" },
    },
    async enviarCorreo() {
      throw new Error("Graph no disponible");
    },
  });

  assert.equal(estados.jefe, "fallido");
  assert.equal(estados.copasst, "manual");
});

test("acepta Gmail como destino de correo", () => {
  const contactos = leerContactosAprobacion({
    jefe: { metodo: "correo", destino: "jefe@gmail.com" },
    copasst: { metodo: "whatsapp", destino: "3001234567" },
  });

  assert.equal(contactos.jefe.destino, "jefe@gmail.com");
});

test("rechaza celular incompleto y aprobador faltante", () => {
  for (const telefono of ["301234567", "30123456789", "2012345678"]) {
    assert.throws(
      () =>
        leerContactosAprobacion({
          jefe: { metodo: "whatsapp", destino: telefono },
          copasst: { metodo: "correo", destino: "copasst@gmail.com" },
        }),
      /teléfono de jefe/i,
    );
  }

  assert.throws(
    () =>
      leerContactosAprobacion({
        jefe: { metodo: "correo", destino: "jefe@gmail.com" },
      }),
    /medio de envío de copasst/i,
  );
});