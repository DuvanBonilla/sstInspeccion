const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const rutaModulo = path.resolve(
  __dirname,
  "../../../src/views/js/epp/inspeccionEpp.api.js",
);

const codigoModulo = fs.readFileSync(rutaModulo, "utf8");

const moduloPromise = import(
  `data:text/javascript;base64,${Buffer.from(codigoModulo).toString("base64")}`,
);

test("enviarInspeccionEpp realiza la solicitud esperada", async () => {
  const { enviarInspeccionEpp } = await moduloPromise;

  const formData = {};
  let solicitudRecibida;

  const resultado = await enviarInspeccionEpp(formData, {
    async solicitar(url, opciones) {
      solicitudRecibida = {
        url,
        opciones,
      };

      return {
        ok: true,

        async json() {
          return {
            ok: true,
            inspeccionId: "EPP-123",
          };
        },
      };
    },
  });

  assert.equal(
    solicitudRecibida.url,
    "/enviar-inspeccion-epp",
  );

  assert.deepEqual(solicitudRecibida.opciones, {
    method: "POST",
    body: formData,
  });

  assert.deepEqual(resultado, {
    ok: true,
    inspeccionId: "EPP-123",
  });
});

test("enviarInspeccionEpp informa el mensaje enviado por el backend", async () => {
  const { enviarInspeccionEpp } = await moduloPromise;

  await assert.rejects(
    enviarInspeccionEpp({}, {
      async solicitar() {
        return {
          ok: false,

          async json() {
            return {
              ok: false,
              mensaje: "La inspección no es válida.",
            };
          },
        };
      },
    }),
    {
      name: "Error",
      message: "La inspección no es válida.",
    },
  );
});

test("enviarInspeccionEpp usa el mensaje predeterminado", async () => {
  const { enviarInspeccionEpp } = await moduloPromise;

  await assert.rejects(
    enviarInspeccionEpp({}, {
      async solicitar() {
        return {
          ok: true,

          async json() {
            return {
              ok: false,
            };
          },
        };
      },
    }),
    {
      name: "Error",
      message:
        "No fue posible registrar la inspección EPP.",
    },
  );
});

test("enviarInspeccionEpp propaga errores de red", async () => {
  const { enviarInspeccionEpp } = await moduloPromise;

  await assert.rejects(
    enviarInspeccionEpp({}, {
      async solicitar() {
        throw new Error("Error de conexión.");
      },
    }),
    {
      name: "Error",
      message: "Error de conexión.",
    },
  );
});