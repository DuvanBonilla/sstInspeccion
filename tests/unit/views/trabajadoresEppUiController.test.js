const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const rutaModulo = path.resolve(
  __dirname,
  "../../../src/views/js/epp/controllers/trabajadoresEppUi.controller.js",
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

function crearTarjeta() {
  const numero = {
    textContent: "",
  };

  const icono = {
    textContent: "",
  };

  return {
    classList: crearClassList([
      "trabajador-collapsed",
    ]),

    querySelector(selector) {
      if (
        selector ===
        '[data-role="numeroTrabajador"]'
      ) {
        return numero;
      }

      if (
        selector ===
        '[data-role="toggleIcon"]'
      ) {
        return icono;
      }

      return null;
    },

    numero,
    icono,
  };
}

test("actualizarNombreResumen muestra el nombre diligenciado", async () => {
  const { actualizarNombreResumen } =
    await moduloPromise;

  const resumen = {
    textContent: "",
  };

  const tarjeta = {
    querySelector(selector) {
      if (
        selector ===
        '[data-role="nombreResumen"]'
      ) {
        return resumen;
      }

      return null;
    },
  };

  const input = {
    value: "  Ana Pérez  ",

    closest(selector) {
      if (selector === ".trabajador-card") {
        return tarjeta;
      }

      return null;
    },
  };

  const resultado =
    actualizarNombreResumen(input);

  assert.equal(resultado, true);
  assert.equal(
    resumen.textContent,
    "Ana Pérez",
  );

  input.value = "   ";

  actualizarNombreResumen(input);

  assert.equal(
    resumen.textContent,
    "Sin diligenciar",
  );
});

test("actualizarNombreResumen admite una tarjeta ausente", async () => {
  const { actualizarNombreResumen } =
    await moduloPromise;

  const resultado =
    actualizarNombreResumen({
      value: "Ana",

      closest() {
        return null;
      },
    });

  assert.equal(resultado, false);
});

test("actualizarNumeracion actualiza las tarjetas y devuelve la cantidad", async () => {
  const { actualizarNumeracion } =
    await moduloPromise;

  const tarjetas = [
    crearTarjeta(),
    crearTarjeta(),
  ];

  const container = {
    querySelectorAll(selector) {
      if (selector === ".trabajador-card") {
        return tarjetas;
      }

      return [];
    },
  };

  const cantidad =
    actualizarNumeracion(container);

  assert.equal(cantidad, 2);

  assert.equal(
    tarjetas[0].numero.textContent,
    "Trabajador 1",
  );

  assert.equal(
    tarjetas[1].numero.textContent,
    "Trabajador 2",
  );
});

test("abrirTrabajador abre una tarjeta y minimiza las demás", async () => {
  const { abrirTrabajador } =
    await moduloPromise;

  const primera = crearTarjeta();
  const segunda = crearTarjeta();

  const container = {
    querySelectorAll(selector) {
      if (selector === ".trabajador-card") {
        return [primera, segunda];
      }

      return [];
    },
  };

  const resultado = abrirTrabajador(
    container,
    segunda,
  );

  assert.equal(resultado, true);

  assert.equal(
    primera.classList.contains(
      "trabajador-collapsed",
    ),
    true,
  );

  assert.equal(
    primera.icono.textContent,
    "▶",
  );

  assert.equal(
    segunda.classList.contains(
      "trabajador-collapsed",
    ),
    false,
  );

  assert.equal(
    segunda.icono.textContent,
    "▼",
  );
});

test("crearTrabajador construye la tarjeta con sus elementos iniciales", async () => {
  const { crearTrabajador } =
    await moduloPromise;

  const card = {
    className: "",
    dataset: {},
    innerHTML: "",
    classList: crearClassList(),
  };

  const documento = {
    createElement(etiqueta) {
      assert.equal(etiqueta, "article");

      return card;
    },
  };

  const llamadasFilas = [];
  let contenidoRecibido;

  const resultado = crearTrabajador({
    documento,
    trabajadorId: 7,

    elementosPredeterminados: [
      { id: 10, elemento: "Casco" },
      { id: 20, elemento: "Guantes" },
    ],

    crearFilaEpp(
      elemento,
      indice,
      valores,
    ) {
      llamadasFilas.push({
        elemento,
        indice,
        valores,
      });

      return `<tr>${elemento.elemento}</tr>`;
    },

    valoresCalificacion: [
      "B",
      "R",
      "M",
      "NA",
    ],

    crearPanelCatalogoEpp() {
      return "<div>Catálogo</div>";
    },

    crearContenidoTrabajador(contenido) {
      contenidoRecibido = contenido;

      return [
        contenido.filasEppHtml,
        contenido.panelCatalogoHtml,
      ].join("");
    },
  });

  assert.strictEqual(resultado, card);

  assert.equal(
    card.className,
    "trabajador-card",
  );

  assert.equal(
    card.dataset.trabajadorId,
    7,
  );

  assert.equal(
    contenidoRecibido.filasEppHtml,
    "<tr>Casco</tr><tr>Guantes</tr>",
  );

  assert.equal(
    contenidoRecibido.panelCatalogoHtml,
    "<div>Catálogo</div>",
  );

  assert.equal(
    card.classList.contains(
      "trabajador-collapsed",
    ),
    true,
  );

  assert.equal(llamadasFilas.length, 2);
});