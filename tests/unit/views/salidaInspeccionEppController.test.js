const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const rutaModulo = path.resolve(
  __dirname,
  "../../../src/views/js/epp/controllers/salidaInspeccionEpp.controller.js",
);

const codigoModulo = fs.readFileSync(
  rutaModulo,
  "utf8",
);

const moduloPromise = import(
  `data:text/javascript;base64,${Buffer.from(codigoModulo).toString("base64")}`,
);

function crearElemento() {
  const eventos = {};
  const clases = new Set();

  return {
    eventos,

    addEventListener(tipo, callback) {
      eventos[tipo] = callback;
    },

    classList: {
      add(clase) {
        clases.add(clase);
      },

      remove(clase) {
        clases.delete(clase);
      },

      contains(clase) {
        return clases.has(clase);
      },
    },
  };
}

function crearEscenario({
  elementosAusentes = [],
} = {}) {
  const ids = [
    "btn-salir",
    "btn-logo-inicio",
    "cancelar-modal",
    "btn-cancelar-no",
    "btn-cancelar-si",
    "btn-modal-inicio",
    "btn-modal-nueva",
  ];

  const elementos = {};

  ids.forEach((id) => {
    if (!elementosAusentes.includes(id)) {
      elementos[id] = crearElemento();
    }
  });

  const eventosDocumento = {};

  const documento = {
    getElementById(id) {
      return elementos[id] || null;
    },

    addEventListener(tipo, callback) {
      eventosDocumento[tipo] = callback;
    },
  };

  const ventana = {
    location: {
      href: "/inspeccion-epp",
    },
  };

  return {
    elementos,
    eventosDocumento,
    documento,
    ventana,
  };
}

async function crearControlador(escenario) {
  const {
    crearSalidaInspeccionEppController,
  } = await moduloPromise;

  return crearSalidaInspeccionEppController({
    documento: escenario.documento,
    ventana: escenario.ventana,
  });
}

test("inicializar registra los eventos de salida", async () => {
  const escenario = crearEscenario();

  const controlador =
    await crearControlador(escenario);

  controlador.inicializar();

  assert.equal(
    typeof escenario.elementos[
      "btn-salir"
    ].eventos.click,
    "function",
  );

  assert.equal(
    typeof escenario.elementos[
      "btn-logo-inicio"
    ].eventos.click,
    "function",
  );

  assert.equal(
    typeof escenario.eventosDocumento.keydown,
    "function",
  );
});

test("los controles de salida abren el modal", async () => {
  const escenario = crearEscenario();

  const controlador =
    await crearControlador(escenario);

  controlador.inicializar();

  escenario.elementos[
    "btn-salir"
  ].eventos.click();

  assert.equal(
    escenario.elementos[
      "cancelar-modal"
    ].classList.contains("visible"),
    true,
  );

  controlador.cerrarModalSalida();

  escenario.elementos[
    "btn-logo-inicio"
  ].eventos.click();

  assert.equal(
    escenario.elementos[
      "cancelar-modal"
    ].classList.contains("visible"),
    true,
  );
});

test("continuar trabajando cierra el modal", async () => {
  const escenario = crearEscenario();

  const controlador =
    await crearControlador(escenario);

  controlador.inicializar();
  controlador.abrirModalSalida();

  escenario.elementos[
    "btn-cancelar-no"
  ].eventos.click();

  assert.equal(
    escenario.elementos[
      "cancelar-modal"
    ].classList.contains("visible"),
    false,
  );
});

test("el fondo y Escape cierran el modal", async () => {
  const escenario = crearEscenario();

  const controlador =
    await crearControlador(escenario);

  controlador.inicializar();
  controlador.abrirModalSalida();

  const modal =
    escenario.elementos["cancelar-modal"];

  modal.eventos.click({
    target: modal,
  });

  assert.equal(
    modal.classList.contains("visible"),
    false,
  );

  controlador.abrirModalSalida();

  escenario.eventosDocumento.keydown({
    key: "Escape",
  });

  assert.equal(
    modal.classList.contains("visible"),
    false,
  );
});

test("confirmar salida dirige al inicio", async () => {
  const escenario = crearEscenario();

  const controlador =
    await crearControlador(escenario);

  controlador.inicializar();

  escenario.elementos[
    "btn-cancelar-si"
  ].eventos.click();

  assert.equal(
    escenario.ventana.location.href,
    "/",
  );
});

test("las acciones del modal de éxito conservan sus destinos", async () => {
  const escenario = crearEscenario();

  const controlador =
    await crearControlador(escenario);

  controlador.inicializar();

  escenario.elementos[
    "btn-modal-inicio"
  ].eventos.click();

  assert.equal(
    escenario.ventana.location.href,
    "/",
  );

  escenario.elementos[
    "btn-modal-nueva"
  ].eventos.click();

  assert.equal(
    escenario.ventana.location.href,
    "/inspeccion-epp",
  );
});

test("inicializar admite controles ausentes", async () => {
  const escenario = crearEscenario({
    elementosAusentes: [
      "btn-salir",
      "btn-logo-inicio",
      "cancelar-modal",
      "btn-cancelar-no",
      "btn-cancelar-si",
      "btn-modal-inicio",
      "btn-modal-nueva",
    ],
  });

  const controlador =
    await crearControlador(escenario);

  assert.doesNotThrow(() => {
    controlador.inicializar();
    controlador.abrirModalSalida();
    controlador.cerrarModalSalida();
  });
});