/**
 * Prueba de navegador del administrador de trabajadores EPP.
 *
 * Utiliza Chrome local, sirve únicamente las vistas y simula el catálogo.
 * No carga controladores ni realiza consultas a la base de datos.
 */

const { test, before, after } = require("node:test");

const assert = require("node:assert/strict");
const path = require("node:path");
const express = require("express");
const { chromium } = require("playwright");

const paginasRoutes = require("../../src/backend/routes/paginas.routes");

let server;
let browser;
let baseUrl;

before(async () => {
  const app = express();

  const viewsDir = path.resolve(__dirname, "..", "..", "src", "views");

  app.get("/api/catalogo-epp", (req, res) => {
    res.json({
      ok: true,
      elementos: [
        {
          id: 1,
          nombre: "Casco de seguridad",
          categoria: "Protección de cabeza",
          predeterminado: true,
        },
        {
          id: 2,
          nombre: "Botas de seguridad",
          categoria: "Protección de pies",
          predeterminado: true,
        },
        {
          id: 3,
          nombre: "Gafas de seguridad",
          categoria: "Protección visual",
          predeterminado: false,
        },
      ],
    });
  });

  app.use(express.static(viewsDir));
  app.use(paginasRoutes);

  await new Promise((resolve, reject) => {
    server = app.listen(0, "127.0.0.1", () => {
      const address = server.address();

      baseUrl = `http://127.0.0.1:${address.port}`;
      resolve();
    });

    server.once("error", reject);
  });

  browser = await chromium.launch({
    channel: "chrome",
    headless: true,
  });
});

after(async () => {
  await browser?.close();

  if (!server) return;

  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
});

test("el administrador EPP conserva su flujo principal", async () => {
  const page = await browser.newPage();

  const erroresPagina = [];

  page.on("pageerror", (error) => {
    erroresPagina.push(error.message);
    console.error("[PAGE ERROR]", error.message);
  });

  try {
    const respuestaCatalogoPromise = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/catalogo-epp") &&
        response.request().method() === "GET",
    );

    await page.goto(`${baseUrl}/inspeccion-epp`);

    const respuestaCatalogo = await respuestaCatalogoPromise;

    assert.equal(respuestaCatalogo.status(), 200);

    await page.evaluate(() => {
      const fecha = document.querySelector("#fecha");

      fecha.value = "2026-09-11";
    });

    await page.evaluate(() => {
      const cantidad = document.querySelector("#cantidadTrabajadores");

      cantidad.value = "2";

      document.querySelector("#btn-generar-trabajadores").click();
    });

    await page.waitForFunction(() => {
      return document.querySelectorAll(".trabajador-card").length === 2;
    });

    const estadoInicial = await page.evaluate(() => {
      const tarjetas = Array.from(
        document.querySelectorAll(".trabajador-card"),
      );

      return {
        cantidad: tarjetas.length,

        numeracion: tarjetas.map((tarjeta) =>
          tarjeta
            .querySelector('[data-role="numeroTrabajador"]')
            ?.textContent.trim(),
        ),

        filasPorTrabajador: tarjetas.map(
          (tarjeta) => tarjeta.querySelectorAll("tr[data-elemento]").length,
        ),

        tarjetasAbiertas: tarjetas.filter(
          (tarjeta) => !tarjeta.classList.contains("trabajador-collapsed"),
        ).length,
      };
    });

    assert.deepEqual(estadoInicial, {
      cantidad: 2,
      numeracion: ["Trabajador 1", "Trabajador 2"],
      filasPorTrabajador: [2, 2],
      tarjetasAbiertas: 1,
    });

    const estadoPlanVisible = await page.evaluate(() => {
      const tarjeta = document.querySelector(".trabajador-card");

      const fila = tarjeta.querySelector("tr[data-elemento]");

      const condicion = fila.querySelector('[data-role="condicion"]');

      const uso = fila.querySelector('[data-role="uso"]');

      condicion.value = "R";
      uso.value = "B";

      condicion.dispatchEvent(
        new Event("change", {
          bubbles: true,
        }),
      );

      const filaPlan = fila.nextElementSibling;

      return {
        visible: !filaPlan.hidden,
        fechaMinima: filaPlan.querySelector('[data-role="epp-fecha-plan"]').min,
      };
    });

    assert.equal(estadoPlanVisible.visible, true);

    // Comportamiento actual: actualizarPlanElemento busca
    // [name="fecha"], pero el HTML solo define id="fecha".
    assert.equal(estadoPlanVisible.fechaMinima, "");

    const estadoPlanOculto = await page.evaluate(() => {
      const tarjeta = document.querySelector(".trabajador-card");

      const fila = tarjeta.querySelector("tr[data-elemento]");

      const filaPlan = fila.nextElementSibling;

      const condicion = fila.querySelector('[data-role="condicion"]');

      const uso = fila.querySelector('[data-role="uso"]');

      const plan = filaPlan.querySelector('[data-role="epp-plan-accion"]');

      const fecha = filaPlan.querySelector('[data-role="epp-fecha-plan"]');

      plan.value = "Reemplazar elemento";
      fecha.value = fecha.min;

      condicion.value = "B";
      uso.value = "B";

      condicion.dispatchEvent(
        new Event("change", {
          bubbles: true,
        }),
      );

      return {
        oculto: filaPlan.hidden,
        plan: plan.value,
        fecha: fecha.value,
      };
    });

    assert.deepEqual(estadoPlanOculto, {
      oculto: true,
      plan: "",
      fecha: "",
    });

    await page.evaluate(() => {
      const tarjeta = document.querySelector(".trabajador-card");

      tarjeta.querySelector(".btn-toggle-catalogo-epp").click();

      const buscador = tarjeta.querySelector(".epp-catalogo-buscador");

      buscador.value = "Gafas";

      buscador.dispatchEvent(
        new Event("input", {
          bubbles: true,
        }),
      );
    });

    await page.waitForFunction(
      () => {
        return Boolean(
          document.querySelector(
            '.epp-catalogo-checkbox[data-elemento-epp-id="3"]',
          ),
        );
      },
      null,
      {
        timeout: 5000,
      },
    );

    await page.evaluate(() => {
      const tarjeta = document.querySelector(".trabajador-card");

      tarjeta
        .querySelector('.epp-catalogo-checkbox[data-elemento-epp-id="3"]')
        .click();
    });

    await page.waitForTimeout(20);

    await page.evaluate(() => {
      const tarjeta = document.querySelector(".trabajador-card");

      tarjeta.querySelector(".epp-catalogo-agregar-seleccionados").click();
    });

    const filasDespuesDeAgregar = await page
      .locator(".trabajador-card")
      .first()
      .locator("tr[data-elemento]")
      .count();

    assert.equal(filasDespuesDeAgregar, 3);

    await page.evaluate(() => {
      const tarjeta = document.querySelector(".trabajador-card");

      const fila = tarjeta.querySelector('tr[data-elemento-epp-id="3"]');

      fila.querySelector('[data-action="eliminar-epp"]').click();
    });

    const filasDespuesDeEliminar = await page
      .locator(".trabajador-card")
      .first()
      .locator("tr[data-elemento]")
      .count();

    assert.equal(filasDespuesDeEliminar, 2);

    await page.evaluate(() => {
      document.querySelector("#btn-agregar-trabajador").click();
    });

    assert.equal(await page.locator(".trabajador-card").count(), 3);

    await page.evaluate(() => {
      const tarjetas = document.querySelectorAll(".trabajador-card");

      tarjetas[2].querySelector('[data-action="eliminar-trabajador"]').click();
    });

    const numeracionFinal = await page.evaluate(() => {
      return Array.from(
        document.querySelectorAll('[data-role="numeroTrabajador"]'),
      ).map((elemento) => elemento.textContent.trim());
    });

    assert.deepEqual(numeracionFinal, ["Trabajador 1", "Trabajador 2"]);

    assert.deepEqual(erroresPagina, []);
  } finally {
    await page.close();
  }
});
