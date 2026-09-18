const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const rutaModulo = path.resolve(
  __dirname,
  "../../../src/views/js/epp/controllers/validacionTrabajadoresEppUi.controller.js",
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

function crearClassList(
  clasesIniciales = [],
) {
  const clases = new Set(
    clasesIniciales,
  );

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

function crearEstado() {
  return {
    textContent: "",
    classList: crearClassList(["hidden"]),
  };
}

function crearCampo() {
  return {
    enfocado: false,
    desplazado: false,
    classList: crearClassList(),

    scrollIntoView(opciones) {
      this.desplazado = true;
      this.opcionesDesplazamiento =
        opciones;
    },

    focus() {
      this.enfocado = true;
    },
  };
}

test("mostrar y ocultar estado actualizan su representación visual", async () => {
  const {
    mostrarEstadoValidacion,
    ocultarEstadoValidacion,
  } = await moduloPromise;

  const estado = crearEstado();

  mostrarEstadoValidacion(
    estado,
    "Existe un error",
  );

  assert.equal(
    estado.textContent,
    "Existe un error",
  );

  assert.equal(
    estado.classList.contains("hidden"),
    false,
  );

  ocultarEstadoValidacion(estado);

  assert.equal(estado.textContent, "");

  assert.equal(
    estado.classList.contains("hidden"),
    true,
  );
});

test("presentarResultadoValidacion oculta el estado cuando todo es válido", async () => {
  const { presentarResultadoValidacion } =
    await moduloPromise;

  const estado = crearEstado();
  estado.textContent = "Error anterior";
  estado.classList.remove("hidden");

  const resultado =
    presentarResultadoValidacion({
      resultado: {
        valido: true,
      },
      tarjetas: [],
      container: {},
      cantidadInput: null,
      estadoElement: estado,
      abrirTrabajador() {},
    });

  assert.deepEqual(resultado, {
    valido: true,
    mensaje: "",
  });

  assert.equal(estado.textContent, "");

  assert.equal(
    estado.classList.contains("hidden"),
    true,
  );
});

test("presentarResultadoValidacion enfoca la cantidad ausente", async () => {
  const { presentarResultadoValidacion } =
    await moduloPromise;

  const estado = crearEstado();

  const cantidadInput = {
    enfocado: false,

    focus() {
      this.enfocado = true;
    },
  };

  const resultado =
    presentarResultadoValidacion({
      resultado: {
        valido: false,
        campo: "cantidad",
        mensaje:
          "No existen trabajadores.",
      },
      tarjetas: [],
      container: {},
      cantidadInput,
      estadoElement: estado,
      abrirTrabajador() {},
    });

  assert.equal(
    cantidadInput.enfocado,
    true,
  );

  assert.equal(
    estado.textContent,
    "Debe generar al menos un trabajador antes de continuar.",
  );

  assert.deepEqual(resultado, {
    valido: false,
    mensaje: "No existen trabajadores.",
  });
});

test("presentarResultadoValidacion informa un trabajador inexistente", async () => {
  const { presentarResultadoValidacion } =
    await moduloPromise;

  const estado = crearEstado();

  const resultado =
    presentarResultadoValidacion({
      resultado: {
        valido: false,
        campo: "nombre",
        trabajadorIndex: 3,
        mensaje: "Trabajador inválido.",
      },
      tarjetas: [],
      container: {},
      cantidadInput: null,
      estadoElement: estado,
      abrirTrabajador() {},
    });

  assert.equal(
    estado.textContent,
    "Trabajador inválido.",
  );

  assert.deepEqual(resultado, {
    valido: false,
    mensaje: "Trabajador inválido.",
  });
});

test("presentarResultadoValidacion localiza y marca los campos inválidos", async () => {
  const { presentarResultadoValidacion } =
    await moduloPromise;

  const casos = [
    {
      campo: "nombre",
      selector:
        '[data-role="nombre"]',
    },
    {
      campo: "codigo",
      selector:
        '[data-role="codigo"]',
    },
    {
      campo: "cargo",
      selector:
        '[data-role="cargo"]',
    },
    {
      campo: "evidencia",
      selector:
        '[data-role="evidencia"]',
    },
    {
      campo: "condicion",
      selector:
        '[data-role="condicion"]',
    },
    {
      campo: "uso",
      selector:
        '[data-role="uso"]',
    },
    {
      campo: "planAccion",
      selector:
        '[data-role="epp-plan-accion"]',
    },
    {
      campo: "fechaPlanAccion",
      selector:
        '[data-role="epp-fecha-plan"]',
    },
  ];

  for (const caso of casos) {
    const estado = crearEstado();
    const campoEsperado = crearCampo();

    const camposGenerales = {
      [caso.selector]: campoEsperado,
    };

    const filaPlan = {
      querySelector(selector) {
        return (
          camposGenerales[selector] ||
          null
        );
      },
    };

    const fila = {
      nextElementSibling: filaPlan,

      querySelector(selector) {
        return (
          camposGenerales[selector] ||
          null
        );
      },
    };

    const tarjeta = {
      querySelector(selector) {
        return (
          camposGenerales[selector] ||
          null
        );
      },

      querySelectorAll(selector) {
        if (
          selector ===
          "tr[data-elemento]"
        ) {
          return [fila];
        }

        return [];
      },
    };

    let tarjetaAbierta;
    let demoraProgramada;

    const resultado =
      presentarResultadoValidacion({
        resultado: {
          valido: false,
          campo: caso.campo,
          trabajadorIndex: 0,
          elementoIndex: 0,
          mensaje: "Campo obligatorio.",
        },
        tarjetas: [tarjeta],
        container: {},
        cantidadInput: null,
        estadoElement: estado,

        abrirTrabajador(
          container,
          elemento,
        ) {
          tarjetaAbierta = elemento;
        },

        programar(callback, demora) {
          demoraProgramada = demora;
          callback();
        },
      });

    assert.strictEqual(
      tarjetaAbierta,
      tarjeta,
      caso.campo,
    );

    assert.equal(
      campoEsperado.classList.contains(
        "campo-error",
      ),
      true,
      caso.campo,
    );

    assert.equal(
      campoEsperado.desplazado,
      true,
      caso.campo,
    );

    assert.equal(
      campoEsperado.enfocado,
      true,
      caso.campo,
    );

    assert.equal(
      demoraProgramada,
      300,
      caso.campo,
    );

    assert.deepEqual(resultado, {
      valido: false,
      mensaje: "Campo obligatorio.",
    });
  }
});