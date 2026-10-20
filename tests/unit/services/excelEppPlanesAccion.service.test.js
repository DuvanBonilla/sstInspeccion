const test = require("node:test");
const assert = require("node:assert/strict");
const AdmZip = require("adm-zip");
const ExcelJS = require("exceljs");

const {
  construirHojaPlanesAccion,
} = require("../../../src/backend/modules/inspecciones-epp/excel/hojas/planesAccion.service");

async function generarTabla(planes) {
  const workbook = new ExcelJS.Workbook();

  construirHojaPlanesAccion(workbook, planes);

  const zip = new AdmZip(Buffer.from(await workbook.xlsx.writeBuffer()));

  return zip.readAsText("xl/tables/table1.xml").match(/<table\b[^>]*\bref="([^"]*)"/)[1];
}

function crearPlan(numero) {
  return {
    inspeccion_id: "INSP-1",
    fecha: "2026-10-01",
    sede_operacion: "Santa Marta",
    area_trabajo: "SST",
    codigo_trabajador: "10",
    nombre_trabajador: "Trabajador",
    cargo: "Estibador",
    elemento_epp: "BOTAS",
    categoria: "DOTACION",
    condicion: "M",
    uso: "R",
    plan_accion: "Cambio",
    fecha_plan_accion: new Date("2026-10-31T00:00:00Z"),
    detalle_epp_id: String(numero),
    responsable_cierre: "",
    fecha_cierre: null,
  };
}

test("con planes, la tabla abarca el encabezado y una fila por plan", async () => {
  assert.equal(await generarTabla([crearPlan(1), crearPlan(2)]), "A1:S3");
});

test("sin planes, la tabla conserva una fila de datos vacía para que Excel no la repare", async () => {
  assert.equal(await generarTabla([]), "A1:S2");
});

test("la fila vacía no cuenta como cierre ni como plan", () => {
  const workbook = new ExcelJS.Workbook();

  const hoja = construirHojaPlanesAccion(workbook, []);

  assert.equal(hoja.getCell("P2").value, null);
  assert.equal(hoja.getCell("R2").value, null);
});
