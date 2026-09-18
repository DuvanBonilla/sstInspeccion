const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const rutaModulo = path.resolve(
  __dirname,
  "../../../src/views/js/epp/controllers/evidenciasTrabajadorEpp.controller.js",
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

function crearEscenario({
  archivo,
  trabajadorId = "7",
  correspondeEvidencia = true,
} = {}) {
  const clases = new Set();

  const estado = {
    textContent: "",

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
  };

  const tarjeta = {
    dataset: {
      trabajadorId,
    },

    querySelector(selector) {
      if (
        selector ===
        '[data-role="evidenciaEstado"]'
      ) {
        return estado;
      }

      return null;
    },
  };

  const input = {
    files: archivo ? [archivo] : [],
    value: "evidencia.jpg",
    disabled: false,

    matches(selector) {
      return (
        correspondeEvidencia &&
        selector ===
          '[data-role="evidencia"]'
      );
    },

    closest(selector) {
      if (selector === ".trabajador-card") {
        return tarjeta;
      }

      return null;
    },
  };

  const container = {
    querySelectorAll(selector) {
      if (selector === ".trabajador-card") {
        return [tarjeta];
      }

      return [];
    },
  };

  return {
    event: {
      target: input,
    },
    container,
    tarjeta,
    input,
    estado,
  };
}

test("manejarCambioEvidencia ignora eventos ajenos", async () => {
  const { manejarCambioEvidencia } =
    await moduloPromise;

  const escenario = crearEscenario({
    correspondeEvidencia: false,
  });

  const resultado =
    await manejarCambioEvidencia(
      escenario.event,
      {
        container: escenario.container,
        evidencias: new Map(),
        validarEvidenciaEpp() {
          return { valido: true };
        },
        optimizarImagen() {},
        formatearPesoArchivo() {
          return "";
        },
      },
    );

  assert.equal(resultado, false);
});

test("manejarCambioEvidencia elimina una evidencia deseleccionada", async () => {
  const { manejarCambioEvidencia } =
    await moduloPromise;

  const escenario = crearEscenario();

  const evidencias = new Map([
    [7, { nombre: "anterior.jpg" }],
  ]);

  const resultado =
    await manejarCambioEvidencia(
      escenario.event,
      {
        container: escenario.container,
        evidencias,
        validarEvidenciaEpp() {
          return { valido: true };
        },
        optimizarImagen() {},
        formatearPesoArchivo() {
          return "";
        },
      },
    );

  assert.equal(resultado, true);
  assert.equal(evidencias.has(7), false);

  assert.equal(
    escenario.estado.textContent,
    "Sin evidencia",
  );
});

test("manejarCambioEvidencia rechaza un archivo inválido", async () => {
  const { manejarCambioEvidencia } =
    await moduloPromise;

  const archivo = {
    name: "documento.pdf",
    size: 500,
  };

  const escenario = crearEscenario({
    archivo,
  });

  const evidencias = new Map([
    [7, { nombre: "anterior.jpg" }],
  ]);

  let optimizacionEjecutada = false;

  const resultado =
    await manejarCambioEvidencia(
      escenario.event,
      {
        container: escenario.container,
        evidencias,

        validarEvidenciaEpp() {
          return {
            valido: false,
            mensaje: "Formato no permitido.",
          };
        },

        optimizarImagen() {
          optimizacionEjecutada = true;
        },

        formatearPesoArchivo() {
          return "";
        },
      },
    );

  assert.equal(resultado, true);
  assert.equal(optimizacionEjecutada, false);
  assert.equal(evidencias.has(7), false);
  assert.equal(escenario.input.value, "");

  assert.equal(
    escenario.estado.textContent,
    "Formato no permitido.",
  );

  assert.equal(
    escenario.estado.classList.contains(
      "evidencia-estado--error",
    ),
    true,
  );
});

test("manejarCambioEvidencia guarda la imagen optimizada", async () => {
  const { manejarCambioEvidencia } =
    await moduloPromise;

  const archivo = {
    name: "original.jpg",
    size: 2000,
  };

  const archivoOptimizado = {
    name: "optimizada.jpg",
    size: 900,
  };

  const escenario = crearEscenario({
    archivo,
  });

  const evidencias = new Map();
  const registros = [];

  const resultado =
    await manejarCambioEvidencia(
      escenario.event,
      {
        container: escenario.container,
        evidencias,

        validarEvidenciaEpp() {
          return { valido: true };
        },

        async optimizarImagen() {
          assert.equal(
            escenario.input.disabled,
            true,
          );

          assert.equal(
            escenario.estado.textContent,
            "Optimizando imagen...",
          );

          return archivoOptimizado;
        },

        formatearPesoArchivo(size) {
          return `${size} bytes`;
        },

        logger: {
          log(...parametros) {
            registros.push(parametros);
          },

          error() {},
        },
      },
    );

  assert.equal(resultado, true);

  assert.strictEqual(
    evidencias.get(7),
    archivoOptimizado,
  );

  assert.equal(
    escenario.estado.textContent,
    "Evidencia lista · 900 bytes",
  );

  assert.equal(
    escenario.input.disabled,
    false,
  );

  assert.equal(registros.length, 1);
});

test("manejarCambioEvidencia controla errores de optimización", async () => {
  const { manejarCambioEvidencia } =
    await moduloPromise;

  const archivo = {
    name: "original.jpg",
    size: 2000,
  };

  const escenario = crearEscenario({
    archivo,
  });

  const evidencias = new Map([
    [7, { nombre: "anterior.jpg" }],
  ]);

  const errores = [];

  const resultado =
    await manejarCambioEvidencia(
      escenario.event,
      {
        container: escenario.container,
        evidencias,

        validarEvidenciaEpp() {
          return { valido: true };
        },

        async optimizarImagen() {
          throw new Error(
            "No fue posible optimizar",
          );
        },

        formatearPesoArchivo() {
          return "";
        },

        logger: {
          log() {},

          error(...parametros) {
            errores.push(parametros);
          },
        },
      },
    );

  assert.equal(resultado, true);
  assert.equal(evidencias.has(7), false);
  assert.equal(escenario.input.value, "");
  assert.equal(escenario.input.disabled, false);

  assert.equal(
    escenario.estado.textContent,
    "⚠ No fue posible procesar la imagen seleccionada.",
  );

  assert.equal(
    escenario.estado.classList.contains(
      "evidencia-estado--error",
    ),
    true,
  );

  assert.equal(errores.length, 1);
});