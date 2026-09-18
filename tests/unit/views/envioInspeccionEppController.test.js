const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function crearUrlModulo(codigo) {
  return `data:text/javascript;base64,${Buffer.from(codigo).toString(
    "base64",
  )}`;
}

const rutaEstadoEnvio = path.resolve(
  __dirname,
  "../../../src/views/js/shared/estadoEnvioAprobacion.js",
);

const rutaControlador = path.resolve(
  __dirname,
  "../../../src/views/js/epp/controllers/envioInspeccionEpp.controller.js",
);

const urlEstadoEnvio = crearUrlModulo(fs.readFileSync(rutaEstadoEnvio, "utf8"));

const codigoControlador = fs
  .readFileSync(rutaControlador, "utf8")
  .replace("../../shared/estadoEnvioAprobacion.js", urlEstadoEnvio);

const moduloPromise = import(crearUrlModulo(codigoControlador));

function crearBoton() {
  const eventos = {};

  return {
    disabled: false,
    textContent: "Enviar inspección",

    addEventListener(tipo, callback) {
      eventos[tipo] = callback;
    },

    eventos,
  };
}

function crearEscenario({ conBoton = true, resultadoEnvio, errorEnvio } = {}) {
  const boton = crearBoton();
  const modales = [];
  const errores = [];

  const documento = {
    getElementById(id) {
      if (conBoton && id === "btn-enviar-inspeccion-epp") {
        return boton;
      }

      return null;
    },
  };

  const ventana = {
    location: {
      origin: "https://sst.example.com",
    },

    mostrarModal(...argumentos) {
      modales.push(argumentos);
    },
  };

  async function enviarInspeccionEpp() {
    if (errorEnvio) {
      throw errorEnvio;
    }

    return resultadoEnvio;
  }

  function registrarError(...argumentos) {
    errores.push(argumentos);
  }

  return {
    boton,
    documento,
    ventana,
    modales,
    errores,
    enviarInspeccionEpp,
    registrarError,
  };
}

test("construirLinksAprobacionEpp devuelve null sin tokens", async () => {
  const { construirLinksAprobacionEpp } = await moduloPromise;

  assert.equal(
    construirLinksAprobacionEpp(null, "https://sst.example.com"),
    null,
  );
});

test("construirLinksAprobacionEpp construye los enlaces actuales", async () => {
  const { construirLinksAprobacionEpp } = await moduloPromise;

  const resultado = construirLinksAprobacionEpp(
    {
      jefe: "token-jefe",
      copasst: "token-copasst",
    },
    "https://sst.example.com",
  );

  assert.deepEqual(resultado, {
    jefe: "https://sst.example.com/aprobar/token-jefe",
    copasst: "https://sst.example.com/aprobar/token-copasst",
  });
});

test("construirLinksAprobacionEpp conserva enlaces ausentes", async () => {
  const { construirLinksAprobacionEpp } = await moduloPromise;

  const resultado = construirLinksAprobacionEpp(
    {
      jefe: "token-jefe",
    },
    "https://sst.example.com",
  );

  assert.deepEqual(resultado, {
    jefe: "https://sst.example.com/aprobar/token-jefe",
    copasst: null,
  });
});

test("inicializarEnvioEpp no registra eventos sin botón", async () => {
  const { inicializarEnvioEpp } = await moduloPromise;

  const escenario = crearEscenario({
    conBoton: false,
  });

  const resultado = inicializarEnvioEpp({
    documento: escenario.documento,
    ventana: escenario.ventana,
    enviarInspeccionEpp: escenario.enviarInspeccionEpp,
    registrarError: escenario.registrarError,
  });

  assert.equal(resultado, undefined);
  assert.equal(escenario.boton.eventos.click, undefined);
});

test("inicializarEnvioEpp completa el flujo exitoso", async () => {
  const { inicializarEnvioEpp } = await moduloPromise;

  const escenario = crearEscenario({
    resultadoEnvio: {
      inspeccionId: "EPP-123",
      numInspeccion: 25,
      tokens: {
        jefe: "token-jefe",
        copasst: "token-copasst",
      },
    },
  });

  inicializarEnvioEpp({
    documento: escenario.documento,
    ventana: escenario.ventana,
    enviarInspeccionEpp: escenario.enviarInspeccionEpp,
    registrarError: escenario.registrarError,
  });

  assert.equal(typeof escenario.boton.eventos.click, "function");

  await escenario.boton.eventos.click();

  assert.equal(escenario.boton.disabled, true);
  assert.equal(escenario.boton.textContent, "Inspección enviada");

  assert.deepEqual(escenario.modales, [
    ["cargando"],
    [
      "exito",
      "EPP-123",
      25,
      {
        jefe: "https://sst.example.com/aprobar/token-jefe",
        copasst: "https://sst.example.com/aprobar/token-copasst",
      },
      "crear",
    ],
  ]);
});

test("inicializarEnvioEpp restaura el botón cuando falla", async () => {
  const { inicializarEnvioEpp } = await moduloPromise;

  const error = new Error("Fallo de envío");

  const escenario = crearEscenario({
    errorEnvio: error,
  });

  inicializarEnvioEpp({
    documento: escenario.documento,
    ventana: escenario.ventana,
    enviarInspeccionEpp: escenario.enviarInspeccionEpp,
    registrarError: escenario.registrarError,
  });

  await escenario.boton.eventos.click();

  assert.equal(escenario.boton.disabled, false);
  assert.equal(escenario.boton.textContent, "Enviar inspección");

  assert.deepEqual(escenario.modales, [["cargando"], ["error"]]);

  assert.deepEqual(escenario.errores, [
    ["❌ No fue posible completar el envío EPP:", error],
  ]);
});
