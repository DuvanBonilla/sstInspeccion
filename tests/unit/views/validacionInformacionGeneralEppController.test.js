const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const rutaModulo = path.resolve(
  __dirname,
  "../../../src/views/js/epp/controllers/validacionInformacionGeneralEpp.controller.js",
);

const codigoModulo = fs.readFileSync(rutaModulo, "utf8");

const moduloPromise = import(
  `data:text/javascript;base64,${Buffer.from(codigoModulo).toString("base64")}`,
);

const CAMPOS = [
  "fecha",
  "sedeOperacion",
  "areaTrabajo",
  "jefeResponsable",
  "cargoJefe",
  "responsableInspeccion",
  "cargoResponsable",
];

function crearCampo(
  value = "Valor válido",
  disabled = false,
) {
  const clases = new Set();
  const eventos = {};
  let enfocado = false;

  return {
    value,
    disabled,
    eventos,

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
      eventos[tipo] = callback;
    },

    focus() {
      enfocado = true;
    },

    fueEnfocado() {
      return enfocado;
    },
  };
}

function crearEscenario({
  valores = {},
  camposAusentes = [],
  camposDeshabilitados = [],
} = {}) {
  const campos = {};

  CAMPOS.forEach((id) => {
    if (camposAusentes.includes(id)) {
      return;
    }

    campos[id] = crearCampo(
      valores[id] ?? "Valor válido",
      camposDeshabilitados.includes(id),
    );
  });

  const botonSiguiente = {
    disabled: false,
  };

  const documento = {
    getElementById(id) {
      return campos[id] || null;
    },

    querySelector(selector) {
      if (
        selector ===
        '[data-step-panel="1"] [data-step-target="2"]'
      ) {
        return botonSiguiente;
      }

      return null;
    },
  };

  return {
    campos,
    botonSiguiente,
    documento,
  };
}

async function crearControlador(escenario) {
  const {
    crearValidacionInformacionGeneralEpp,
  } = await moduloPromise;

  return crearValidacionInformacionGeneralEpp({
    documento: escenario.documento,
  });
}

test("validar acepta todos los campos completos", async () => {
  const escenario = crearEscenario();
  const controlador =
    await crearControlador(escenario);

  assert.equal(controlador.validar(), true);
});

test("validar marca campos vacíos y enfoca el primero", async () => {
  const escenario = crearEscenario({
    valores: {
      fecha: "",
      areaTrabajo: "   ",
    },
  });

  const controlador =
    await crearControlador(escenario);

  assert.equal(controlador.validar(), false);

  assert.equal(
    escenario.campos.fecha.classList.contains(
      "campo-error",
    ),
    true,
  );

  assert.equal(
    escenario.campos.areaTrabajo.classList.contains(
      "campo-error",
    ),
    true,
  );

  assert.equal(
    escenario.campos.fecha.fueEnfocado(),
    true,
  );

  assert.equal(
    escenario.campos.areaTrabajo.fueEnfocado(),
    false,
  );
});

test("validar ignora campos que no existen", async () => {
  const escenario = crearEscenario({
    camposAusentes: ["cargoJefe"],
  });

  const controlador =
    await crearControlador(escenario);

  assert.equal(controlador.validar(), true);
});

test("actualizarBotonSiguiente bloquea cuando faltan datos", async () => {
  const escenario = crearEscenario({
    valores: {
      jefeResponsable: "",
    },
  });

  const controlador =
    await crearControlador(escenario);

  controlador.actualizarBotonSiguiente();

  assert.equal(
    escenario.botonSiguiente.disabled,
    true,
  );
});

test("actualizarBotonSiguiente ignora campos deshabilitados", async () => {
  const escenario = crearEscenario({
    valores: {
      cargoJefe: "",
    },
    camposDeshabilitados: ["cargoJefe"],
  });

  const controlador =
    await crearControlador(escenario);

  controlador.actualizarBotonSiguiente();

  assert.equal(
    escenario.botonSiguiente.disabled,
    false,
  );
});

test("inicializar registra eventos y limpia errores", async () => {
  const escenario = crearEscenario({
    valores: {
      fecha: "",
    },
  });

  escenario.campos.fecha.classList.add(
    "campo-error",
  );

  const controlador =
    await crearControlador(escenario);

  controlador.inicializar();

  assert.equal(
    typeof escenario.campos.fecha.eventos.input,
    "function",
  );

  assert.equal(
    typeof escenario.campos.fecha.eventos.change,
    "function",
  );

  assert.equal(
    escenario.botonSiguiente.disabled,
    true,
  );

  escenario.campos.fecha.value =
    "2026-09-14";

  escenario.campos.fecha.eventos.input();

  assert.equal(
    escenario.campos.fecha.classList.contains(
      "campo-error",
    ),
    false,
  );

  assert.equal(
    escenario.botonSiguiente.disabled,
    false,
  );
});