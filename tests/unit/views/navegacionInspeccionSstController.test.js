const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const rutaModulo = path.resolve(
  __dirname,
  "../../../src/views/js/sst/controllers/navegacionInspeccionSst.controller.js",
);

const codigoModulo = fs.readFileSync(
  rutaModulo,
  "utf8",
);

const moduloPromise = import(
  `data:text/javascript;base64,${
    Buffer.from(codigoModulo).toString("base64")
  }`
);

function crearClassList() {
  const clases = new Set();

  return {
    clases,

    add(...nombres) {
      nombres.forEach((nombre) => clases.add(nombre));
    },

    remove(...nombres) {
      nombres.forEach((nombre) => clases.delete(nombre));
    },

    toggle(nombre, activo) {
      if (activo) {
        clases.add(nombre);
      } else {
        clases.delete(nombre);
      }
    },

    contains(nombre) {
      return clases.has(nombre);
    },
  };
}

function crearElemento(atributos = {}) {
  const eventos = {};

  return {
    classList: crearClassList(),

    getAttribute(nombre) {
      return atributos[nombre] ?? null;
    },

    addEventListener(tipo, callback) {
      eventos[tipo] = callback;
    },

    eventos,
  };
}

function crearEscenario({
  validacion = true,
} = {}) {
  const paneles = [1, 2, 3].map((paso) => {
    const panel = crearElemento({
      "data-step-panel": String(paso),
    });

    panel.querySelector = () => null;
    panel.querySelectorAll = () => [];

    return panel;
  });

  const indicadores = [1, 2, 3].map((paso) =>
    crearElemento({
      "data-step-indicator": String(paso),
    }),
  );

  const botones = [2, 3].map((paso) =>
    crearElemento({
      "data-step-target": String(paso),
    }),
  );

  const documento = {
    querySelector(selector) {
      const coincidencia = selector.match(
        /data-step-panel="(\d+)"/,
      );

      if (!coincidencia) {
        return null;
      }

      return paneles[
        Number(coincidencia[1]) - 1
      ];
    },

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
  };

  const scrolls = [];
  let resumenes = 0;
  let actualizacionesOmitir = 0;

  return {
    botones,
    indicadores,
    paneles,

    dependencias: {
      documento,

      ventana: {
        scrollTo(opciones) {
          scrolls.push(opciones);
        },
      },

      totalPasos: 3,

      validarPaso() {
        return validacion;
      },

      actualizarVisibilidadOmitir() {
        actualizacionesOmitir++;
      },

      prepararResumen() {
        resumenes++;
      },
    },

    obtenerEstado() {
      return {
        actualizacionesOmitir,
        resumenes,
        scrolls,
      };
    },
  };
}

test("inicia en el primer paso", async () => {
  const { crearNavegacionInspeccionSst } =
    await moduloPromise;

  const escenario = crearEscenario();

  const controlador =
    crearNavegacionInspeccionSst(
      escenario.dependencias,
    );

  assert.equal(
    controlador.obtenerPasoActual(),
    1,
  );
});

test("impide avanzar cuando el paso actual es inválido", async () => {
  const { crearNavegacionInspeccionSst } =
    await moduloPromise;

  const escenario = crearEscenario({
    validacion: false,
  });

  const controlador =
    crearNavegacionInspeccionSst(
      escenario.dependencias,
    );

  assert.equal(controlador.irPaso(2), false);
  assert.equal(
    controlador.obtenerPasoActual(),
    1,
  );
});

test("actualiza paneles e indicadores al navegar", async () => {
  const { crearNavegacionInspeccionSst } =
    await moduloPromise;

  const escenario = crearEscenario();

  const controlador =
    crearNavegacionInspeccionSst(
      escenario.dependencias,
    );

  controlador.irPaso(2);

  assert.equal(
    escenario.paneles[0].classList.contains("hidden"),
    true,
  );

  assert.equal(
    escenario.paneles[1].classList.contains("hidden"),
    false,
  );

  assert.equal(
    escenario.indicadores[0].classList.contains("done"),
    true,
  );

  assert.equal(
    escenario.indicadores[1].classList.contains("active"),
    true,
  );
});

test("prepara el resumen al llegar al último paso", async () => {
  const { crearNavegacionInspeccionSst } =
    await moduloPromise;

  const escenario = crearEscenario();

  const controlador =
    crearNavegacionInspeccionSst(
      escenario.dependencias,
    );

  controlador.irPaso(3);

  assert.equal(
    escenario.obtenerEstado().resumenes,
    1,
  );
});

test("inicializar registra los eventos de navegación", async () => {
  const { crearNavegacionInspeccionSst } =
    await moduloPromise;

  const escenario = crearEscenario();

  const controlador =
    crearNavegacionInspeccionSst(
      escenario.dependencias,
    );

  controlador.inicializar();

  assert.equal(
    typeof escenario.botones[0].eventos.click,
    "function",
  );

  assert.equal(
    typeof escenario.indicadores[0].eventos.click,
    "function",
  );
});