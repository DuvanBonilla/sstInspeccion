const {
  obtenerBotiquinItemsSstAprobados,
} = require("../../models/seguimientoSstExcel.model");

const {
  obtenerXml,
  reemplazarXml,
  actualizarFilasHojaXml,
  actualizarRangoTablaXml,
} = require("../../utils/excelXml.util");

const RUTA_HOJA_BOTIQUINES =
  "xl/worksheets/sheet7.xml";

const RUTA_TABLA_BOTIQUINES =
  "xl/tables/table5.xml";

const ULTIMA_COLUMNA_BOTIQUINES = "W";

function construirFilaBotiquin(itemBotiquin) {
  return {
    A: itemBotiquin.inspeccion_id ?? "",

    B: itemBotiquin.inspecciones_id ?? "",

    C: itemBotiquin.numero_item ?? "",

    D: itemBotiquin.fecha ?? "",

    E: itemBotiquin.sede_operacion ?? "",

    F: itemBotiquin.area_trabajo ?? "",

    G: itemBotiquin.jefe_responsable ?? "",

    H: itemBotiquin.cargo_jefe ?? "",

    I: itemBotiquin.responsable_inspeccion ?? "",

    J: itemBotiquin.cargo_responsable ?? "",

    K: itemBotiquin.numero_botiquin ?? "",

    L: itemBotiquin.item ?? "",

    M: itemBotiquin.cantidad_ideal ?? "",

    N: itemBotiquin.cantidad_real ?? "",

    O: itemBotiquin.integridad_empaque ?? "",

    P: itemBotiquin.fecha_vencimiento ?? "",

    Q: itemBotiquin.plan_intervencion ?? "",

    R: itemBotiquin.fecha_intervencion ?? "",

    S: itemBotiquin.cumplimiento ?? "",

    T: itemBotiquin.observaciones ?? "",

    U: itemBotiquin.afectacion_servicio ?? "",

    V: itemBotiquin.evidencia_archivo ?? "",

    W: itemBotiquin.evidencia_ruta ?? "",
  };
}

async function obtenerFilasBotiquinesSstAprobados() {
  const itemsBotiquin =
    await obtenerBotiquinItemsSstAprobados();

  return itemsBotiquin.map(construirFilaBotiquin);
}

async function actualizarBotiquines(zip) {
  const filas =
    await obtenerFilasBotiquinesSstAprobados();

  const hojaXml = obtenerXml(
    zip,
    RUTA_HOJA_BOTIQUINES,
  );

  const tablaXml = obtenerXml(
    zip,
    RUTA_TABLA_BOTIQUINES,
  );

  const hojaXmlActualizada = actualizarFilasHojaXml({
    hojaXml,

    filas,

    ultimaColumna: ULTIMA_COLUMNA_BOTIQUINES,

    nombreHoja: "Botiquin",

    columnasFecha: ["D", "P", "R"],

    columnasNumericas: ["B", "C", "M", "N"],
  });

  const {
    xml: tablaXmlActualizada,
    rango,
  } = actualizarRangoTablaXml({
    tablaXml,

    ultimaColumna: ULTIMA_COLUMNA_BOTIQUINES,

    cantidadFilas: filas.length,
  });

  reemplazarXml(
    zip,
    RUTA_HOJA_BOTIQUINES,
    hojaXmlActualizada,
  );

  reemplazarXml(
    zip,
    RUTA_TABLA_BOTIQUINES,
    tablaXmlActualizada,
  );

  return {
    totalBotiquinItems: filas.length,

    rango,

    inspecciones: [
      ...new Set(filas.map((fila) => fila.A)),
    ],

    botiquines: [
      ...new Set(filas.map((fila) => fila.K)),
    ],
  };
}

module.exports = {
  obtenerFilasBotiquinesSstAprobados,

  actualizarBotiquines,
};