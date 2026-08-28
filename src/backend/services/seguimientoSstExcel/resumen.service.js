const {
  obtenerResumenInspeccionesSstAprobadas,
} = require("../../models/seguimientoSstExcel.model");

const {
  obtenerXml,
  reemplazarXml,
  actualizarFilasHojaXml,
} = require("../../utils/excelXml.util");

const RUTA_HOJA_RESUMEN =
  "xl/worksheets/sheet6.xml";

const ULTIMA_COLUMNA_RESUMEN = "F";

function construirFilaResumen(inspeccion) {
  return {
    A: inspeccion.inspeccion_id ?? "",

    B: inspeccion.fecha ?? "",

    C: inspeccion.sede_operacion ?? "",

    D: inspeccion.area_trabajo ?? "",

    E: inspeccion.responsable_inspeccion ?? "",

    F: inspeccion.cargo_responsable ?? "",
  };
}

async function obtenerFilasResumenSstAprobadas() {
  const inspecciones =
    await obtenerResumenInspeccionesSstAprobadas();

  return inspecciones.map(construirFilaResumen);
}

async function actualizarResumen(zip) {
  const filas =
    await obtenerFilasResumenSstAprobadas();

  const hojaXml = obtenerXml(
    zip,
    RUTA_HOJA_RESUMEN,
  );

  const hojaXmlActualizada =
    actualizarFilasHojaXml({
      hojaXml,

      filas,

      ultimaColumna:
        ULTIMA_COLUMNA_RESUMEN,

      nombreHoja:
        "_RESUMEN",

      columnasFecha:
        ["B"],

      columnasNumericas:
        [],
    });

  reemplazarXml(
    zip,
    RUTA_HOJA_RESUMEN,
    hojaXmlActualizada,
  );

  return {
    totalInspecciones:
      filas.length,

    rango:
      `A1:${ULTIMA_COLUMNA_RESUMEN}${filas.length + 1}`,

    inspecciones:
      filas.map((fila) => fila.A),
  };
}

module.exports = {
  obtenerFilasResumenSstAprobadas,
  actualizarResumen,
};