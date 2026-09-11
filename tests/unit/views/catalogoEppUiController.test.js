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

function crearClassListEventos(clasesIniciales = []) {
  const clases = new Set(clasesIniciales);

  return {
    add(clase) {
      clases.add(clase);
    },

    remove(clase) {
      clases.delete(clase);
    },

    contains(clase) {
      return clases.has(clase);
    },
  };
}

function crearEscenarioEventosCatalogo({
  resultadosOcultos = false,
} = {}) {
  const eventosContainer = {};
  const eventosDocumento = {};

  const atributosBuscador = new Map();

  const crearOpcion = (activa = false) => ({
    classList: crearClassListEventos(
      activa ? ["epp-combobox-opcion-activa"] : [],
    ),

    clicks: 0,
    desplazamientos: [],

    click() {
      this.clicks += 1;
    },

    scrollIntoView(opciones) {
      this.desplazamientos.push(opciones);
    },
  });

  const opciones = [
    crearOpcion(),
    crearOpcion(),
  ];

  let card;

  const buscador = {
    value: "casco",

    closest(selector) {
      if (selector === ".epp-catalogo-buscador") {
        return buscador;
      }

      if (selector === ".trabajador-card") {
        return card;
      }

      return null;
    },

    setAttribute(nombre, valor) {
      atributosBuscador.set(nombre, valor);
    },
  };

  const resultados = {
    hidden: resultadosOcultos,
    innerHTML: "<div>Resultados</div>",

    querySelectorAll(selector) {
      return selector === ".epp-combobox-opcion"
        ? opciones
        : [];
    },

    closest(selector) {
      return selector === ".trabajador-card"
        ? card
        : null;
    },
  };

  card = {
    querySelector(selector) {
      if (selector === ".epp-catalogo-resultados") {
        return resultados;
      }

      if (selector === ".epp-catalogo-buscador") {
        return buscador;
      }

      return null;
    },
  };

  const container = {
    addEventListener(tipo, callback) {
      eventosContainer[tipo] = callback;
    },

    querySelectorAll(selector) {
      return selector === ".epp-catalogo-resultados"
        ? [resultados]
        : [];
    },
  };

  const documento = {
    addEventListener(tipo, callback) {
      eventosDocumento[tipo] = callback;
    },
  };

  return {
    container,
    documento,
    card,
    buscador,
    resultados,
    opciones,
    atributosBuscador,
    eventosContainer,
    eventosDocumento,
  };
}

test("registrarEventosCatalogoEpp registra los eventos esperados", async () => {
  const { registrarEventosCatalogoEpp } =
    await moduloPromise;

  const escenario = crearEscenarioEventosCatalogo();

  registrarEventosCatalogoEpp({
    container: escenario.container,
    documento: escenario.documento,
    filtrarElementosEpp() {},
  });

  assert.deepEqual(
    Object.keys(escenario.eventosContainer).sort(),
    ["focusin", "input", "keydown"],
  );

  assert.equal(
    typeof escenario.eventosDocumento.click,
    "function",
  );
});

test("los eventos de foco y escritura solicitan filtrar el catálogo", async () => {
  const { registrarEventosCatalogoEpp } =
    await moduloPromise;

  const escenario = crearEscenarioEventosCatalogo();
  const llamadas = [];

  registrarEventosCatalogoEpp({
    container: escenario.container,
    documento: escenario.documento,

    filtrarElementosEpp(card, termino) {
      llamadas.push({
        card,
        termino,
      });
    },
  });

  const event = {
    target: escenario.buscador,
  };

  escenario.eventosContainer.focusin(event);
  escenario.eventosContainer.input(event);

  assert.equal(llamadas.length, 2);

  assert.strictEqual(
    llamadas[0].card,
    escenario.card,
  );

  assert.equal(llamadas[0].termino, "casco");

  assert.strictEqual(
    llamadas[1].card,
    escenario.card,
  );

  assert.equal(llamadas[1].termino, "casco");
});

test("la flecha abajo activa y desplaza una opción del catálogo", async () => {
  const { registrarEventosCatalogoEpp } =
    await moduloPromise;

  const escenario = crearEscenarioEventosCatalogo();

  registrarEventosCatalogoEpp({
    container: escenario.container,
    documento: escenario.documento,
    filtrarElementosEpp() {},
  });

  let prevenido = false;

  escenario.eventosContainer.keydown({
    target: escenario.buscador,
    key: "ArrowDown",

    preventDefault() {
      prevenido = true;
    },
  });

  assert.equal(prevenido, true);

  assert.equal(
    escenario.opciones[0].classList.contains(
      "epp-combobox-opcion-activa",
    ),
    true,
  );

  assert.deepEqual(
    escenario.opciones[0].desplazamientos,
    [{ block: "nearest" }],
  );
});

test("Enter selecciona una opción y Escape cierra los resultados", async () => {
  const { registrarEventosCatalogoEpp } =
    await moduloPromise;

  const escenario = crearEscenarioEventosCatalogo();

  registrarEventosCatalogoEpp({
    container: escenario.container,
    documento: escenario.documento,
    filtrarElementosEpp() {},
  });

  escenario.eventosContainer.keydown({
    target: escenario.buscador,
    key: "Enter",
    preventDefault() {},
  });

  assert.equal(escenario.opciones[0].clicks, 1);

  escenario.eventosContainer.keydown({
    target: escenario.buscador,
    key: "Escape",
    preventDefault() {},
  });

  assert.equal(escenario.resultados.hidden, true);
  assert.equal(escenario.resultados.innerHTML, "");

  assert.equal(
    escenario.atributosBuscador.get("aria-expanded"),
    "false",
  );
});

test("el clic fuera del catálogo cierra los resultados abiertos", async () => {
  const { registrarEventosCatalogoEpp } =
    await moduloPromise;

  const escenario = crearEscenarioEventosCatalogo();

  registrarEventosCatalogoEpp({
    container: escenario.container,
    documento: escenario.documento,
    filtrarElementosEpp() {},
  });

  const elementoExterno = {
    closest() {
      return null;
    },
  };

  escenario.eventosDocumento.click({
    target: elementoExterno,
  });

  assert.equal(escenario.resultados.hidden, true);
  assert.equal(escenario.resultados.innerHTML, "");

  assert.equal(
    escenario.atributosBuscador.get("aria-expanded"),
    "false",
  );
});

function crearEscenarioMutacionCatalogo({
  idsActuales = [],
  cantidadFilas = idsActuales.length,
} = {}) {
  const inserciones = [];

  const contador = {
    textContent: "",
  };

  const botonAgregar = {
    textContent: "",
    disabled: false,
  };

  const panel = {
    hidden: false,
  };

  const botonCatalogo = {
    textContent: "− Ocultar elementos EPP",
  };

  const filasIds = idsActuales.map((id) => ({
    dataset: {
      elementoEppId: String(id),
    },
  }));

  const filasEvaluacion = Array.from(
    { length: cantidadFilas },
    (_, indice) => ({
      dataset: {
        elementoEppId:
          String(idsActuales[indice] || indice + 1),
      },
    }),
  );

  const tbody = {
    querySelectorAll(selector) {
      if (selector === "tr[data-elemento-epp-id]") {
        return filasIds;
      }

      if (selector === "tr[data-elemento]") {
        return filasEvaluacion;
      }

      return [];
    },

    insertAdjacentHTML(posicion, html) {
      inserciones.push({
        posicion,
        html,
      });
    },
  };

  const card = {
    querySelector(selector) {
      const elementos = {
        ".epp-table tbody": tbody,
        ".epp-catalogo-contador": contador,
        ".epp-catalogo-agregar-seleccionados":
          botonAgregar,
        ".epp-catalogo-panel": panel,
        ".btn-toggle-catalogo-epp": botonCatalogo,
      };

      return elementos[selector] || null;
    },

    querySelectorAll(selector) {
      if (
        selector ===
        ".epp-table tbody tr[data-elemento-epp-id]"
      ) {
        return filasIds;
      }

      if (selector === ".epp-catalogo-checkbox") {
        return [];
      }

      return [];
    },
  };

  return {
    card,
    tbody,
    panel,
    botonCatalogo,
    contador,
    botonAgregar,
    inserciones,
  };
}

test("agregarElementosSeleccionados incorpora las filas seleccionadas", async () => {
  const {
    agregarElementosSeleccionados,
    obtenerSeleccionCatalogoEpp,
  } = await moduloPromise;

  const escenario = crearEscenarioMutacionCatalogo({
    idsActuales: ["10"],
    cantidadFilas: 1,
  });

  obtenerSeleccionCatalogoEpp(
    escenario.card,
  ).add("20");

  const llamadasPlantilla = [];

  agregarElementosSeleccionados(escenario.card, {
    elementosEpp: [
      {
        id: 20,
        nombre: "Guantes",
      },
    ],

    crearFilaEpp(datos, indice, valores) {
      llamadasPlantilla.push({
        datos,
        indice,
        valores,
      });

      return "<tr>Guantes</tr>";
    },

    valoresCalificacion: ["B", "R", "M", "NA"],
  });

  assert.deepEqual(llamadasPlantilla, [
    {
      datos: {
        elementoEppId: 20,
        elemento: "Guantes",
      },
      indice: 1,
      valores: ["B", "R", "M", "NA"],
    },
  ]);

  assert.deepEqual(escenario.inserciones, [
    {
      posicion: "beforeend",
      html: "<tr>Guantes</tr>",
    },
  ]);

  assert.equal(
    obtenerSeleccionCatalogoEpp(escenario.card).size,
    0,
  );

  assert.equal(escenario.panel.hidden, true);

  assert.equal(
    escenario.botonCatalogo.textContent,
    "+ Agregar elementos EPP",
  );
});

test("agregarElementosSeleccionados evita elementos duplicados", async () => {
  const {
    agregarElementosSeleccionados,
    obtenerSeleccionCatalogoEpp,
  } = await moduloPromise;

  const escenario = crearEscenarioMutacionCatalogo({
    idsActuales: ["10"],
    cantidadFilas: 1,
  });

  obtenerSeleccionCatalogoEpp(
    escenario.card,
  ).add("10");

  agregarElementosSeleccionados(escenario.card, {
    elementosEpp: [
      {
        id: 10,
        nombre: "Casco",
      },
    ],

    crearFilaEpp() {
      return "<tr>Casco</tr>";
    },

    valoresCalificacion: ["B", "R", "M", "NA"],
  });

  assert.equal(escenario.inserciones.length, 0);

  assert.equal(
    obtenerSeleccionCatalogoEpp(escenario.card).size,
    0,
  );
});

test("eliminarElementoEpp conserva al menos un elemento", async () => {
  const { eliminarElementoEpp } =
    await moduloPromise;

  const escenario = crearEscenarioMutacionCatalogo({
    idsActuales: ["10"],
    cantidadFilas: 1,
  });

  let mensaje = "";
  let filaEliminada = false;

  const fila = {
    nextElementSibling: null,

    remove() {
      filaEliminada = true;
    },
  };

  eliminarElementoEpp(
    escenario.card,
    fila,
    (valor) => {
      mensaje = valor;
    },
  );

  assert.equal(
    mensaje,
    "Cada trabajador debe tener al menos un elemento EPP.",
  );

  assert.equal(filaEliminada, false);
});

test("eliminarElementoEpp elimina el elemento y su plan asociado", async () => {
  const { eliminarElementoEpp } =
    await moduloPromise;

  const escenario = crearEscenarioMutacionCatalogo({
    idsActuales: ["10", "20"],
    cantidadFilas: 2,
  });

  let filaEliminada = false;
  let planEliminado = false;

  const filaPlan = {
    classList: {
      contains(clase) {
        return clase === "epp-plan-row";
      },
    },

    remove() {
      planEliminado = true;
    },
  };

  const fila = {
    nextElementSibling: filaPlan,

    remove() {
      filaEliminada = true;
    },
  };

  eliminarElementoEpp(
    escenario.card,
    fila,
    () => {},
  );

  assert.equal(planEliminado, true);
  assert.equal(filaEliminada, true);
});