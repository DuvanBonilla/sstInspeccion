const test = require("node:test");
const assert = require("node:assert/strict");

const {
  construirCorreoAprobacion,
} = require("../../src/backend/services/correoAprobacion.template.js");

test("incluye el enlace personal y los datos de la inspección", () => {
  const html = construirCorreoAprobacion({
    tipo: "SST",
    rol: "Jefe de Área",
    numero: 26,
    inspeccionId: "INSP-20260915-ABCD",
    fecha: "2026-09-15",
    sede: "Santa Marta",
    area: "Administración",
    enlace: "https://sstinspeccion.onrender.com/aprobar/token-jefe",
  });

  assert.match(html, /Solicitud de aprobación/);
  assert.match(html, /Jefe de Área/);
  assert.match(html, /Administración/);
  assert.match(html, /https:\/\/sstinspeccion\.onrender\.com\/aprobar\/token-jefe/);
});

test("escapa datos del formulario y rechaza enlaces inseguros", () => {
  const datos = {
    tipo: "EPP",
    rol: '<img src=x onerror="alert(1)">',
    numero: 12,
    inspeccionId: "INSP-PRUEBA",
    fecha: "2026-09-15",
    sede: "Santa Marta",
    area: "SST",
  };

  const html = construirCorreoAprobacion({
    ...datos,
    enlace: "https://sstinspeccion.onrender.com/aprobar/token-copasst",
  });

  assert.doesNotMatch(html, /<img src=x onerror=/);
  assert.match(html, /&lt;img src=x onerror=/);

  assert.throws(
    () =>
      construirCorreoAprobacion({
        ...datos,
        enlace: "javascript:alert(1)",
      }),
    /HTTPS/,
  );
});