const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const rutaModulo = path.resolve(
  __dirname,
  "../../../src/views/js/epp/evaluacionEpp.templates.js",
);

const codigoModulo = fs.readFileSync(rutaModulo, "utf8");

const moduloPromise = import(
  `data:text/javascript;base64,${Buffer.from(codigoModulo).toString("base64")}`
);

const VALORES = ["B", "R", "M", "NA"];

test("crearSelectCalificacion conserva el rol recibido", async () => {
  const { crearSelectCalificacion } = await moduloPromise;

  const html = crearSelectCalificacion("condicion", VALORES);

  assert.match(html, /class="epp-calificacion"/);
  assert.match(html, /data-role="condicion"/);
});

test("crearSelectCalificacion incluye las calificaciones recibidas", async () => {
  const { crearSelectCalificacion } = await moduloPromise;

  const html = crearSelectCalificacion("uso", VALORES);

  for (const valor of VALORES) {
    assert.match(
      html,
      new RegExp(`<option value="${valor}">`),
    );
  }
});

test("crearSelectCalificacion admite una lista ausente", async () => {
  const { crearSelectCalificacion } = await moduloPromise;

  const html = crearSelectCalificacion("uso");

  assert.match(html, /data-role="uso"/);
  assert.doesNotMatch(html, /<option value="B">/);
});

test("crearFilaEpp representa el identificador, índice y nombre", async () => {
  const { crearFilaEpp } = await moduloPromise;

  const html = crearFilaEpp(
    {
      elementoEppId: 12,
      elemento: "Casco",
    },
    3,
    VALORES,
  );

  assert.match(html, /data-epp-index="3"/);
  assert.match(html, /data-elemento-epp-id="12"/);
  assert.match(html, /data-elemento="Casco"/);
  assert.match(html, />\s*Casco\s*</);
});

test("crearFilaEpp incluye condición y uso", async () => {
  const { crearFilaEpp } = await moduloPromise;

  const html = crearFilaEpp(
    {
      elementoEppId: 12,
      elemento: "Casco",
    },
    0,
    VALORES,
  );

  assert.match(html, /data-role="condicion"/);
  assert.match(html, /data-role="uso"/);
});

test("crearFilaEpp conserva el control de eliminación", async () => {
  const { crearFilaEpp } = await moduloPromise;

  const html = crearFilaEpp(
    {
      elementoEppId: 12,
      elemento: "Casco",
    },
    0,
    VALORES,
  );

  assert.match(html, /data-action="eliminar-epp"/);
  assert.match(html, /aria-label="Eliminar Casco"/);
});

test("crearFilaEpp incluye el plan de acción asociado", async () => {
  const { crearFilaEpp } = await moduloPromise;

  const html = crearFilaEpp(
    {
      elementoEppId: 12,
      elemento: "Casco",
    },
    0,
    VALORES,
  );

  assert.match(html, /class="epp-plan-row"/);
  assert.match(html, /data-plan-elemento="Casco"/);
  assert.match(html, /data-role="epp-plan-accion"/);
  assert.match(html, /data-role="epp-fecha-plan"/);
  assert.match(html, /\shidden\s/);
});

test("crearFilaEpp conserva valores vacíos cuando faltan datos", async () => {
  const { crearFilaEpp } = await moduloPromise;

  const html = crearFilaEpp(undefined, 0, VALORES);

  assert.match(html, /data-elemento-epp-id=""/);
  assert.match(html, /data-elemento=""/);
});