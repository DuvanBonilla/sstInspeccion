const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function crearUrlModulo(codigo) {
  return `data:text/javascript;base64,${Buffer.from(codigo).toString(
    "base64",
  )}`;
}

const rutaUtilidades = path.resolve(
  "src/views/js/shared/aprobacionContacto.js",
);

const rutaControlador = path.resolve(
  "src/views/js/shared/controllers/contactosAprobacion.controller.js",
);

const urlUtilidades = crearUrlModulo(
  fs.readFileSync(rutaUtilidades, "utf8"),
);

const codigoControlador = fs
  .readFileSync(rutaControlador, "utf8")
  .replace("../aprobacionContacto.js", urlUtilidades);

const moduloPromise = import(crearUrlModulo(codigoControlador));

function crearClassList() {
  const clases = new Set();

  return {
    add(...nombres) {
      nombres.forEach((nombre) => clases.add(nombre));
    },

    remove(...nombres) {
      nombres.forEach((nombre) => clases.delete(nombre));
    },

    toggle(nombre, estado) {
      if (estado) {
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

function crearElemento({ id, value = "" }) {
  const eventos = new Map();

  return {
    id,
    value,
    type: "",
    placeholder: "",
    inputMode: "",
    autocomplete: "",
    disabled: false,
    textContent: "",
    innerHTML: "",
    href: "#",
    title: "",
    dataset: {},
    classList: crearClassList(),
    enfocado: false,

    addEventListener(nombre, manejador) {
      eventos.set(nombre, manejador);
    },

    emitir(nombre) {
      eventos.get(nombre)?.({
        target: this,
      });
    },

    focus() {
      this.enfocado = true;
    },

    setAttribute(nombre, valor) {
      this[nombre] = valor;
    },
  };
}

function crearEscenario() {
  const elementos = {
    "metodo-aprobacion-jefe": crearElemento({
      id: "metodo-aprobacion-jefe",
    }),
    "destino-aprobacion-jefe": crearElemento({
      id: "destino-aprobacion-jefe",
    }),
    "error-aprobacion-jefe": crearElemento({
      id: "error-aprobacion-jefe",
    }),
    "metodo-aprobacion-copasst": crearElemento({
      id: "metodo-aprobacion-copasst",
    }),
    "destino-aprobacion-copasst": crearElemento({
      id: "destino-aprobacion-copasst",
    }),
    "error-aprobacion-copasst": crearElemento({
      id: "error-aprobacion-copasst",
    }),
    "btn-compartir-aprobacion-jefe": crearElemento({
      id: "btn-compartir-aprobacion-jefe",
    }),
    "btn-compartir-aprobacion-copasst": crearElemento({
      id: "btn-compartir-aprobacion-copasst",
    }),
  };

  const documento = {
    getElementById(id) {
      return elementos[id] || null;
    },
  };

  return {
    documento,
    elementos,
  };
}

test("inicializar deshabilita el destino mientras no exista método", async () => {
  const { crearContactosAprobacionController } = await moduloPromise;
  const escenario = crearEscenario();

  const controlador = crearContactosAprobacionController({
    documento: escenario.documento,
  });

  controlador.inicializar();

  assert.equal(
    escenario.elementos["destino-aprobacion-jefe"].disabled,
    true,
  );

  assert.equal(
    escenario.elementos["destino-aprobacion-copasst"].disabled,
    true,
  );
});

test("seleccionar WhatsApp configura un campo telefónico", async () => {
  const { crearContactosAprobacionController } = await moduloPromise;
  const escenario = crearEscenario();

  const controlador = crearContactosAprobacionController({
    documento: escenario.documento,
  });

  controlador.inicializar();

  const metodo = escenario.elementos["metodo-aprobacion-jefe"];
  const destino = escenario.elementos["destino-aprobacion-jefe"];

  metodo.value = "whatsapp";
  metodo.emitir("change");

  assert.equal(destino.disabled, false);
  assert.equal(destino.type, "tel");
  assert.equal(destino.inputMode, "tel");
  assert.match(destino.placeholder, /3001234567/);
});

test("seleccionar correo configura un campo de correo", async () => {
  const { crearContactosAprobacionController } = await moduloPromise;
  const escenario = crearEscenario();

  const controlador = crearContactosAprobacionController({
    documento: escenario.documento,
  });

  controlador.inicializar();

  const metodo = escenario.elementos["metodo-aprobacion-copasst"];
  const destino = escenario.elementos["destino-aprobacion-copasst"];

  metodo.value = "correo";
  metodo.emitir("change");

  assert.equal(destino.disabled, false);
  assert.equal(destino.type, "email");
  assert.equal(destino.inputMode, "email");
  assert.match(destino.placeholder, /empresa\.com/);
});

test("validar acepta teléfono y correo válidos", async () => {
  const { crearContactosAprobacionController } = await moduloPromise;
  const escenario = crearEscenario();

  escenario.elementos["metodo-aprobacion-jefe"].value = "whatsapp";
  escenario.elementos["destino-aprobacion-jefe"].value = "3001234567";

  escenario.elementos["metodo-aprobacion-copasst"].value = "correo";
  escenario.elementos["destino-aprobacion-copasst"].value =
    "copasst@cargoban.com";

  const controlador = crearContactosAprobacionController({
    documento: escenario.documento,
  });

  assert.equal(controlador.validar(), true);
  assert.equal(controlador.esValido(), true);
});

test("validar rechaza destinos inválidos y enfoca el primero", async () => {
  const { crearContactosAprobacionController } = await moduloPromise;
  const escenario = crearEscenario();

  escenario.elementos["metodo-aprobacion-jefe"].value = "whatsapp";
  escenario.elementos["destino-aprobacion-jefe"].value = "123";

  escenario.elementos["metodo-aprobacion-copasst"].value = "correo";
  escenario.elementos["destino-aprobacion-copasst"].value = "correo-invalido";

  const controlador = crearContactosAprobacionController({
    documento: escenario.documento,
  });

  assert.equal(controlador.validar(), false);

  assert.equal(
    escenario.elementos["destino-aprobacion-jefe"].enfocado,
    true,
  );

  assert.equal(
    escenario.elementos[
      "destino-aprobacion-jefe"
    ].classList.contains("campo-error"),
    true,
  );
});

test("validar exige seleccionar un método de envío", async () => {
  const { crearContactosAprobacionController } = await moduloPromise;
  const escenario = crearEscenario();

  const controlador = crearContactosAprobacionController({
    documento: escenario.documento,
  });

  assert.equal(controlador.validar(), false);

  assert.equal(
    escenario.elementos[
      "metodo-aprobacion-jefe"
    ].classList.contains("campo-error"),
    true,
  );

  assert.match(
    escenario.elementos["error-aprobacion-jefe"].textContent,
    /Seleccione un medio/,
  );
});

test("obtenerContactos devuelve los datos de ambos aprobadores", async () => {
  const { crearContactosAprobacionController } = await moduloPromise;
  const escenario = crearEscenario();

  escenario.elementos["metodo-aprobacion-jefe"].value = "whatsapp";
  escenario.elementos["destino-aprobacion-jefe"].value = "3001234567";

  escenario.elementos["metodo-aprobacion-copasst"].value = "correo";
  escenario.elementos["destino-aprobacion-copasst"].value =
    "copasst@cargoban.com";

  const controlador = crearContactosAprobacionController({
    documento: escenario.documento,
  });

  assert.deepEqual(controlador.obtenerContactos(), {
    jefe: {
      metodo: "whatsapp",
      destino: "3001234567",
    },
    copasst: {
      metodo: "correo",
      destino: "copasst@cargoban.com",
    },
  });
});

test("configurarAcciones prepara el enlace de WhatsApp del jefe", async () => {
  const { crearContactosAprobacionController } = await moduloPromise;
  const escenario = crearEscenario();

  escenario.elementos["metodo-aprobacion-jefe"].value = "whatsapp";
  escenario.elementos["destino-aprobacion-jefe"].value = "3001234567";

  const controlador = crearContactosAprobacionController({
    documento: escenario.documento,
  });

  controlador.configurarAcciones({
    links: {
      jefe: "https://app.example/aprobar/token-jefe",
    },
    tipoInspeccion: "EPP",
    inspeccionId: "INSP-20260914-TEST",
    numInspeccion: 18,
  });

  const boton = escenario.elementos["btn-compartir-aprobacion-jefe"];

  assert.match(boton.href, /^https:\/\/wa\.me\/57?3001234567\?text=/);
  assert.match(decodeURIComponent(boton.href), /token-jefe/);
  assert.equal(boton.dataset.metodo, "whatsapp");
  assert.equal(boton.classList.contains("hidden"), false);
  assert.match(boton.innerHTML, /<svg/);
});

test("configurarAcciones prepara el correo de COPASST", async () => {
  const { crearContactosAprobacionController } = await moduloPromise;
  const escenario = crearEscenario();

  escenario.elementos["metodo-aprobacion-copasst"].value = "correo";
  escenario.elementos["destino-aprobacion-copasst"].value =
    "copasst@cargoban.com";

  const controlador = crearContactosAprobacionController({
    documento: escenario.documento,
  });

  controlador.configurarAcciones({
    links: {
      copasst: "https://app.example/aprobar/token-copasst",
    },
    tipoInspeccion: "SST",
    numInspeccion: 19,
  });

  const boton = escenario.elementos["btn-compartir-aprobacion-copasst"];

  assert.match(boton.href, /^mailto:copasst@cargoban\.com\?/);
  assert.match(decodeURIComponent(boton.href), /token-copasst/);
  assert.equal(boton.dataset.metodo, "correo");
  assert.equal(boton.classList.contains("hidden"), false);
  assert.match(boton.innerHTML, /<svg/);
});

test("configurarAcciones oculta el botón cuando falta el enlace", async () => {
  const { crearContactosAprobacionController } = await moduloPromise;
  const escenario = crearEscenario();

  escenario.elementos["metodo-aprobacion-jefe"].value = "whatsapp";
  escenario.elementos["destino-aprobacion-jefe"].value = "3001234567";

  const controlador = crearContactosAprobacionController({
    documento: escenario.documento,
  });

  controlador.configurarAcciones({
    links: {},
    tipoInspeccion: "EPP",
  });

  const boton = escenario.elementos["btn-compartir-aprobacion-jefe"];

  assert.equal(boton.href, "#");
  assert.equal(boton.classList.contains("hidden"), true);
});