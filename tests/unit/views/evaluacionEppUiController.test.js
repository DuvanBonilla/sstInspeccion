const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const rutaModulo = path.resolve(
  __dirname,
  "../../../src/views/js/epp/controllers/evaluacionEppUi.controller.js",
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

function crearCampo(value = "") {
  const clasesEliminadas = [];

  return {
    value,

    classList: {
      remove(clase) {
        clasesEliminadas.push(clase);
      },
    },

    removeAttribute(atributo) {
      delete this[atributo];
    },

    clasesEliminadas,
  };
}

function crearEscenarioEvaluacion({
  condicion = "B",
  uso = "B",
  planAccion = "Corregir elemento",
  fechaPlan = "2026-09-30",
  conFilaPlan = true,
} = {}) {
  const campoCondicion = crearCampo(condicion);
  const campoUso = crearCampo(uso);
  const plan = crearCampo(planAccion);
  const fecha = crearCampo(fechaPlan);

  const filaPlan = {
    hidden: true,

    classList: {
      contains(clase) {
        return clase === "epp-plan-row";
      },
    },

    querySelector(selector) {
      if (
        selector ===
        '[data-role="epp-plan-accion"]'
      ) {
        return plan;
      }

      if (
        selector ===
        '[data-role="epp-fecha-plan"]'
      ) {
        return fecha;
      }

      return null;
    },
  };

  const fila = {
    nextElementSibling: conFilaPlan
      ? filaPlan
      : null,

    querySelector(selector) {
      if (
        selector ===
        '[data-role="condicion"]'
      ) {
        return campoCondicion;
      }

      if (
        selector ===
        '[data-role="uso"]'
      ) {
        return campoUso;
      }

      return null;
    },
  };

  return {
    fila,
    filaPlan,
    campoCondicion,
    campoUso,
    plan,
    fecha,
  };
}

test("actualizarPlanElemento admite una fila ausente", async () => {
  const { actualizarPlanElemento } =
    await moduloPromise;

  assert.doesNotThrow(() => {
    actualizarPlanElemento(null, {
      requierePlanAccion() {
        return false;
      },
      fechaInspeccion: "",
    });
  });
});

test("actualizarPlanElemento muestra el plan requerido", async () => {
  const { actualizarPlanElemento } =
    await moduloPromise;

  const escenario = crearEscenarioEvaluacion({
    condicion: "R",
    uso: "B",
  });

  let valoresEvaluados;

  actualizarPlanElemento(
    escenario.fila,
    {
      requierePlanAccion(condicion, uso) {
        valoresEvaluados = {
          condicion,
          uso,
        };

        return true;
      },

      fechaInspeccion: "2026-09-11",
    },
  );

  assert.deepEqual(valoresEvaluados, {
    condicion: "R",
    uso: "B",
  });

  assert.equal(
    escenario.filaPlan.hidden,
    false,
  );

  assert.equal(
    escenario.fecha.min,
    "2026-09-11",
  );

  assert.equal(
    escenario.plan.value,
    "Corregir elemento",
  );

  assert.equal(
    escenario.fecha.value,
    "2026-09-30",
  );
});

test("actualizarPlanElemento limpia un plan que deja de ser requerido", async () => {
  const { actualizarPlanElemento } =
    await moduloPromise;

  const escenario = crearEscenarioEvaluacion({
    condicion: "B",
    uso: "NA",
  });

  escenario.fecha.min = "2026-09-01";

  actualizarPlanElemento(
    escenario.fila,
    {
      requierePlanAccion() {
        return false;
      },

      fechaInspeccion: "",
    },
  );

  assert.equal(
    escenario.filaPlan.hidden,
    true,
  );

  assert.equal(escenario.plan.value, "");
  assert.equal(escenario.fecha.value, "");
  assert.equal(escenario.fecha.min, undefined);

  assert.deepEqual(
    escenario.plan.clasesEliminadas,
    ["campo-error"],
  );

  assert.deepEqual(
    escenario.fecha.clasesEliminadas,
    ["campo-error"],
  );
});

test("actualizarPlanElemento ignora una fila sin plan asociado", async () => {
  const { actualizarPlanElemento } =
    await moduloPromise;

  const escenario = crearEscenarioEvaluacion({
    conFilaPlan: false,
  });

  let reglaEjecutada = false;

  actualizarPlanElemento(
    escenario.fila,
    {
      requierePlanAccion() {
        reglaEjecutada = true;

        return true;
      },

      fechaInspeccion: "2026-09-11",
    },
  );

  assert.equal(reglaEjecutada, false);
});

test("manejarCambioCalificacionEpp ignora eventos ajenos", async () => {
  const { manejarCambioCalificacionEpp } =
    await moduloPromise;

  const resultado =
    manejarCambioCalificacionEpp(
      {
        target: {
          closest() {
            return null;
          },
        },
      },
      {
        requierePlanAccion() {
          return false;
        },

        obtenerFechaInspeccion() {
          return "";
        },
      },
    );

  assert.equal(resultado, false);
});

test("manejarCambioCalificacionEpp ignora una calificación sin fila", async () => {
  const { manejarCambioCalificacionEpp } =
    await moduloPromise;

  const select = {
    closest() {
      return null;
    },
  };

  const resultado =
    manejarCambioCalificacionEpp(
      {
        target: {
          closest(selector) {
            if (
              selector ===
              ".epp-calificacion"
            ) {
              return select;
            }

            return null;
          },
        },
      },
      {
        requierePlanAccion() {
          return false;
        },

        obtenerFechaInspeccion() {
          return "";
        },
      },
    );

  assert.equal(resultado, false);
});

test("manejarCambioCalificacionEpp actualiza la evaluación encontrada", async () => {
  const { manejarCambioCalificacionEpp } =
    await moduloPromise;

  const escenario = crearEscenarioEvaluacion({
    condicion: "M",
    uso: "B",
  });

  const select = {
    closest(selector) {
      if (selector === "tr[data-elemento]") {
        return escenario.fila;
      }

      return null;
    },
  };

  let fechaConsultada = false;
  let valoresEvaluados;

  const resultado =
    manejarCambioCalificacionEpp(
      {
        target: {
          closest(selector) {
            if (
              selector ===
              ".epp-calificacion"
            ) {
              return select;
            }

            return null;
          },
        },
      },
      {
        requierePlanAccion(condicion, uso) {
          valoresEvaluados = {
            condicion,
            uso,
          };

          return true;
        },

        obtenerFechaInspeccion() {
          fechaConsultada = true;

          return "2026-09-11";
        },
      },
    );

  assert.equal(resultado, true);
  assert.equal(fechaConsultada, true);

  assert.deepEqual(valoresEvaluados, {
    condicion: "M",
    uso: "B",
  });

  assert.equal(
    escenario.filaPlan.hidden,
    false,
  );

  assert.equal(
    escenario.fecha.min,
    "2026-09-11",
  );
});