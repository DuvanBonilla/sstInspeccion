const test = require("node:test");
const assert = require("node:assert/strict");

const {
  construirHtmlSolicitudAprobacion,
} = require("../../src/backend/services/correoAprobacion.template");

test("genera una solicitud SST con su enlace personal", () => {
  const html = construirHtmlSolicitudAprobacion({
    tipoInspeccion: "SST",
    rol: "Jefe de Área",
    numInspeccion: 24,
    inspeccionId: "INSP-20260915-ABCD",
    fecha: "2026-09-15",
    sede: "Santa Marta",
    area: "Administración",
    enlace: "https://sstinspeccion.onrender.com/aprobar/token-jefe",
  });

  assert.match(html, /Solicitud de aprobación/);
  assert.match(html, /INSPECCIÓN SST/);
  assert.match(html, /Jefe de Área/);
  assert.match(html, /Revisar y aprobar/);
  assert.match(html, /https:\/\/sstinspeccion\.onrender\.com\/aprobar\/token-jefe/);
});

test("escapa datos del formulario y rechaza enlaces inseguros", () => {
  const datos = {
    tipoInspeccion: "EPP",
    rol: "COPASST",
    sede: '<script>alert("x")</script>',
    enlace: "https://sstinspeccion.onrender.com/aprobar/token-copasst",
  };

  const html = construirHtmlSolicitudAprobacion(datos);

  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);

  assert.throws(
    () =>
      construirHtmlSolicitudAprobacion({
        ...datos,
        enlace: "javascript:alert(1)",
      }),
    /HTTP o HTTPS/,
  );
});