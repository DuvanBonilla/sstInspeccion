const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const rutaModulo = path.resolve(
  __dirname,
  "../../../src/views/js/epp/controllers/navegacionInspeccionEpp.controller.js",
);

const codigoModulo = fs.readFileSync(rutaModulo, "utf8");

const moduloPromise = import(
  `data:text/javascript;base64,${Buffer.from(codigoModulo).toString("base64")}`,
);

function crearElemento(dataset = {}) {
  const clases = new Set();
  const eventos = {};

  return {
    dataset,
    eventos,
    clases,

    classList: {
      toggle(clase, activar) {
        if (activar) {
          clases.add(clase);
        } else {
          clases.delete(clase);
        }
      },
    },

    addEventListener(tipo, callback) {
      eventos[tipo] = callback;
    },
  };
}

function crearEscenario({
  generalValido = true,
  trabajadoresValidos = true,
} = {}) {
  const paneles = [1, 2, 3].map((paso) =>
    crearElemento({
      stepPanel: String(paso),
    }),
  );

  const indicadores = [1, 2, 3].map((paso) =>
    crearElemento({
      stepIndicator: String(paso),
    }),
  );

  const botones = [1, 2, 3].map((paso) =>
    crearElemento({
      stepTarget: String(paso),
    }),
  );

  const desplazamientos = [];
  let resumenesPreparados = 0;

  return {
    paneles,
    indicadores,
    botones,
    desplazamientos,

    documento: {
      querySelectorAll(selector) {
        if (selector === "[data-step-panel]") {
          return paneles;
        }

        if (selector === "[data-step-indicator]") {
          return indicadores;
        }

        if (selector === "[data-step-target]") {
          return botones;
        }

        return [];
      },
    },

    ventana: {
      scrollTo(opciones) {
        desplazamientos.push(opciones);
      },
    },

    validarInformacionGeneral() {
      return generalValido;
    },

    validarTrabajadores() {
      return trabajadoresValidos;
    },

    prepararResumen() {
      resumenesPreparados += 1;
    },

    obtenerResumenesPreparados() {
      return resumenesPreparados;
    },
  };
}

async function crearNavegacion(escenario) {
  const { crearNavegacionInspeccionEpp } =
    await moduloPromise;

  return crearNavegacionInspeccionEpp({
    documento: escenario.documento,
    ventana: escenario.ventana,
    totalPasos: 3,
    validarInformacionGeneral:
      escenario.validarInformacionGeneral,
    validarTrabajadores:
      escenario.validarTrabajadores,
    prepararResumen:
      escenario.prepararResumen,
  });
}

test("actualizarPaso representa el paso inicial", async () => {
  const escenario = crearEscenario();
  const navegacion =
    await crearNavegacion(escenario);

  navegacion.actualizarPaso();

  assert.equal(
    escenario.paneles[0].clases.has("hidden"),
    false,
  );

  assert.equal(
    escenario.paneles[1].clases.has("hidden"),
    true,
  );

  assert.equal(
    escenario.indicadores[0].clases.has("active"),
    true,
  );

  assert.deepEqual(
    escenario.desplazamientos,
    [
      {
        top: 0,
        behavior: "smooth",
      },
    ],
  );
});

test("navegarAPaso rechaza destinos fuera del rango", async () => {
  const escenario = crearEscenario();
  const navegacion =
    await crearNavegacion(escenario);

  navegacion.navegarAPaso(0);
  navegacion.navegarAPaso(4);

  assert.equal(
    navegacion.obtenerPasoActual(),
    1,
  );
});

test("navegarAPaso exige información general válida", async () => {
  const escenario = crearEscenario({
    generalValido: false,
  });

  const navegacion =
    await crearNavegacion(escenario);

  navegacion.navegarAPaso(2);

  assert.equal(
    navegacion.obtenerPasoActual(),
    1,
  );
});

test("navegarAPaso exige trabajadores válidos", async () => {
  const escenario = crearEscenario({
    trabajadoresValidos: false,
  });

  const navegacion =
    await crearNavegacion(escenario);

  navegacion.navegarAPaso(2);
  navegacion.navegarAPaso(3);

  assert.equal(
    navegacion.obtenerPasoActual(),
    2,
  );
});

test("navegarAPaso prepara el resumen al llegar al tercer paso", async () => {
  const escenario = crearEscenario();
  const navegacion =
    await crearNavegacion(escenario);

  navegacion.navegarAPaso(2);
  navegacion.navegarAPaso(3);

  assert.equal(
    navegacion.obtenerPasoActual(),
    3,
  );

  assert.equal(
    escenario.obtenerResumenesPreparados(),
    1,
  );

  assert.equal(
    escenario.indicadores[0].clases.has("completed"),
    true,
  );

  assert.equal(
    escenario.indicadores[2].clases.has("active"),
    true,
  );
});

test("inicializar registra la navegación de los botones", async () => {
  const escenario = crearEscenario();
  const navegacion =
    await crearNavegacion(escenario);

  navegacion.inicializar();

  assert.equal(
    typeof escenario.botones[1].eventos.click,
    "function",
  );

  escenario.botones[1].eventos.click();

  assert.equal(
    navegacion.obtenerPasoActual(),
    2,
  );
});