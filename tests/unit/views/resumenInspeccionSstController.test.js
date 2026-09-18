const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const archivo = path.resolve(
  "src/views/js/sst/controllers/resumenInspeccionSst.controller.js",
);

const codigo = fs.readFileSync(archivo, "utf8");

const moduloPromise = import(
  `data:text/javascript;base64,${Buffer.from(codigo).toString("base64")}`
);

function crearDocumento(valores = {}) {
  const elementos = new Map();

  Object.entries(valores).forEach(([id, value]) => {
    elementos.set(id, {
      value,
      textContent: "",
      innerHTML: "",
      disabled: false,
    });
  });

  return {
    elementos,

    getElementById(id) {
      return elementos.get(id) || null;
    },
  };
}

function crearEscenario({
  seccionesOmitidas = {},
  cantidades = {},
} = {}) {
  const documento = crearDocumento({
    fecha: "2026-09-14",
    sedeOperacion: "Urabá",
    areaTrabajo: "Operaciones",
    jefeResponsable: "Jefe",
    cargoJefe: "Coordinador",
    responsableInspeccion: "Inspector",
    cargoResponsable: "SST",
    "resumen-fecha": "",
    "resumen-sede": "",
    "resumen-area": "",
    "resumen-jefe": "",
    "resumen-cargo-jefe": "",
    "resumen-responsable": "",
    "resumen-cargo-responsable": "",
    "resumen-secciones": "",
    msg: "",
    "btn-onedrive": "",
  });

  const crearElementos = (cantidad = 0) =>
    Array.from({ length: cantidad }, () => ({}));

  return {
    documento,

    dependencias: {
      documento,

      seccionesOmitidas: {
        extintores: false,
        camillas: false,
        senalizaciones: false,
        botiquines: false,
        equiposTecnologicos: false,
        ...seccionesOmitidas,
      },

      leerExtintores() {
        return crearElementos(cantidades.extintores);
      },

      leerCamillas() {
        return crearElementos(cantidades.camillas);
      },

      leerSenalizaciones() {
        return crearElementos(cantidades.senalizaciones);
      },

      leerBotiquines() {
        return crearElementos(cantidades.botiquines);
      },

      leerEquiposTecnologicos() {
        return crearElementos(cantidades.equiposTecnologicos);
      },
    },
  };
}

test("contarItemsInspeccion suma los elementos registrados", async () => {
  const { crearResumenInspeccionSstController } =
    await moduloPromise;

  const escenario = crearEscenario({
    cantidades: {
      extintores: 2,
      camillas: 1,
      senalizaciones: 3,
      botiquines: 1,
      equiposTecnologicos: 2,
    },
  });

  const controlador = crearResumenInspeccionSstController(
    escenario.dependencias,
  );

  assert.equal(controlador.contarItemsInspeccion(), 9);
});

test("contarItemsInspeccion ignora las secciones omitidas", async () => {
  const { crearResumenInspeccionSstController } =
    await moduloPromise;

  const escenario = crearEscenario({
    seccionesOmitidas: {
      extintores: true,
      botiquines: true,
    },

    cantidades: {
      extintores: 2,
      camillas: 1,
      botiquines: 3,
    },
  });

  const controlador = crearResumenInspeccionSstController(
    escenario.dependencias,
  );

  assert.equal(controlador.contarItemsInspeccion(), 1);
});

test("tieneItemsInspeccion identifica una inspección vacía", async () => {
  const { crearResumenInspeccionSstController } =
    await moduloPromise;

  const escenario = crearEscenario();

  const controlador = crearResumenInspeccionSstController(
    escenario.dependencias,
  );

  assert.equal(controlador.tieneItemsInspeccion(), false);
});

test("tieneItemsInspeccion identifica elementos registrados", async () => {
  const { crearResumenInspeccionSstController } =
    await moduloPromise;

  const escenario = crearEscenario({
    cantidades: {
      camillas: 1,
    },
  });

  const controlador = crearResumenInspeccionSstController(
    escenario.dependencias,
  );

  assert.equal(controlador.tieneItemsInspeccion(), true);
});

test("renderizar construye el resumen y habilita el envío", async () => {
  const { crearResumenInspeccionSstController } =
    await moduloPromise;

  const escenario = crearEscenario({
    cantidades: {
      extintores: 2,
    },
  });

  const controlador = crearResumenInspeccionSstController(
    escenario.dependencias,
  );

  controlador.renderizar();

  assert.equal(
    escenario.documento.elementos.get("resumen-fecha").textContent,
    "2026-09-14",
  );

  assert.match(
    escenario.documento.elementos.get("resumen-secciones").innerHTML,
    /Hecho \(2\)/,
  );

  assert.equal(
    escenario.documento.elementos.get("btn-onedrive").disabled,
    false,
  );

  assert.equal(
    escenario.documento.elementos.get("msg").textContent,
    "",
  );
});

test("renderizar bloquea el envío cuando no existen elementos", async () => {
  const { crearResumenInspeccionSstController } =
    await moduloPromise;

  const escenario = crearEscenario();

  const controlador = crearResumenInspeccionSstController(
    escenario.dependencias,
  );

  controlador.renderizar();

  assert.equal(
    escenario.documento.elementos.get("btn-onedrive").disabled,
    true,
  );

  assert.match(
    escenario.documento.elementos.get("msg").textContent,
    /no se ha registrado ningún ítem/i,
  );
});