const {
  obtenerEquiposTecnologicosSstAprobados,
} = require("../../models/seguimientoSstExcel.model");

const {
  obtenerXml,
  reemplazarXml,
  actualizarFilasHojaXml,
  actualizarRangoTablaXml,
} = require("../../utils/excelXml.util");

const RUTA_HOJA_EQUIPOS_TECNOLOGICOS = "xl/worksheets/sheet5.xml";

const RUTA_TABLA_EQUIPOS_TECNOLOGICOS = "xl/tables/table4.xml";

const ULTIMA_COLUMNA_EQUIPOS_TECNOLOGICOS = "Q";

function construirFilaEquipoTecnologico(equipo) {
  return {
    A: equipo.inspeccion_id ?? "",
    B: equipo.inspecciones_id ?? "",
    C: equipo.fecha ?? "",
    D: equipo.sede_operacion ?? "",
    E: equipo.area_trabajo ?? "",
    F: equipo.jefe_responsable ?? "",
    G: equipo.cargo_jefe ?? "",
    H: equipo.responsable_inspeccion ?? "",
    I: equipo.cargo_responsable ?? "",
    J: equipo.equipo_tecnologico ?? "",
    K: equipo.ubicacion ?? "",
    L: equipo.cantidad ?? "",
    M: equipo.estado ?? "",
    N: equipo.mantenimiento ?? "",
    O: equipo.observaciones ?? "",
    P: equipo.afectacion_servicio ?? "",
    Q: equipo.evidencia_archivo ?? "",
  };
}

async function obtenerFilasEquiposTecnologicosSstAprobados() {
  const equiposTecnologicos = await obtenerEquiposTecnologicosSstAprobados();

  return equiposTecnologicos.map(construirFilaEquipoTecnologico);
}

async function actualizarEquiposTecnologicos(zip) {
  const filas = await obtenerFilasEquiposTecnologicosSstAprobados();

  const hojaXml = obtenerXml(zip, RUTA_HOJA_EQUIPOS_TECNOLOGICOS);

  const tablaXml = obtenerXml(zip, RUTA_TABLA_EQUIPOS_TECNOLOGICOS);

  const hojaXmlActualizada = actualizarFilasHojaXml({
    hojaXml,
    filas,
    ultimaColumna: ULTIMA_COLUMNA_EQUIPOS_TECNOLOGICOS,
    nombreHoja: "Equipo_T.A.D.E",
    columnasFecha: ["C"],
    columnasNumericas: ["B", "L"],
  });

  const { xml: tablaXmlActualizada, rango } = actualizarRangoTablaXml({
    tablaXml,
    ultimaColumna: ULTIMA_COLUMNA_EQUIPOS_TECNOLOGICOS,
    cantidadFilas: filas.length,
  });

  reemplazarXml(zip, RUTA_HOJA_EQUIPOS_TECNOLOGICOS, hojaXmlActualizada);

  reemplazarXml(zip, RUTA_TABLA_EQUIPOS_TECNOLOGICOS, tablaXmlActualizada);

  return {
    totalEquiposTecnologicos: filas.length,
    rango,
    inspecciones: [...new Set(filas.map((fila) => fila.A))],
  };
}

module.exports = {
  obtenerFilasEquiposTecnologicosSstAprobados,
  actualizarEquiposTecnologicos,
};
