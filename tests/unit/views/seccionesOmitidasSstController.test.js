const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const rutaModulo = path.resolve(
  __dirname,
  "../../../src/views/js/sst/controllers/seccionesOmitidasSst.controller.js",
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

function crearElemento({
  value = "",
} = {}) {
  const clases = new Set();
  const eventos = {};

  return {
    value,
    textContent: "",
    eventos,

    classList: {
      add(clase) {
        clases.add(clase);
      },

      remove(clase) {
        clases.delete(clase);
      },

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
    },

    addEventListener(tipo, callback) {
      eventos[tipo] = callback;
    },
  };
}

function crearEscenario(sede = "Urabá") {
  const seccion = {
    key: "extintores",
    step: 2,
    containerId: "extintores-container",
    btnOmitirId: "btn-omitir-extintores",
    mensajeId: "mensaje-omitido-extintores",
    btnAgregarId: "btn-agregar-extintor",
    siguientePaso: 3,
  };

  const elementos = {
    sedeOperacion: crearElemento({
      value: sede,
    }),
    "extintores-container": crearElemento(),
    "btn-omitir-extintores": crearElemento(),
    "mensaje-omitido-extintores": crearElemento(),
    "btn-agregar-extintor": crearElemento(),
  };

  return {
    elementos,
    seccion,

    dependencias: {
      documento: {
        getElementById(id) {
          return elementos[id] || null;
        },
      },

      seccionesOmitibles: [seccion],
    },
  };
}

test("esSedeUrabana acepta una sede de Urabá", async () => {
  const { crearSeccionesOmitidasSstController } =
    await moduloPromise;

  const escenario = crearEscenario(
    "Terminal Urabá",
  );

  const controlador =
    crearSeccionesOmitidasSstController(
      escenario.dependencias,
    );

  assert.equal(
    controlador.esSedeUrabana(),
    true,
  );
});

test("esSedeUrabana conserva la excepción de Santa Marta", async () => {
  const { crearSeccionesOmitidasSstController } =
    await moduloPromise;

  const escenario = crearEscenario(
    "Santa Marta",
  );

  const controlador =
    crearSeccionesOmitidasSstController(
      escenario.dependencias,
    );

  assert.equal(
    controlador.esSedeUrabana(),
    true,
  );
});

test("omitirSeccion actualiza el estado y la interfaz", async () => {
  const { crearSeccionesOmitidasSstController } =
    await moduloPromise;

  const escenario = crearEscenario();

  const controlador =
    crearSeccionesOmitidasSstController(
      escenario.dependencias,
    );

  controlador.omitirSeccion(
    escenario.seccion,
  );

  assert.equal(
    controlador.seccionesOmitidas.extintores,
    true,
  );

  assert.equal(
    escenario.elementos[
      "extintores-container"
    ].classList.contains("hidden"),
    true,
  );

  assert.equal(
    escenario.elementos[
      "btn-omitir-extintores"
    ].textContent,
    "Incluir sección",
  );
});

test("incluirSeccion restaura la sección", async () => {
  const { crearSeccionesOmitidasSstController } =
    await moduloPromise;

  const escenario = crearEscenario();

  const controlador =
    crearSeccionesOmitidasSstController(
      escenario.dependencias,
    );

  controlador.omitirSeccion(
    escenario.seccion,
  );

  controlador.incluirSeccion(
    escenario.seccion,
  );

  assert.equal(
    controlador.seccionesOmitidas.extintores,
    false,
  );

  assert.equal(
    escenario.elementos[
      "extintores-container"
    ].classList.contains("hidden"),
    false,
  );

  assert.equal(
    escenario.elementos[
      "btn-omitir-extintores"
    ].textContent,
    "Omitir sección",
  );
});

test("actualizarVisibilidadOmitir restaura omisiones en otra sede", async () => {
  const { crearSeccionesOmitidasSstController } =
    await moduloPromise;

  const escenario = crearEscenario("Urabá");

  const controlador =
    crearSeccionesOmitidasSstController(
      escenario.dependencias,
    );

  controlador.omitirSeccion(
    escenario.seccion,
  );

  escenario.elementos.sedeOperacion.value =
    "Bogotá";

  controlador.actualizarVisibilidadOmitir();

  assert.equal(
    controlador.seccionesOmitidas.extintores,
    false,
  );

  assert.equal(
    escenario.elementos[
      "btn-omitir-extintores"
    ].classList.contains("hidden"),
    true,
  );
});

test("inicializar registra eventos y navega al omitir", async () => {
  const { crearSeccionesOmitidasSstController } =
    await moduloPromise;

  const escenario = crearEscenario();

  const controlador =
    crearSeccionesOmitidasSstController(
      escenario.dependencias,
    );

  let pasoDestino = null;

  controlador.inicializar({
    navegarAlPaso(paso) {
      pasoDestino = paso;
    },
  });

  await escenario.elementos[
    "btn-omitir-extintores"
  ].eventos.click();

  assert.equal(pasoDestino, 3);

  assert.equal(
    controlador.seccionesOmitidas.extintores,
    true,
  );

  assert.equal(
    typeof escenario.elementos.sedeOperacion
      .eventos.change,
    "function",
  );
});