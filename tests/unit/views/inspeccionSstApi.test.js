const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const rutaModulo = path.resolve(
  __dirname,
  "../../../src/views/js/sst/inspeccionSst.api.js",
);

const codigoModulo = fs.readFileSync(rutaModulo, "utf8");

const moduloPromise = import(
  `data:text/javascript;base64,${
    Buffer.from(codigoModulo).toString("base64")
  }`
);

test("enviarInspeccionSst envía el FormData al endpoint esperado", async () => {
  const { enviarInspeccionSst } = await moduloPromise;

  const formData = {};
  let solicitud;

  const resultado = await enviarInspeccionSst(formData, {
    async fetchImpl(url, opciones) {
      solicitud = {
        url,
        opciones,
      };

      return {
        ok: true,
      };
    },

    async leerRespuesta() {
      return {
        numInspeccion: 25,
      };
    },
  });

  assert.equal(
    solicitud.url,
    "/enviar-onedrive-extintor",
  );

  assert.equal(solicitud.opciones.method, "POST");
  assert.strictEqual(solicitud.opciones.body, formData);

  assert.deepEqual(resultado, {
    numInspeccion: 25,
  });
});

test("enviarInspeccionSst informa los errores recibidos", async () => {
  const { enviarInspeccionSst } = await moduloPromise;

  await assert.rejects(
    enviarInspeccionSst({}, {
      async fetchImpl() {
        return {
          ok: false,
        };
      },

      async leerRespuesta() {
        return {
          errores: [
            "La fecha es obligatoria",
            "La sede es obligatoria",
          ],
        };
      },
    }),
    {
      message:
        "La fecha es obligatoria | La sede es obligatoria",
    },
  );
});

test("enviarInspeccionSst usa el mensaje predeterminado", async () => {
  const { enviarInspeccionSst } = await moduloPromise;

  await assert.rejects(
    enviarInspeccionSst({}, {
      async fetchImpl() {
        return {
          ok: false,
        };
      },

      async leerRespuesta() {
        return {};
      },
    }),
    {
      message: "Error al guardar la inspección",
    },
  );
});

test("enviarInspeccionSst propaga errores de red", async () => {
  const { enviarInspeccionSst } = await moduloPromise;

  await assert.rejects(
    enviarInspeccionSst({}, {
      async fetchImpl() {
        throw new Error("Sin conexión");
      },

      async leerRespuesta() {
        return {};
      },
    }),
    {
      message: "Sin conexión",
    },
  );
});