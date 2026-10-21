const test = require("node:test");
const assert = require("node:assert/strict");
const ExcelJS = require("exceljs");

const {
  resolverUrlEvidencia,
} = require("../../../src/backend/shared/utils/urlEvidencia.util");

const {
  construirHojaSeguimientoEpp,
} = require("../../../src/backend/modules/inspecciones-epp/excel/hojas/trabajadores.service");

const BASE =
  "https://cargoban3-my.sharepoint.com/personal/cargobanolp_cargoban_com_co/Documents";

const RUTA_VIGENTE = "/INSPECCIONES_DE_SEGURIDAD/EVIDENCIAS/EPP_2_ILRC.jpg";

test("un enlace de la carpeta anterior se reconstruye con la ruta vigente", () => {
  assert.equal(
    resolverUrlEvidencia(
      `${BASE}/PRUEBA_INSPECCION_EXTINTORES/EVIDENCIAS/EPP_2_ILRC.jpg`,
      RUTA_VIGENTE,
    ),
    `${BASE}/INSPECCIONES_DE_SEGURIDAD/EVIDENCIAS/EPP_2_ILRC.jpg`,
  );
});

test("un enlace que ya está actualizado no cambia", () => {
  const enlace = `${BASE}/INSPECCIONES_DE_SEGURIDAD/EVIDENCIAS/EPP_2_ILRC.jpg`;

  assert.equal(resolverUrlEvidencia(enlace, RUTA_VIGENTE), enlace);
});

test("la ruta puede venir sin la barra inicial", () => {
  assert.equal(
    resolverUrlEvidencia(`${BASE}/VIEJA/EPP_1_AB.jpg`, "INSPECCIONES_DE_SEGURIDAD/EVIDENCIAS/EPP_1_AB.jpg"),
    `${BASE}/INSPECCIONES_DE_SEGURIDAD/EVIDENCIAS/EPP_1_AB.jpg`,
  );
});

test("sin ruta, o con un enlace de otra biblioteca, se conserva el enlace guardado", () => {
  const enlace = `${BASE}/VIEJA/EPP_1_AB.jpg`;

  assert.equal(resolverUrlEvidencia(enlace, ""), enlace);
  assert.equal(resolverUrlEvidencia(enlace, null), enlace);
  assert.equal(resolverUrlEvidencia("https://ejemplo.com/archivo.jpg", RUTA_VIGENTE), "https://ejemplo.com/archivo.jpg");
});

test("sin enlace devuelve una cadena vacía", () => {
  assert.equal(resolverUrlEvidencia(null, RUTA_VIGENTE), "");
  assert.equal(resolverUrlEvidencia(undefined, RUTA_VIGENTE), "");
  assert.equal(resolverUrlEvidencia("", RUTA_VIGENTE), "");
});

test("los caracteres especiales de la ruta se codifican", () => {
  assert.equal(
    resolverUrlEvidencia(`${BASE}/VIEJA/a.jpg`, "/CARPETA CON ESPACIOS/a b.jpg"),
    `${BASE}/CARPETA%20CON%20ESPACIOS/a%20b.jpg`,
  );
});

test("la hoja 02 enlaza cada evidencia con la carpeta vigente", () => {
  const workbook = new ExcelJS.Workbook();

  const hoja = construirHojaSeguimientoEpp(workbook, [
    {
      inspeccion_id: "INSP-1",
      codigo_trabajador: "10",
      nombre_trabajador: "Trabajador",
      evidencia_url: `${BASE}/PRUEBA_INSPECCION_EXTINTORES/EVIDENCIAS/EPP_2_ILRC.jpg`,
      evidencia_ruta: RUTA_VIGENTE,
    },
    {
      inspeccion_id: "INSP-2",
      codigo_trabajador: "11",
      nombre_trabajador: "Otro",
      evidencia_url: "",
      evidencia_ruta: "",
    },
  ]);

  const evidencia = hoja.getCell("M2").value;

  assert.equal(evidencia.text, "Ver evidencia");
  assert.equal(evidencia.hyperlink, `${BASE}/INSPECCIONES_DE_SEGURIDAD/EVIDENCIAS/EPP_2_ILRC.jpg`);
  assert.equal(hoja.getCell("M3").value, "");
});
