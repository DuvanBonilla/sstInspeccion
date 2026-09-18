const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const rutaModulo = path.resolve(
  __dirname,
  "../../../src/views/js/epp/trabajadoresEpp.reader.js",
);

const codigoModulo = fs.readFileSync(rutaModulo, "utf8");

const moduloPromise = import(
  `data:text/javascript;base64,${Buffer.from(codigoModulo).toString("base64")}`
);

function crearCampo(value) {
  return { value };
}

function crearFila({
  id = "10",
  nombre = "Casco",
  condicion = "B",
  uso = "R",
  planAccion = "Reemplazar",
  fechaPlanAccion = "2026-09-30",
  conPlan = true,
} = {}) {
  const campos = {
    '[data-role="condicion"]': crearCampo(condicion),
    '[data-role="uso"]': crearCampo(uso),
    ".epp-nombre": {
      textContent: nombre,
    },
  };

  const camposPlan = {
    '[data-role="epp-plan-accion"]':
      crearCampo(planAccion),
    '[data-role="epp-fecha-plan"]':
      crearCampo(fechaPlanAccion),
  };

  return {
    dataset: {
      elementoEppId: id,
      elemento: nombre,
    },
    querySelector(selector) {
      return campos[selector] || null;
    },
    nextElementSibling: conPlan
      ? {
          classList: {
            contains(clase) {
              return clase === "epp-plan-row";
            },
          },
          querySelector(selector) {
            return camposPlan[selector] || null;
          },
        }
      : null,
  };
}

function crearTarjeta({
  trabajadorId = "3",
  nombre = " Ana Pérez ",
  codigo = " 000123 ",
  cargo = " Operaria ",
  observaciones = " Sin novedad ",
  filas = [crearFila()],
} = {}) {
  const campos = {
    '[data-role="nombre"]': crearCampo(nombre),
    '[data-role="codigo"]': crearCampo(codigo),
    '[data-role="cargo"]': crearCampo(cargo),
    '[data-role="observaciones"]':
      crearCampo(observaciones),
  };

  return {
    dataset: { trabajadorId },
    querySelector(selector) {
      return campos[selector] || null;
    },
    querySelectorAll(selector) {
      return selector === "tr[data-elemento]"
        ? filas
        : [];
    },
  };
}

function crearContainer(tarjetas) {
  return {
    querySelectorAll(selector) {
      return selector === ".trabajador-card"
        ? tarjetas
        : [];
    },
  };
}

test("leerElementoEpp conserva la estructura actual", async () => {
  const { leerElementoEpp } = await moduloPromise;

  const resultado = leerElementoEpp(crearFila(), 2);

  assert.deepEqual(resultado, {
    indice: 2,
    elementoEppId: 10,
    elemento: "Casco",
    condicion: "B",
    uso: "R",
    planAccion: "Reemplazar",
    fechaPlanAccion: "2026-09-30",
  });
});

test("leerElementoEpp devuelve plan vacío cuando no existe su fila", async () => {
  const { leerElementoEpp } = await moduloPromise;

  const resultado = leerElementoEpp(
    crearFila({ conPlan: false }),
    0,
  );

  assert.equal(resultado.planAccion, "");
  assert.equal(resultado.fechaPlanAccion, "");
});

test("leerTrabajadorEpp normaliza espacios externos", async () => {
  const { leerTrabajadorEpp } = await moduloPromise;

  const resultado = leerTrabajadorEpp(
    crearTarjeta(),
    1,
  );

  assert.equal(resultado.trabajadorId, 3);
  assert.equal(resultado.indice, 1);
  assert.equal(resultado.nombre, "Ana Pérez");
  assert.equal(resultado.codigo, "000123");
  assert.equal(resultado.cargo, "Operaria");
  assert.equal(resultado.observaciones, "Sin novedad");
  assert.equal(resultado.elementos.length, 1);
});

test("leerTrabajadoresEpp conserva el orden actual", async () => {
  const { leerTrabajadoresEpp } = await moduloPromise;

  const resultado = leerTrabajadoresEpp(
    crearContainer([
      crearTarjeta({ trabajadorId: "8" }),
      crearTarjeta({ trabajadorId: "4" }),
    ]),
  );

  assert.deepEqual(
    resultado.map((trabajador) => ({
      trabajadorId: trabajador.trabajadorId,
      indice: trabajador.indice,
    })),
    [
      { trabajadorId: 8, indice: 0 },
      { trabajadorId: 4, indice: 1 },
    ],
  );
});

test("obtenerEvidenciasTrabajadoresEpp relaciona archivo e índice", async () => {
  const {
    obtenerEvidenciasTrabajadoresEpp,
  } = await moduloPromise;

  const archivo = { name: "evidencia.jpg" };

  const resultado = obtenerEvidenciasTrabajadoresEpp(
    crearContainer([
      crearTarjeta({ trabajadorId: "8" }),
      crearTarjeta({ trabajadorId: "4" }),
    ]),
    new Map([[4, archivo]]),
  );

  assert.deepEqual(resultado, [
    {
      trabajadorId: 4,
      indice: 1,
      archivo,
    },
  ]);
});

test("obtenerEvidenciasTrabajadoresEpp omite trabajadores sin archivo", async () => {
  const {
    obtenerEvidenciasTrabajadoresEpp,
  } = await moduloPromise;

  const resultado = obtenerEvidenciasTrabajadoresEpp(
    crearContainer([crearTarjeta()]),
    new Map(),
  );

  assert.deepEqual(resultado, []);
});