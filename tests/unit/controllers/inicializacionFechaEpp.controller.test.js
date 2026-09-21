const test = require("node:test");
const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
const path = require("node:path");

const rutaControlador = path.resolve(
  __dirname,
  "../../../src/views/js/epp/controllers/inicializacionFechaEpp.controller.js",
);

async function cargarControlador() {
  const codigo = await readFile(rutaControlador, "utf8");
  const url = `data:text/javascript;base64,${Buffer.from(codigo).toString("base64")}`;
  return import(url);
}

function crearFechaFalsa() {
  const eventos = new Map();

  return {
    addEventListener(evento, handler) {
      eventos.set(evento, handler);
    },
    disparar(evento) {
      eventos.get(evento)?.();
    },
  };
}

test("no hace nada si no existe el campo fecha", async () => {
  const { inicializarFechaEpp } = await cargarControlador();
  let llamadasAsignar = 0;
  let llamadasSelector = 0;

  inicializarFechaEpp({
    fecha: null,
    asignarFechaHoy() {
      llamadasAsignar += 1;
    },
    abrirSelectorFecha() {
      llamadasSelector += 1;
    },
  });

  assert.equal(llamadasAsignar, 0);
  assert.equal(llamadasSelector, 0);
});

test("asigna la fecha actual y abre el selector al hacer clic", async () => {
  const { inicializarFechaEpp } = await cargarControlador();
  const fecha = crearFechaFalsa();
  const fechasAsignadas = [];
  const selectoresAbiertos = [];

  inicializarFechaEpp({
    fecha,
    asignarFechaHoy(elemento) {
      fechasAsignadas.push(elemento);
    },
    abrirSelectorFecha(elemento) {
      selectoresAbiertos.push(elemento);
    },
  });

  assert.deepEqual(fechasAsignadas, [fecha]);

  fecha.disparar("click");

  assert.deepEqual(selectoresAbiertos, [fecha]);
});