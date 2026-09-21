const test = require("node:test");
const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
const path = require("node:path");

const rutaServicio = path.resolve(
  __dirname,
  "../../../src/views/js/epp/services/registroInspeccionEpp.service.js",
);

async function cargarServicio() {
  const codigo = await readFile(rutaServicio, "utf8");
  const url = `data:text/javascript;base64,${Buffer.from(codigo).toString(
    "base64",
  )}`;

  return import(url);
}

function crearFormDataFalso() {
  const valores = [];

  return {
    append(nombre, valor) {
      valores.push([nombre, valor]);
    },

    obtenerValores() {
      return valores;
    },
  };
}

test("construirFormData conserva payload, evidencias y contactos", async () => {
  const { crearRegistroInspeccionEppService } = await cargarServicio();
  const trabajadores = [{ nombre: "Ana" }];
  const evidencias = [{ archivo: "epp.jpg" }];
  const contactos = [{ rol: "jefe", destino: "jefe@empresa.com" }];
  const llamadasPayload = [];
  const llamadasContenido = [];
  const formData = crearFormDataFalso();

  const obtenerValor = (selector) => `valor de ${selector}`;

  const servicio = crearRegistroInspeccionEppService({
    generarInspeccionId() {
      return "NO-DEBE-USARSE";
    },

    construirPayload(datos) {
      llamadasPayload.push(datos);

      return {
        inspeccionId: datos.inspeccionId,
        sede: datos.obtenerValor("#sede-operacion"),
        trabajadores: datos.trabajadores,
      };
    },

    construirContenidoFormData(datos) {
      llamadasContenido.push(datos);
      return formData;
    },

    enviarInspeccion() {},

    obtenerValor,

    leerTrabajadores() {
      return trabajadores;
    },

    obtenerEvidencias() {
      return evidencias;
    },

    obtenerContactos() {
      return contactos;
    },
  });

  const resultado = servicio.construirFormData("EPP-123");

  assert.equal(resultado, formData);
  assert.deepEqual(llamadasPayload, [
    {
      inspeccionId: "EPP-123",
      obtenerValor,
      trabajadores,
    },
  ]);
  assert.deepEqual(llamadasContenido, [
    {
      inspeccion: {
        inspeccionId: "EPP-123",
        sede: "valor de #sede-operacion",
        trabajadores,
      },
      evidencias,
    },
  ]);
  assert.deepEqual(formData.obtenerValores(), [
    ["contactosAprobacion", JSON.stringify(contactos)],
  ]);
});

test("enviar genera el identificador y delega la solicitud", async () => {
  const { crearRegistroInspeccionEppService } = await cargarServicio();
  const formData = crearFormDataFalso();
  const llamadasPayload = [];
  const llamadasApi = [];
  const respuestaApi = { ok: true, inspeccionId: "EPP-456" };

  const servicio = crearRegistroInspeccionEppService({
    generarInspeccionId() {
      return "EPP-456";
    },

    construirPayload(datos) {
      llamadasPayload.push(datos);
      return { inspeccionId: datos.inspeccionId };
    },

    construirContenidoFormData() {
      return formData;
    },

    async enviarInspeccion(datos) {
      llamadasApi.push(datos);
      return respuestaApi;
    },

    obtenerValor() {
      return "";
    },

    leerTrabajadores() {
      return [];
    },

    obtenerEvidencias() {
      return [];
    },

    obtenerContactos() {
      return [];
    },
  });

  const respuesta = await servicio.enviar();

  assert.equal(respuesta, respuestaApi);
  assert.equal(llamadasPayload[0].inspeccionId, "EPP-456");
  assert.deepEqual(llamadasApi, [formData]);
});