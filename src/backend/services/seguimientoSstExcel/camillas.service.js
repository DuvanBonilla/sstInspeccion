const {
  obtenerCamillasSstAprobadas,
} = require("../../models/seguimientoSstExcel.model");

const {
  obtenerXml,
  reemplazarXml,

  actualizarFilasHojaXml,
  actualizarRangoTablaXml,
} = require("../../utils/excelXml.util");

const RUTA_HOJA_CAMILLAS =
  "xl/worksheets/sheet3.xml";

const RUTA_TABLA_CAMILLAS =
  "xl/tables/table2.xml";

const ULTIMA_COLUMNA_CAMILLAS =
  "U";

const COLUMNAS_CONDICION_CAMILLA = [
  ["L", "senalizacion"],
  ["M", "acceso"],
  ["N", "estadoSoporte"],
  ["O", "instalacionPared"],
  ["P", "correasSeguridad"],
  ["Q", "limpieza"],
  ["R", "inmovilizador"],
];

function mapearCamillaAExcel(inspeccion, camilla) {
  const fila = {
    A: inspeccion.inspeccion_id || "",
    B: inspeccion.inspecciones_id || "",
    C: inspeccion.fecha || "",
    D: inspeccion.sede_operacion || "",
    E: inspeccion.area_trabajo || "",
    F: inspeccion.jefe_responsable || "",
    G: inspeccion.cargo_jefe || "",
    H: inspeccion.responsable_inspeccion || "",
    I: inspeccion.cargo_responsable || "",

    J: camilla.numero || "",
    K: camilla.ubicacion || "",

    S: camilla.observaciones || "",

    T: camilla.afectacion_productividad || "",

    U: camilla.evidencia_archivo || "",
  };

  const condiciones = camilla.condiciones || {};

  for (const [
    columna,
    campo,
  ] of COLUMNAS_CONDICION_CAMILLA) {
    fila[columna] = condiciones[campo] || "";
  }

  return fila;
}

async function obtenerFilasCamillasSstAprobadas() {
  const registros = await obtenerCamillasSstAprobadas();

  return registros.map((registro) =>
    mapearCamillaAExcel(registro, registro),
  );
}

async function actualizarCamillas(zip) {
  if (!zip) {
    throw new Error(
      "Se requiere el archivo Excel cargado en memoria",
    );
  }

  const filasCamillas =
    await obtenerFilasCamillasSstAprobadas();

  const hojaXml = obtenerXml(
    zip,
    RUTA_HOJA_CAMILLAS,
  );

  const tablaXml = obtenerXml(
    zip,
    RUTA_TABLA_CAMILLAS,
  );

  const hojaActualizada =
    actualizarFilasHojaXml({
      hojaXml,

      filas: filasCamillas,

      ultimaColumna:
        ULTIMA_COLUMNA_CAMILLAS,

      nombreHoja:
        "Camillas",

      columnasFecha:
        ["C"],

      columnasNumericas:
        ["B"],
    });

  const tablaActualizada =
    actualizarRangoTablaXml({
      tablaXml,

      ultimaColumna:
        ULTIMA_COLUMNA_CAMILLAS,

      cantidadFilas:
        filasCamillas.length,
    });

  reemplazarXml(
    zip,
    RUTA_HOJA_CAMILLAS,
    hojaActualizada,
  );

  reemplazarXml(
    zip,
    RUTA_TABLA_CAMILLAS,
    tablaActualizada.xml,
  );

  return {
    totalCamillas:
      filasCamillas.length,

    rango:
      tablaActualizada.rango,

    inspecciones:
      filasCamillas.map((fila) => fila.A),
  };
}

module.exports = {
  mapearCamillaAExcel,
  obtenerFilasCamillasSstAprobadas,
  actualizarCamillas,
};