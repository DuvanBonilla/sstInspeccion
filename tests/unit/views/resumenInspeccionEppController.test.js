const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function cargarModulo(rutaRelativa) {
  const ruta = path.resolve(
    __dirname,
    rutaRelativa,
  );

  const codigo = fs.readFileSync(
    ruta,
    "utf8",
  );

  return import(
    `data:text/javascript;base64,${Buffer.from(codigo).toString("base64")}`,
  );
}

const controladorPromise = cargarModulo(
  "../../../src/views/js/epp/controllers/resumenInspeccionEpp.controller.js",
);

const plantillaPromise = cargarModulo(
  "../../../src/views/js/epp/resumenEpp.template.js",
);

function crearElemento() {
  const hijos = [];

  return {
    textContent: "",
    innerHTML: "",
    className: "",
    hijos,

    appendChild(elemento) {
      hijos.push(elemento);
    },
  };
}

function crearDocumento() {
  const elementos = new Map();

  return {
    elementos,

    getElementById(id) {
      if (!elementos.has(id)) {
        elementos.set(
          id,
          crearElemento(),
        );
      }

      return elementos.get(id);
    },

    createElement() {
      return crearElemento();
    },
  };
}

test("escaparHtml protege caracteres especiales", async () => {
  const { escaparHtml } =
    await plantillaPromise;

  assert.equal(
    escaparHtml(
      `<Ana & "Carlos" 'SST'>`,
    ),
    "&lt;Ana &amp; &quot;Carlos&quot; &#039;SST&#039;&gt;",
  );
});

test("crearResumenTrabajadorHtml representa los datos actuales", async () => {
  const { crearResumenTrabajadorHtml } =
    await plantillaPromise;

  const html =
    crearResumenTrabajadorHtml({
      trabajador: {
        indice: 0,
        nombre: "<Ana>",
        codigo: "000123",
        cargo: "Operaria",
        elementos: [{}, {}],
        planAccion: true,
      },
      cantidadNovedades: 1,
      tieneEvidencia: true,
    });

  assert.match(
    html,
    /Trabajador 1/,
  );

  assert.match(
    html,
    /&lt;Ana&gt;/,
  );

  assert.match(
    html,
    /000123/,
  );

  assert.match(
    html,
    /Operaria/,
  );

  assert.match(
    html,
    /Registrado/,
  );

  assert.match(
    html,
    /Registrada/,
  );

  assert.doesNotMatch(
    html,
    /<Ana>/,
  );
});

test("construirResumenGeneral conserva las asignaciones actuales", async () => {
  const {
    crearResumenInspeccionEpp,
  } = await controladorPromise;

  const documento = crearDocumento();

  const valores = {
    fecha: "2026-09-14",
    sedeOperacion: "Urabá",
    areaTrabajo: "Operaciones",
    jefeResponsable: "Carlos Gómez",
    cargoJefe: "Jefe",
    responsableInspeccion: "Laura Díaz",
    cargoResponsable: "",
  };

  const resumen =
    crearResumenInspeccionEpp({
      documento,

      obtenerValor(id) {
        return valores[id] ?? "";
      },

      leerTrabajadores() {
        return [];
      },

      obtenerEvidencias() {
        return [];
      },

      esNovedadEpp() {
        return false;
      },

      crearResumenTrabajadorHtml() {
        return "";
      },
    });

  resumen.construirResumenGeneral();

  assert.equal(
    documento.getElementById(
      "resumen-fecha",
    ).textContent,
    "2026-09-14",
  );

  assert.equal(
    documento.getElementById(
      "resumen-sede",
    ).textContent,
    "Urabá",
  );

  assert.equal(
    documento.getElementById(
      "resumen-responsable",
    ).textContent,
    "Laura Díaz",
  );

  assert.equal(
    documento.getElementById(
      "resumen-cargo-responsable",
    ).textContent,
    "—",
  );
});

test("construirResumenTrabajadores representa tarjetas y totales", async () => {
  const {
    crearResumenInspeccionEpp,
  } = await controladorPromise;

  const documento = crearDocumento();
  const plantillasRecibidas = [];

  const trabajadores = [
    {
      trabajadorId: 10,
      indice: 0,
      nombre: "Ana",
      codigo: "000123",
      cargo: "Operaria",
      planAccion: true,
      elementos: [
        {
          condicion: "R",
          uso: "B",
        },
        {
          condicion: "B",
          uso: "B",
        },
      ],
    },
    {
      trabajadorId: 20,
      indice: 1,
      nombre: "Carlos",
      codigo: "000456",
      cargo: "Auxiliar",
      planAccion: false,
      elementos: [
        {
          condicion: "B",
          uso: "B",
        },
      ],
    },
  ];

  const resumen =
    crearResumenInspeccionEpp({
      documento,

      obtenerValor() {
        return "";
      },

      leerTrabajadores() {
        return trabajadores;
      },

      obtenerEvidencias() {
        return [
          {
            trabajadorId: 10,
            archivo: {},
          },
        ];
      },

      esNovedadEpp(condicion, uso) {
        return (
          condicion === "R" ||
          uso === "R"
        );
      },

      crearResumenTrabajadorHtml(
        parametros,
      ) {
        plantillasRecibidas.push(
          parametros,
        );

        return `<div>${parametros.trabajador.nombre}</div>`;
      },
    });

  resumen.construirResumenTrabajadores();

  const container =
    documento.getElementById(
      "resumen-trabajadores",
    );

  assert.equal(
    container.hijos.length,
    2,
  );

  assert.equal(
    container.hijos[0].className,
    "resumen-trabajador-card",
  );

  assert.equal(
    plantillasRecibidas[0]
      .cantidadNovedades,
    1,
  );

  assert.equal(
    plantillasRecibidas[0]
      .tieneEvidencia,
    true,
  );

  assert.equal(
    plantillasRecibidas[1]
      .cantidadNovedades,
    0,
  );

  assert.equal(
    plantillasRecibidas[1]
      .tieneEvidencia,
    false,
  );

  assert.equal(
    documento.getElementById(
      "resumen-total-trabajadores",
    ).textContent,
    2,
  );

  assert.equal(
    documento.getElementById(
      "resumen-trabajadores-novedad",
    ).textContent,
    1,
  );

  assert.equal(
    documento.getElementById(
      "resumen-trabajadores-sin-novedad",
    ).textContent,
    1,
  );

  assert.equal(
    documento.getElementById(
      "resumen-total-novedades",
    ).textContent,
    1,
  );
});