const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const codigo = fs.readFileSync(
  path.resolve("src/views/js/shared/estadoEnvioAprobacion.js"),
  "utf8",
);

const modulo = import(
  `data:text/javascript;base64,${Buffer.from(codigo).toString("base64")}`
);

function crearClassList() {
  const clases = new Set();

  return {
    add(clase) {
      clases.add(clase);
    },
    contains(clase) {
      return clases.has(clase);
    },
  };
}

function crearEscenario() {
  const elementos = {};

  for (const rol of ["jefe", "copasst"]) {
    const bloque = {
      aviso: null,
      querySelector() {
        return this.aviso;
      },
      appendChild(aviso) {
        this.aviso = aviso;
      },
    };

    elementos[`bloque-${rol}`] = bloque;
    elementos[`btn-compartir-aprobacion-${rol}`] = {
      dataset: { metodo: rol === "jefe" ? "whatsapp" : "correo" },
      classList: crearClassList(),
    };
  }

  return {
    elementos,
    documento: {
      getElementById(id) {
        return elementos[id] || null;
      },
      createElement() {
        return {
          dataset: {},
          textContent: "",
          hidden: false,
          setAttribute() {},
        };
      },
    },
  };
}

test("correo enviado oculta mailto sin ocultar WhatsApp", async () => {
  const { mostrarEstadoEnvioAprobacion } = await modulo;
  const { documento, elementos } = crearEscenario();

  mostrarEstadoEnvioAprobacion(documento, {
    jefe: "manual",
    copasst: "enviado",
  });

  assert.equal(
    elementos["btn-compartir-aprobacion-jefe"].classList.contains("hidden"),
    false,
  );
  assert.equal(
    elementos["btn-compartir-aprobacion-copasst"].classList.contains("hidden"),
    true,
  );
  assert.match(elementos["bloque-copasst"].aviso.textContent, /correo/i);
});

test("correo fallido conserva la alternativa manual", async () => {
  const { mostrarEstadoEnvioAprobacion } = await modulo;
  const { documento, elementos } = crearEscenario();

  mostrarEstadoEnvioAprobacion(documento, {
    jefe: "manual",
    copasst: "fallido",
  });

  assert.equal(
    elementos["btn-compartir-aprobacion-copasst"].classList.contains("hidden"),
    false,
  );
  assert.match(
    elementos["bloque-copasst"].aviso.textContent,
    /manualmente/i,
  );
});