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
  "../../../src/views/js/sst/controllers/envioInspeccionSst.controller.js",
);

const urlEstadoEnvio = crearUrlModulo(fs.readFileSync(rutaEstadoEnvio, "utf8"));

const codigoControlador = fs
  .readFileSync(rutaControlador, "utf8")
  .replace("../../shared/estadoEnvioAprobacion.js", urlEstadoEnvio);

const moduloPromise = import(crearUrlModulo(codigoControlador));

function crearEscenario({
  pasoValido = true,
  tieneItems = true,
  respuesta = {
    numInspeccion: 25,
    links: {
      jefe: "/aprobar/jefe",
      copasst: "/aprobar/copasst",
    },
  },
  error = null,
} = {}) {
  const eventos = {};
  const modales = [];

  const boton = {
    disabled: false,

    addEventListener(tipo, callback) {
      eventos[tipo] = callback;
    },
  };

  const mensaje = {
    textContent: "",
  };

  const mensajeError = {
    textContent: "",
  };

  const documento = {
    getElementById(id) {
      const elementos = {
        "btn-onedrive": boton,
        msg: mensaje,
        "envio-error-texto": mensajeError,
      };

      return elementos[id] || null;
    },
  };

  let formDataConstruido = false;
  let formDataEnviado;

  const dependencias = {
    documento,

    obtenerPasoActual() {
      return 8;
    },

    validarPaso(paso) {
      assert.equal(paso, 8);

      return pasoValido;
    },

    tieneItemsInspeccion() {
      return tieneItems;
    },

    generarInspeccionId() {
      return "INSP-20260914-ABCD";
    },

    async construirFormData(inspeccionId) {
      assert.equal(inspeccionId, "INSP-20260914-ABCD");

      formDataConstruido = true;

      return {
        inspeccionId,
      };
    },

    async enviarInspeccion(formData) {
      formDataEnviado = formData;

      if (error) {
        throw error;
      }

      return respuesta;
    },

    mostrarModal(...parametros) {
      modales.push(parametros);
    },

    consola: {
      error() {},
    },
  };

  return {
    boton,
    dependencias,
    eventos,
    mensaje,
    mensajeError,
    modales,

    obtenerEstado() {
      return {
        formDataConstruido,
        formDataEnviado,
      };
    },
  };
}

test("inicializar registra el evento del botón de envío", async () => {
  const { crearEnvioInspeccionSstController } = await moduloPromise;

  const escenario = crearEscenario();

  const controlador = crearEnvioInspeccionSstController(escenario.dependencias);

  controlador.inicializar();

  assert.equal(typeof escenario.eventos.click, "function");
});

test("enviar se detiene cuando el paso es inválido", async () => {
  const { crearEnvioInspeccionSstController } = await moduloPromise;

  const escenario = crearEscenario({
    pasoValido: false,
  });

  const controlador = crearEnvioInspeccionSstController(escenario.dependencias);

  await controlador.enviar();

  assert.equal(escenario.obtenerEstado().formDataConstruido, false);

  assert.deepEqual(escenario.modales, []);
});

test("enviar exige al menos un elemento registrado", async () => {
  const { crearEnvioInspeccionSstController } = await moduloPromise;

  const escenario = crearEscenario({
    tieneItems: false,
  });

  const controlador = crearEnvioInspeccionSstController(escenario.dependencias);

  await controlador.enviar();

  assert.equal(
    escenario.mensaje.textContent,
    "No puede enviar este informe porque no se ha registrado ningún ítem en la inspección.",
  );

  assert.equal(escenario.obtenerEstado().formDataConstruido, false);
});

test("enviar construye y registra la inspección", async () => {
  const { crearEnvioInspeccionSstController } = await moduloPromise;

  const escenario = crearEscenario();

  const controlador = crearEnvioInspeccionSstController(escenario.dependencias);

  await controlador.enviar();

  assert.equal(escenario.boton.disabled, true);

  assert.deepEqual(escenario.modales, [
    ["cargando"],
    [
      "exito",
      "INSP-20260914-ABCD",
      25,
      {
        jefe: "/aprobar/jefe",
        copasst: "/aprobar/copasst",
      },
    ],
  ]);

  assert.deepEqual(escenario.obtenerEstado().formDataEnviado, {
    inspeccionId: "INSP-20260914-ABCD",
  });
});

test("enviar muestra el error y reactiva el botón", async () => {
  const { crearEnvioInspeccionSstController } = await moduloPromise;

  const escenario = crearEscenario({
    error: new Error("No fue posible guardar"),
  });

  const controlador = crearEnvioInspeccionSstController(escenario.dependencias);

  await controlador.enviar();

  assert.equal(escenario.boton.disabled, false);

  assert.equal(escenario.mensajeError.textContent, "No fue posible guardar");

  assert.deepEqual(escenario.modales, [["cargando"], ["error"]]);
});
