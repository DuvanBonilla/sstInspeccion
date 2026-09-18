const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const rutaReglas = path.resolve(
  __dirname,
  "../../../src/views/js/epp/reglasEpp.js",
);

const rutaValidador = path.resolve(
  __dirname,
  "../../../src/views/js/epp/validators/trabajadoresEpp.validator.js",
);

const codigoReglas = fs.readFileSync(
  rutaReglas,
  "utf8",
);

const urlReglas =
  `data:text/javascript;base64,${
    Buffer.from(codigoReglas).toString("base64")
  }`;

const codigoValidador = fs
  .readFileSync(rutaValidador, "utf8")
  .replace("../reglasEpp.js", urlReglas);

const moduloPromise = import(
  `data:text/javascript;base64,${
    Buffer.from(codigoValidador).toString("base64")
  }`
);

function crearElemento(cambios = {}) {
  return {
    elementoEppId: "1",
    elemento: "Casco",
    condicion: "B",
    uso: "B",
    planAccion: "",
    fechaPlanAccion: "",
    ...cambios,
  };
}

function crearTrabajador(cambios = {}) {
  return {
    trabajadorId: 1,
    indice: 0,
    nombre: "Ana Pérez",
    codigo: "000123",
    cargo: "Operaria",
    elementos: [crearElemento()],
    observaciones: "",
    ...cambios,
  };
}

async function validar(opciones = {}) {
  const { validarTrabajadoresEpp } = await moduloPromise;

  return validarTrabajadoresEpp({
    trabajadores: [crearTrabajador()],
    evidencias: new Set([1]),
    fechaInspeccion: "2026-09-11",
    ...opciones,
  });
}

test("rechaza una lista sin trabajadores", async () => {
  const resultado = await validar({
    trabajadores: [],
  });

  assert.equal(resultado.valido, false);
  assert.equal(resultado.campo, "cantidad");
});

test("valida nombre, código y cargo obligatorios", async () => {
  for (const campo of ["nombre", "codigo", "cargo"]) {
    const resultado = await validar({
      trabajadores: [
        crearTrabajador({
          [campo]: "",
        }),
      ],
    });

    assert.equal(resultado.valido, false);
    assert.equal(resultado.campo, campo);
  }
});

test("exige nombre y apellido", async () => {
  const resultado = await validar({
    trabajadores: [
      crearTrabajador({
        nombre: "Camilo",
      }),
    ],
  });

  assert.equal(resultado.campo, "nombre");
  assert.match(resultado.mensaje, /nombre y un apellido/);
});

test("rechaza caracteres inválidos en el nombre", async () => {
  const resultado = await validar({
    trabajadores: [
      crearTrabajador({
        nombre: "Ana Pérez 2",
      }),
    ],
  });

  assert.equal(resultado.campo, "nombre");
  assert.match(resultado.mensaje, /caracteres especiales/);
});

test("rechaza códigos inválidos", async () => {
  const resultado = await validar({
    trabajadores: [
      crearTrabajador({
        codigo: "12A",
      }),
    ],
  });

  assert.equal(resultado.campo, "codigo");
  assert.match(resultado.mensaje, /únicamente números/);
});

test("rechaza el código 000000", async () => {
  const resultado = await validar({
    trabajadores: [
      crearTrabajador({
        codigo: "000000",
      }),
    ],
  });

  assert.equal(resultado.campo, "codigo");
  assert.match(resultado.mensaje, /000001 y 999999/);
});

test("rechaza códigos duplicados", async () => {
  const resultado = await validar({
    trabajadores: [
      crearTrabajador(),
      crearTrabajador({
        trabajadorId: 2,
      }),
    ],
    evidencias: new Set([1, 2]),
  });

  assert.equal(resultado.campo, "codigo");
  assert.equal(resultado.trabajadorIndex, 1);
  assert.match(resultado.mensaje, /ya fue registrado/);
});

test("exige al menos un elemento EPP", async () => {
  const resultado = await validar({
    trabajadores: [
      crearTrabajador({
        elementos: [],
      }),
    ],
  });

  assert.equal(resultado.campo, "elementos");
});

test("exige condición y uso", async () => {
  const resultadoCondicion = await validar({
    trabajadores: [
      crearTrabajador({
        elementos: [
          crearElemento({
            condicion: "",
          }),
        ],
      }),
    ],
  });

  assert.equal(resultadoCondicion.campo, "condicion");
  assert.equal(resultadoCondicion.elementoIndex, 0);

  const resultadoUso = await validar({
    trabajadores: [
      crearTrabajador({
        elementos: [
          crearElemento({
            uso: "",
          }),
        ],
      }),
    ],
  });

  assert.equal(resultadoUso.campo, "uso");
});

test("exige plan cuando existe una calificación R o M", async () => {
  const resultado = await validar({
    trabajadores: [
      crearTrabajador({
        elementos: [
          crearElemento({
            condicion: "R",
          }),
        ],
      }),
    ],
  });

  assert.equal(resultado.campo, "planAccion");
});

test("exige la fecha límite del plan", async () => {
  const resultado = await validar({
    trabajadores: [
      crearTrabajador({
        elementos: [
          crearElemento({
            uso: "M",
            planAccion: "Cambiar casco",
          }),
        ],
      }),
    ],
  });

  assert.equal(resultado.campo, "fechaPlanAccion");
});

test("rechaza una fecha límite anterior a la inspección", async () => {
  const resultado = await validar({
    trabajadores: [
      crearTrabajador({
        elementos: [
          crearElemento({
            condicion: "R",
            planAccion: "Cambiar casco",
            fechaPlanAccion: "2026-09-10",
          }),
        ],
      }),
    ],
  });

  assert.equal(resultado.campo, "fechaPlanAccion");
  assert.match(resultado.mensaje, /no puede ser anterior/);
});

test("exige evidencia procesada por trabajador", async () => {
  const resultado = await validar({
    evidencias: new Set(),
  });

  assert.equal(resultado.campo, "evidencia");
});

test("acepta un trabajador completo", async () => {
  const resultado = await validar();

  assert.deepEqual(resultado, {
    valido: true,
    mensaje: "",
    campo: null,
    trabajadorIndex: null,
    elementoIndex: null,
  });
});