const {
  obtenerSenalizacionesSstAprobadas,
} = require("../../models/seguimientoSstExcel.model");

const {
  obtenerXml,
  reemplazarXml,

  actualizarFilasHojaXml,
  actualizarRangoTablaXml,
} = require("../../utils/excelXml.util");

const RUTA_HOJA_SENALIZACIONES =
  "xl/worksheets/sheet4.xml";

const RUTA_TABLA_SENALIZACIONES =
  "xl/tables/table3.xml";

const ULTIMA_COLUMNA_SENALIZACIONES =
  "P";

function mapearSenalizacionAExcel(
  inspeccion,
  senalizacion,
) {
  return {
    A: inspeccion.inspeccion_id || "",

    B: inspeccion.inspecciones_id || "",

    C: inspeccion.fecha || "",

    D: inspeccion.sede_operacion || "",

    E: inspeccion.area_trabajo || "",

    F: inspeccion.jefe_responsable || "",

    G: inspeccion.cargo_jefe || "",

    H: inspeccion.responsable_inspeccion || "",

    I: inspeccion.cargo_responsable || "",

    J: senalizacion.tipo || "",

    K: senalizacion.ubicacion || "",

    L: senalizacion.cantidad || "",

    M: senalizacion.estado || "",

    N: senalizacion.aseo || "",

    O: senalizacion.observaciones || "",

    P: senalizacion.evidencia_archivo || "",
  };
}

async function obtenerFilasSenalizacionesSstAprobadas() {
  const registros =
    await obtenerSenalizacionesSstAprobadas();

  return registros.map((registro) =>
    mapearSenalizacionAExcel(
      registro,
      registro,
    ),
  );
}

async function actualizarSenalizaciones(zip) {
  if (!zip) {
    throw new Error(
      "Se requiere el archivo Excel cargado en memoria",
    );
  }

  const filasSenalizaciones =
    await obtenerFilasSenalizacionesSstAprobadas();

  const hojaXml = obtenerXml(
    zip,
    RUTA_HOJA_SENALIZACIONES,
  );

  const tablaXml = obtenerXml(
    zip,
    RUTA_TABLA_SENALIZACIONES,
  );

  const hojaActualizada =
    actualizarFilasHojaXml({
      hojaXml,

      filas: filasSenalizaciones,

      ultimaColumna:
        ULTIMA_COLUMNA_SENALIZACIONES,

      nombreHoja:
        "Señalizacion",

      columnasFecha:
        ["C"],

      columnasNumericas:
        ["B", "L"],
    });

  const tablaActualizada =
    actualizarRangoTablaXml({
      tablaXml,

      ultimaColumna:
        ULTIMA_COLUMNA_SENALIZACIONES,

      cantidadFilas:
        filasSenalizaciones.length,
    });

  reemplazarXml(
    zip,
    RUTA_HOJA_SENALIZACIONES,
    hojaActualizada,
  );

  reemplazarXml(
    zip,
    RUTA_TABLA_SENALIZACIONES,
    tablaActualizada.xml,
  );

  return {
    totalSenalizaciones:
      filasSenalizaciones.length,

    rango:
      tablaActualizada.rango,

    inspecciones:
      filasSenalizaciones.map(
        (fila) => fila.A,
      ),
  };
}

module.exports = {
  mapearSenalizacionAExcel,

  obtenerFilasSenalizacionesSstAprobadas,

  actualizarSenalizaciones,
};