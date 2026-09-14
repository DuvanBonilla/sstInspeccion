const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const archivo = path.resolve(
  "src/views/js/sst/controllers/salidaInspeccionSst.controller.js",
);

const codigo = fs.readFileSync(archivo, "utf8");

const moduloPromise = import(
  `data:text/javascript;base64,${Buffer.from(codigo).toString("base64")}`
);

function crearElemento() {
  const clases = new Set();
  const eventos = new Map();

  return {
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

    addEventListener(tipo, callback) {
      eventos.set(tipo, callback);
    },

    ejecutar(tipo, event = {}) {
      eventos.get(tipo)?.(event);
    },

    clases,
    eventos,
  };
}

function crearEscenario() {
  const modal = crearElemento();
  const botonSalir = crearElemento();
  const botonCancelarNo = crearElemento();
  const botonCancelarSi = crearElemento();
  const eventosDocumento = new Map();

  const elementos = new Map([
    ["cancelar-modal", modal],
    ["btn-salir", botonSalir],
    ["btn-cancelar-no", botonCancelarNo],
    ["btn-cancelar-si", botonCancelarSi],
  ]);

  const documento = {
    getElementById(id) {
      return elementos.get(id) || null;
    },

    addEventListener(tipo, callback) {
      eventosDocumento.set(tipo, callback);
    },
  };

  const ventana = {
    location: {
      href: "/inspeccion-sst",
    },
  };

  return {
    documento,
    ventana,
    modal,
    botonSalir,
    botonCancelarNo,
    botonCancelarSi,
    eventosDocumento,
  };
}

test("mostrar hace visible el modal de salida", async () => {
  const { crearSalidaInspeccionSstController } =
    await moduloPromise;

  const escenario = crearEscenario();

  const controlador = crearSalidaInspeccionSstController({
    documento: escenario.documento,
    ventana: escenario.ventana,
  });

  controlador.mostrar();

  assert.equal(
    escenario.modal.classList.contains("visible"),
    true,
  );
});

test("cerrar oculta el modal de salida", async () => {
  const { crearSalidaInspeccionSstController } =
    await moduloPromise;

  const escenario = crearEscenario();

  escenario.modal.classList.add("visible");

  const controlador = crearSalidaInspeccionSstController({
    documento: escenario.documento,
    ventana: escenario.ventana,
  });

  controlador.cerrar();

  assert.equal(
    escenario.modal.classList.contains("visible"),
    false,
  );
});

test("confirmarSalida navega hacia el inicio", async () => {
  const { crearSalidaInspeccionSstController } =
    await moduloPromise;

  const escenario = crearEscenario();

  const controlador = crearSalidaInspeccionSstController({
    documento: escenario.documento,
    ventana: escenario.ventana,
  });

  controlador.confirmarSalida();

  assert.equal(escenario.ventana.location.href, "/");
});

test("inicializar registra y ejecuta las acciones de los botones", async () => {
  const { crearSalidaInspeccionSstController } =
    await moduloPromise;

  const escenario = crearEscenario();

  const controlador = crearSalidaInspeccionSstController({
    documento: escenario.documento,
    ventana: escenario.ventana,
  });

  controlador.inicializar();

  escenario.botonSalir.ejecutar("click");

  assert.equal(
    escenario.modal.classList.contains("visible"),
    true,
  );

  escenario.botonCancelarNo.ejecutar("click");

  assert.equal(
    escenario.modal.classList.contains("visible"),
    false,
  );

  escenario.botonCancelarSi.ejecutar("click");

  assert.equal(escenario.ventana.location.href, "/");
});

test("el clic sobre el fondo del modal lo cierra", async () => {
  const { crearSalidaInspeccionSstController } =
    await moduloPromise;

  const escenario = crearEscenario();

  escenario.modal.classList.add("visible");

  const controlador = crearSalidaInspeccionSstController({
    documento: escenario.documento,
    ventana: escenario.ventana,
  });

  controlador.inicializar();

  escenario.modal.ejecutar("click", {
    target: escenario.modal,
  });

  assert.equal(
    escenario.modal.classList.contains("visible"),
    false,
  );
});

test("Escape cierra el modal cuando está visible", async () => {
  const { crearSalidaInspeccionSstController } =
    await moduloPromise;

  const escenario = crearEscenario();

  escenario.modal.classList.add("visible");

  const controlador = crearSalidaInspeccionSstController({
    documento: escenario.documento,
    ventana: escenario.ventana,
  });

  controlador.inicializar();

  escenario.eventosDocumento.get("keydown")({
    key: "Escape",
  });

  assert.equal(
    escenario.modal.classList.contains("visible"),
    false,
  );
});