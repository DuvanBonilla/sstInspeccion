const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const rutaModulo = path.resolve(
  __dirname,
  "../../../src/views/js/epp/controllers/catalogoEppUi.controller.js",
);

const codigoModulo = fs.readFileSync(rutaModulo, "utf8");

const moduloPromise = import(
  `data:text/javascript;base64,${Buffer.from(codigoModulo).toString("base64")}`,
);

function crearClaseLista() {
  const clases = new Set();

  return {
    toggle(clase, activo) {
      if (activo) {
        clases.add(clase);
      } else {
        clases.delete(clase);
      }
    },

    contains(clase) {
      return clases.has(clase);
    },
  };
}

function crearEscenarioCatalogo({
  panelOculto = true,
  idsAgregados = [],
  idsOpciones = [],
} = {}) {
  const contador = {
    textContent: "",
  };

  const botonAgregar = {
    textContent: "",
    disabled: false,
  };

  const panel = {
    hidden: panelOculto,
  };

  const filas = idsAgregados.map((id) => ({
    dataset: {
      elementoEppId: String(id),
    },
  }));

  const opciones = idsOpciones.map((id) => {
    const opcion = {
      classList: crearClaseLista(),
    };

    const check = {
      dataset: {
        elementoEppId: String(id),
      },
      checked: true,
      disabled: false,

      closest(selector) {
        return selector === ".epp-catalogo-opcion"
          ? opcion
          : null;
      },
    };

    return {
      opcion,
      check,
    };
  });

  const card = {
    querySelector(selector) {
      const elementos = {
        ".epp-catalogo-contador": contador,
        ".epp-catalogo-agregar-seleccionados":
          botonAgregar,
        ".epp-catalogo-panel": panel,
      };

      return elementos[selector] || null;
    },

    querySelectorAll(selector) {
      if (
        selector ===
        ".epp-table tbody tr[data-elemento-epp-id]"
      ) {
        return filas;
      }

      if (selector === ".epp-catalogo-checkbox") {
        return opciones.map(({ check }) => check);
      }

      return [];
    },
  };

  return {
    card,
    contador,
    botonAgregar,
    panel,
    opciones,
  };
}

test("obtenerSeleccionCatalogoEpp conserva la selección de la tarjeta", async () => {
  const { obtenerSeleccionCatalogoEpp } =
    await moduloPromise;

  const card = {};

  const primeraSeleccion =
    obtenerSeleccionCatalogoEpp(card);

  primeraSeleccion.add("10");

  const segundaSeleccion =
    obtenerSeleccionCatalogoEpp(card);

  assert.strictEqual(
    primeraSeleccion,
    segundaSeleccion,
  );

  assert.deepEqual(
    [...segundaSeleccion],
    ["10"],
  );
});

test("actualizarSeleccionCatalogoEpp representa una selección vacía", async () => {
  const {
    obtenerSeleccionCatalogoEpp,
    actualizarSeleccionCatalogoEpp,
  } = await moduloPromise;

  const escenario = crearEscenarioCatalogo();

  obtenerSeleccionCatalogoEpp(escenario.card);

  actualizarSeleccionCatalogoEpp(escenario.card);

  assert.equal(
    escenario.contador.textContent,
    "0 elementos seleccionados",
  );

  assert.equal(
    escenario.botonAgregar.textContent,
    "Agregar seleccionados (0)",
  );

  assert.equal(
    escenario.botonAgregar.disabled,
    true,
  );
});

test("actualizarSeleccionCatalogoEpp representa una selección individual", async () => {
  const {
    obtenerSeleccionCatalogoEpp,
    actualizarSeleccionCatalogoEpp,
  } = await moduloPromise;

  const escenario = crearEscenarioCatalogo();

  obtenerSeleccionCatalogoEpp(escenario.card).add("12");

  actualizarSeleccionCatalogoEpp(escenario.card);

  assert.equal(
    escenario.contador.textContent,
    "1 elemento seleccionado",
  );

  assert.equal(
    escenario.botonAgregar.textContent,
    "Agregar seleccionados (1)",
  );

  assert.equal(
    escenario.botonAgregar.disabled,
    false,
  );
});

test("limpiarSeleccionCatalogoEpp elimina la selección temporal", async () => {
  const {
    obtenerSeleccionCatalogoEpp,
    limpiarSeleccionCatalogoEpp,
  } = await moduloPromise;

  const escenario = crearEscenarioCatalogo();

  const seleccion =
    obtenerSeleccionCatalogoEpp(escenario.card);

  seleccion.add("1");
  seleccion.add("2");

  limpiarSeleccionCatalogoEpp(escenario.card);

  assert.equal(
    obtenerSeleccionCatalogoEpp(escenario.card).size,
    0,
  );

  assert.equal(
    escenario.contador.textContent,
    "0 elementos seleccionados",
  );

  assert.equal(
    escenario.botonAgregar.disabled,
    true,
  );
});

test("sincronizarCatalogoEpp deshabilita los elementos ya agregados", async () => {
  const { sincronizarCatalogoEpp } =
    await moduloPromise;

  const escenario = crearEscenarioCatalogo({
    idsAgregados: ["10"],
    idsOpciones: ["10", "20"],
  });

  sincronizarCatalogoEpp(escenario.card);

  const opcionAgregada = escenario.opciones[0];
  const opcionDisponible = escenario.opciones[1];

  assert.equal(opcionAgregada.check.checked, false);
  assert.equal(opcionAgregada.check.disabled, true);

  assert.equal(
    opcionAgregada.opcion.classList.contains(
      "epp-catalogo-opcion-agregada",
    ),
    true,
  );

  assert.equal(opcionDisponible.check.checked, false);
  assert.equal(opcionDisponible.check.disabled, false);

  assert.equal(
    opcionDisponible.opcion.classList.contains(
      "epp-catalogo-opcion-agregada",
    ),
    false,
  );
});

test("alternarCatalogoEpp abre y cierra el panel", async () => {
  const { alternarCatalogoEpp } =
    await moduloPromise;

  const escenario = crearEscenarioCatalogo({
    panelOculto: true,
  });

  const boton = {
    textContent: "",
  };

  alternarCatalogoEpp(escenario.card, boton);

  assert.equal(escenario.panel.hidden, false);
  assert.equal(
    boton.textContent,
    "− Ocultar elementos EPP",
  );

  alternarCatalogoEpp(escenario.card, boton);

  assert.equal(escenario.panel.hidden, true);
  assert.equal(
    boton.textContent,
    "+ Agregar elementos EPP",
  );
});