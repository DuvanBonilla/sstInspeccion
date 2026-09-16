const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");
const path = require("node:path");

function cargarConMocks(rutaModulo, mocks) {
  const cargarOriginal = Module._load;

  Module._load = function cargar(request, parent, isMain) {
    if (Object.prototype.hasOwnProperty.call(mocks, request)) {
      return mocks[request];
    }

    return cargarOriginal.call(this, request, parent, isMain);
  };

  const rutaResuelta = require.resolve(rutaModulo);
  delete require.cache[rutaResuelta];

  try {
    return require(rutaResuelta);
  } finally {
    Module._load = cargarOriginal;
  }
}

function crearRespuesta() {
  return {
    statusCode: null,
    body: null,

    status(codigo) {
      this.statusCode = codigo;
      return this;
    },

    json(datos) {
      this.body = datos;
      return this;
    },
  };
}

test("SST genera links públicos y devuelve el estado del envío", async () => {
  const rutaControlador = path.resolve(
    __dirname,
    "../../../src/backend/controllers/inspeccion.controller.js",
  );

  let datosEnvio;

  const controlador = cargarConMocks(rutaControlador, {
    "../utils/request.utils": {
      leerPayload() {
        return {};
      },
    },

    "../models/inspeccion.model": {
      async guardarInspeccionEnDB() {
        return {
          inspeccionId: "INSP-SST-001",
          numInspeccion: 31,
          tokens: {
            jefe: "token-jefe-sst",
            copasst: "token-copasst-sst",
          },
        };
      },

      async obtenerLinksInspeccion() {
        return null;
      },
    },

    "../services/evidencia.service": {
      async subirEvidenciasMultiples() {
        return {};
      },
    },

    "../validators/inspeccion.validator": {
      validarInspeccion() {
        return {
          ok: true,
          data: {
            general: {
              inspeccionId: "INSP-SST-001",
              fecha: "2026-09-16",
              sedeOperacion: "Santa Marta",
              areaTrabajo: "Administración",
            },
            extintores: [],
            camillas: [],
            senalizaciones: [],
            equiposTecnologicos: [],
            botiquines: [],
          },
        };
      },
    },

    "../services/correoAprobacion.service": {
      leerContactosAprobacion() {
        return {
          jefe: {
            metodo: "correo",
            destino: "jefe@ejemplo.com",
          },
          copasst: {
            metodo: "whatsapp",
            destino: "3001234567",
          },
        };
      },

      async enviarSolicitudesAprobacion(datos) {
        datosEnvio = datos;

        return {
          jefe: "enviado",
          copasst: "manual",
        };
      },
    },
  });

  const appUrlAnterior = process.env.APP_URL;
  process.env.APP_URL = "https://sstinspeccion.onrender.com/";

  const req = {
    body: {
      contactosAprobacion: "{}",
    },
    files: [],
    protocol: "http",
    get() {
      return "localhost:3000";
    },
  };

  const res = crearRespuesta();

  try {
    await controlador.enviarExtintorOneDrive(req, res);
  } finally {
    if (appUrlAnterior === undefined) {
      delete process.env.APP_URL;
    } else {
      process.env.APP_URL = appUrlAnterior;
    }
  }

  assert.equal(res.statusCode, 201);

  assert.deepEqual(res.body.links, {
    jefe: "https://sstinspeccion.onrender.com/aprobar/token-jefe-sst",
    copasst: "https://sstinspeccion.onrender.com/aprobar/token-copasst-sst",
  });

  assert.deepEqual(res.body.estadoEnvioAprobacion, {
    jefe: "enviado",
    copasst: "manual",
  });

  assert.deepEqual(datosEnvio.links, res.body.links);
  assert.equal(datosEnvio.tipoInspeccion, "SST");
});

test("EPP genera links públicos y conserva tokens y estado", async () => {
  const rutaControlador = path.resolve(
    __dirname,
    "../../../src/backend/controllers/inspeccionEpp.controller.js",
  );

  let datosEnvio;

  const controlador = cargarConMocks(rutaControlador, {
    "../utils/request.utils": {
      leerPayload() {
        return {};
      },
    },

    "../validators/inspeccionEpp.validator": {
      validarInspeccionEpp() {
        return {
          ok: true,
          data: {
            general: {
              inspeccionId: "INSP-EPP-001",
              fecha: "2026-09-16",
              sedeOperacion: "Urabá",
              areaTrabajo: "Operaciones",
            },
            trabajadores: [],
          },
        };
      },

      validarEvidenciaTrabajador() {
        return {
          ok: true,
          data: {},
        };
      },
    },

    "../models/inspeccionEpp.model": {
      async guardarInspeccionEppEnDB() {
        return {
          inspeccionId: "INSP-EPP-001",
          numInspeccion: 32,
          tokens: {
            jefe: "token-jefe-epp",
            copasst: "token-copasst-epp",
          },
        };
      },
    },

    "../services/evidencia.service": {
      async uploadEvidenceToOneDrive() {
        return {};
      },
    },

    "../utils/fechaEvidencia": {
      async resolverFechaEvidencia() {
        return null;
      },
    },

    "../services/correoAprobacion.service": {
      leerContactosAprobacion() {
        return {
          jefe: {
            metodo: "whatsapp",
            destino: "3001234567",
          },
          copasst: {
            metodo: "correo",
            destino: "copasst@ejemplo.com",
          },
        };
      },

      async enviarSolicitudesAprobacion(datos) {
        datosEnvio = datos;

        return {
          jefe: "manual",
          copasst: "enviado",
        };
      },
    },
  });

  const appUrlAnterior = process.env.APP_URL;
  process.env.APP_URL = "https://sstinspeccion.onrender.com/";

  const req = {
    body: {
      contactosAprobacion: "{}",
    },
    files: [],
    protocol: "http",
    get() {
      return "localhost:3000";
    },
  };

  const res = crearRespuesta();

  try {
    await controlador.enviarInspeccionEpp(req, res);
  } finally {
    if (appUrlAnterior === undefined) {
      delete process.env.APP_URL;
    } else {
      process.env.APP_URL = appUrlAnterior;
    }
  }

  assert.equal(res.statusCode, 201);

  assert.deepEqual(res.body.tokens, {
    jefe: "token-jefe-epp",
    copasst: "token-copasst-epp",
  });

  assert.deepEqual(res.body.links, {
    jefe: "https://sstinspeccion.onrender.com/aprobar/token-jefe-epp",
    copasst: "https://sstinspeccion.onrender.com/aprobar/token-copasst-epp",
  });

  assert.deepEqual(res.body.estadoEnvioAprobacion, {
    jefe: "manual",
    copasst: "enviado",
  });

  assert.deepEqual(datosEnvio.links, res.body.links);
  assert.equal(datosEnvio.tipoInspeccion, "EPP");
});
