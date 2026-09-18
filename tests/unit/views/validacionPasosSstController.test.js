const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const rutaModulo = path.resolve(
  __dirname,
  "../../../src/views/js/sst/controllers/validacionPasosSst.controller.js",
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
    add(nombre) {
      clases.add(nombre);
    },

    remove(nombre) {
      clases.delete(nombre);
    },

    contains(nombre) {
      return clases.has(nombre);
    },
  };
}

function crearCampo({
  value = "",
  disabled = false,
  opcional = false,
} = {}) {
  return {
    value,
    disabled,
    opcional,
    classList: crearClassList(),

    scrollIntoView() {},
  };
}

function crearPanel({
  inputs = [],
  selects = [],
  botonSiguiente = null,
} = {}) {
  const eventos = {};
  let resumen = null;

  const panel = {
    eventos,

    addEventListener(tipo, callback) {
      eventos[tipo] = callback;
    },

    querySelectorAll(selector) {
      if (selector === ".campo-error") {
        return [...inputs, ...selects].filter(
          (campo) =>
            campo.classList.contains(
              "campo-error",
            ),
        );
      }

      if (selector === "select") {
        return selects;
      }

      if (
        selector.includes(
          'input[type="text"]',
        )
      ) {
        return inputs;
      }

      return [];
    },

    querySelector(selector) {
      if (selector === ".validation-summary") {
        return resumen;
      }

      if (selector === ".campo-error") {
        return [...inputs, ...selects].find(
          (campo) =>
            campo.classList.contains(
              "campo-error",
            ),
        ) || null;
      }

      if (
        selector ===
        '[data-step-target="2"]'
      ) {
        return botonSiguiente;
      }

      return null;
    },

    appendChild(elemento) {
      resumen = elemento;
    },
  };

  return panel;
}

function crearEscenario({
  inputs = [],
  selects = [],
  omitida = false,
  tieneItems = true,
  botonSiguiente = null,
} = {}) {
  const panel = crearPanel({
    inputs,
    selects,
    botonSiguiente,
  });

  const mensaje = {
    textContent: "",
  };

  const botonEnviar = {
    disabled: false,
  };

  const documento = {
    querySelector(selector) {
      if (
        selector.includes(
          "data-step-panel",
        )
      ) {
        return panel;
      }

      return null;
    },

    getElementById(id) {
      if (id === "msg") {
        return mensaje;
      }

      if (id === "btn-onedrive") {
        return botonEnviar;
      }

      return null;
    },

    createElement() {
      return {
        className: "",
        innerHTML: "",
        remove() {},
      };
    },
  };

  return {
    botonEnviar,
    botonSiguiente,
    mensaje,
    panel,

    dependencias: {
      documento,

      seccionesOmitibles: [
        {
          step: 2,
          key: "extintores",
        },
      ],

      seccionesOmitidas: {
        extintores: omitida,
      },

      esCampoOpcional(campo) {
        return campo.opcional;
      },

      tieneItemsInspeccion() {
        return tieneItems;
      },
    },
  };
}

test("validarPaso acepta un panel inexistente", async () => {
  const { crearValidacionPasosSst } =
    await moduloPromise;

  const controlador =
    crearValidacionPasosSst({
      documento: {
        querySelector() {
          return null;
        },
      },
      seccionesOmitibles: [],
      seccionesOmitidas: {},
      esCampoOpcional() {
        return false;
      },
      tieneItemsInspeccion() {
        return true;
      },
    });

  assert.equal(
    controlador.validarPaso(1),
    true,
  );
});

test("validarPaso marca los campos obligatorios vacíos", async () => {
  const { crearValidacionPasosSst } =
    await moduloPromise;

  const campo = crearCampo();

  const escenario = crearEscenario({
    inputs: [campo],
  });

  const controlador =
    crearValidacionPasosSst(
      escenario.dependencias,
    );

  assert.equal(
    controlador.validarPaso(1),
    false,
  );

  assert.equal(
    campo.classList.contains("campo-error"),
    true,
  );
});

test("validarPaso ignora campos opcionales y deshabilitados", async () => {
  const { crearValidacionPasosSst } =
    await moduloPromise;

  const escenario = crearEscenario({
    inputs: [
      crearCampo({
        opcional: true,
      }),
      crearCampo({
        disabled: true,
      }),
    ],
  });

  const controlador =
    crearValidacionPasosSst(
      escenario.dependencias,
    );

  assert.equal(
    controlador.validarPaso(1),
    true,
  );
});

test("validarPaso acepta una sección omitida", async () => {
  const { crearValidacionPasosSst } =
    await moduloPromise;

  const escenario = crearEscenario({
    omitida: true,
    inputs: [crearCampo()],
  });

  const controlador =
    crearValidacionPasosSst(
      escenario.dependencias,
    );

  assert.equal(
    controlador.validarPaso(2),
    true,
  );
});

test("validarPaso impide enviar sin elementos", async () => {
  const { crearValidacionPasosSst } =
    await moduloPromise;

  const escenario = crearEscenario({
    tieneItems: false,
  });

  const controlador =
    crearValidacionPasosSst(
      escenario.dependencias,
    );

  assert.equal(
    controlador.validarPaso(7),
    false,
  );

  assert.equal(
    escenario.botonEnviar.disabled,
    true,
  );

  assert.match(
    escenario.mensaje.textContent,
    /ningún ítem/,
  );
});

test("actualizarBotonSiguienteGeneral refleja los campos completos", async () => {
  const { crearValidacionPasosSst } =
    await moduloPromise;

  const botonSiguiente = {
    disabled: true,
  };

  const escenario = crearEscenario({
    botonSiguiente,
    inputs: [
      crearCampo({
        value: "Completo",
      }),
    ],
  });

  const controlador =
    crearValidacionPasosSst(
      escenario.dependencias,
    );

  controlador.actualizarBotonSiguienteGeneral();

  assert.equal(
    botonSiguiente.disabled,
    false,
  );
});

test("inicializar registra los eventos del primer panel", async () => {
  const { crearValidacionPasosSst } =
    await moduloPromise;

  const escenario = crearEscenario({
    botonSiguiente: {
      disabled: false,
    },
  });

  const controlador =
    crearValidacionPasosSst(
      escenario.dependencias,
    );

  controlador.inicializar();

  assert.equal(
    typeof escenario.panel.eventos.input,
    "function",
  );

  assert.equal(
    typeof escenario.panel.eventos.change,
    "function",
  );
});