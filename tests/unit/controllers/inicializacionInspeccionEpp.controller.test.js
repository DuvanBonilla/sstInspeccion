const test = require("node:test");
const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
const path = require("node:path");

const rutaControlador = path.resolve(
  __dirname,
  "../../../src/views/js/epp/controllers/inicializacionInspeccionEpp.controller.js",
);

async function cargarControlador() {
  const codigo = await readFile(rutaControlador, "utf8");
  const url = `data:text/javascript;base64,${Buffer.from(codigo).toString(
    "base64",
  )}`;

  return import(url);
}

test("detiene la inicialización si no puede cargar el catálogo EPP", async () => {
  const { crearInicializacionInspeccionEppController } =
    await cargarControlador();

  const inicializaciones = [];
  const errores = [];
  const alertas = [];

  const controlador = crearInicializacionInspeccionEppController({
    async cargarCatalogoEpp() {
      throw new Error("catálogo no disponible");
    },

    console: {
      error(...datos) {
        errores.push(datos);
      },
    },

    alert(mensaje) {
      alertas.push(mensaje);
    },

    inicializarFechaEpp() {
      inicializaciones.push("fecha");
    },

    fecha: {},

    asignarFechaHoy() {},

    abrirSelectorFecha() {},

    validacionInformacionGeneral: {
      inicializar() {
        inicializaciones.push("validacion");
      },
    },

    contactosAprobacion: {
      inicializar() {
        inicializaciones.push("contactos");
      },

      validar() {},

      configurarAcciones() {},
    },

    inicializarEnvioEpp() {
      inicializaciones.push("envio");
    },

    documento: {},

    ventana: {},

    enviarInspeccionEpp() {},

    navegacion: {
      inicializar() {
        inicializaciones.push("navegacion");
      },

      actualizarPaso() {
        inicializaciones.push("actualizarPaso");
      },
    },

    salidaInspeccion: {
      inicializar() {
        inicializaciones.push("salida");
      },
    },

    trabajadoresManager: {
      init() {
        inicializaciones.push("trabajadores");
      },
    },

    obtenerValor() {
      return "";
    },
  });

  await controlador.inicializar();

  assert.deepEqual(inicializaciones, []);
  assert.equal(errores.length, 1);
  assert.match(alertas[0], /No fue posible cargar el catálogo/i);
});

test("inicializa el flujo EPP después de cargar el catálogo", async () => {
  const { crearInicializacionInspeccionEppController } =
    await cargarControlador();

  const orden = [];
  const configuracionesAcciones = [];
  let opcionesEnvio;

  const validarContactos = () => true;
  const enviarInspeccionEpp = async () => ({ ok: true });

  const controlador = crearInicializacionInspeccionEppController({
    async cargarCatalogoEpp() {
      orden.push("catalogo");
    },

    console: {
      error() {},
    },

    alert() {},

    inicializarFechaEpp() {
      orden.push("fecha");
    },

    fecha: {},

    asignarFechaHoy() {},

    abrirSelectorFecha() {},

    validacionInformacionGeneral: {
      inicializar() {
        orden.push("validacion");
      },
    },

    contactosAprobacion: {
      inicializar() {
        orden.push("contactos");
      },

      validar: validarContactos,

      configurarAcciones(datos) {
        configuracionesAcciones.push(datos);
      },
    },

    inicializarEnvioEpp(opciones) {
      orden.push("envio");
      opcionesEnvio = opciones;
    },

    documento: {},

    ventana: {},

    enviarInspeccionEpp,

    navegacion: {
      inicializar() {
        orden.push("navegacion");
      },

      actualizarPaso() {
        orden.push("actualizarPaso");
      },
    },

    salidaInspeccion: {
      inicializar() {
        orden.push("salida");
      },
    },

    trabajadoresManager: {
      init() {
        orden.push("trabajadores");
      },
    },

    obtenerValor(id) {
      return `valor-${id}`;
    },
  });

  await controlador.inicializar();

  assert.deepEqual(orden, [
    "catalogo",
    "fecha",
    "validacion",
    "contactos",
    "envio",
    "navegacion",
    "salida",
    "trabajadores",
    "actualizarPaso",
  ]);
  assert.equal(opcionesEnvio.enviarInspeccionEpp, enviarInspeccionEpp);
  assert.equal(opcionesEnvio.validarContactos, validarContactos);

  opcionesEnvio.prepararAccionesAprobacion({ token: "abc" });

  assert.deepEqual(configuracionesAcciones, [
    {
      token: "abc",
      tipoInspeccion: "EPP",
      sede: "valor-sedeOperacion",
      area: "valor-areaTrabajo",
    },
  ]);
});