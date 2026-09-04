const {
  obtenerExtintoresSstAprobados,
} = require("../../models/seguimientoSstExcel.model");

const {
  obtenerXml,
  reemplazarXml,

  actualizarFilasHojaXml,
  actualizarRangoTablaXml,
} = require("../../utils/excelXml.util");

const RUTA_HOJA_EXTINTORES = "xl/worksheets/sheet2.xml";

const RUTA_TABLA_EXTINTORES = "xl/tables/table1.xml";

const ULTIMA_COLUMNA_EXTINTORES = "AN";

const COLUMNAS_CONDICION_EXTINTOR = [
  ["S", "acceso"],
  ["T", "visibilidad"],
  ["U", "senalizacion"],
  ["V", "paredAltura"],
  ["W", "piso"],
  ["X", "limpieza"],
  ["Y", "rotulo"],
  ["Z", "cilindro"],
  ["AA", "manometro"],
  ["AB", "presion"],
  ["AC", "pin"],
  ["AD", "manguera"],
  ["AE", "boquilla"],
  ["AF", "corneta"],
  ["AG", "pintura"],
  ["AH", "manija"],
  ["AI", "sello"],
  ["AJ", "llaveSpanner"],
  ["AK", "otros"],
];

/**
 * Convierte el tipo de extintor en las columnas indicadoras del Excel.
 *
 * Normaliza el texto recibido y marca con `SI` la columna correspondiente
 * a Solkaflam, CO2, multipropósito o agua, dejando las demás en `NO`.
 *
 * @param {string} tipo - Tipo de agente del extintor.
 * @returns {{L: string, M: string, N: string, O: string}}
 * Indicadores de tipo distribuidos en las columnas del Excel.
 */

function mapearTipoExtintor(tipo) {
  const valor = String(tipo || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  return {
    L: ["solkaflam", "solkaflan"].includes(valor) ? "SI" : "NO",

    M: valor === "co2" ? "SI" : "NO",

    N: valor === "multiproposito" ? "SI" : "NO",

    O: valor === "agua" ? "SI" : "NO",
  };
}

/**
 * Convierte el tipo de extintor en las columnas indicadoras del Excel.
 *
 * Normaliza el texto recibido y marca con `SI` la columna correspondiente
 * a Solkaflam, CO2, multipropósito o agua, dejando las demás en `NO`.
 *
 * @param {string} tipo - Tipo de agente del extintor.
 * @returns {{L: string, M: string, N: string, O: string}}
 * Indicadores de tipo distribuidos en las columnas del Excel.
 */

function mapearExtintorAExcel(inspeccion, extintor) {
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

    J: extintor.numero || "",
    K: extintor.ubicacion || "",

    ...mapearTipoExtintor(extintor.tipo),

    P: extintor.capacidad || "",
    Q: extintor.mes_recarga || "",
    R: extintor.ano_recarga || "",

    AL: extintor.observaciones || "",
    AM: extintor.evidencia_archivo || "",
    AN: "",
  };

  const condiciones = extintor.condiciones || {};

  for (const [columna, campo] of COLUMNAS_CONDICION_EXTINTOR) {
    fila[columna] = condiciones[campo] || "";
  }

  return fila;
}

function mapearExtintoresAExcel(inspeccion) {
  const extintores = Array.isArray(inspeccion?.extintores)
    ? inspeccion.extintores
    : [];

  return extintores.map((extintor) =>
    mapearExtintorAExcel(inspeccion, extintor),
  );
}

/**
 * Obtiene los extintores de inspecciones SST aprobadas y los prepara para Excel.
 *
 * Consulta los registros mediante el modelo de seguimiento y transforma
 * cada resultado en una fila compatible con la hoja `Extintores`.
 *
 * @async
 * @returns {Promise<Array<Object>>} Filas de extintores preparadas para el Excel.
 */

async function obtenerFilasExtintoresSstAprobados() {
  const registros = await obtenerExtintoresSstAprobados();

  return registros.map((registro) => mapearExtintorAExcel(registro, registro));
}

function actualizarFilasExtintoresXml(hojaXml, filasExtintores) {
  return actualizarFilasHojaXml({
    hojaXml,

    filas: filasExtintores,

    ultimaColumna: ULTIMA_COLUMNA_EXTINTORES,

    nombreHoja: "Extintores",

    columnasFecha: ["C"],

    columnasNumericas: ["B", "R"],
  });
}

function actualizarRangoTablaExtintores(tablaXml, cantidadFilas) {
  return actualizarRangoTablaXml({
    tablaXml,

    ultimaColumna: ULTIMA_COLUMNA_EXTINTORES,

    cantidadFilas,
  });
}

function diagnosticarTablaExtintores(zip) {
  const tablaXml = obtenerXml(zip, RUTA_TABLA_EXTINTORES);

  const hojaXml = obtenerXml(zip, RUTA_HOJA_EXTINTORES);

  const rango = tablaXml.match(/<table\b[^>]*\bref="([^"]+)"/)?.[1] || null;

  const columnas = [
    ...tablaXml.matchAll(
      /<tableColumn\b[^>]*\bid="([^"]+)"[^>]*\bname="([^"]*)"/g,
    ),
  ].map((match, index) => ({
    posicion: index + 1,
    id: match[1],
    nombre: match[2],
  }));

  const fila2 =
    hojaXml.match(/<row\b[^>]*\br="2"[^>]*>[\s\S]*?<\/row>/)?.[0] || null;

  return {
    rango,
    totalColumnas: columnas.length,
    columnas,
    fila2,
  };
}

/**
 * Actualiza la hoja y la tabla de extintores del seguimiento SST.
 *
 * Obtiene los extintores aprobados, reemplaza las filas del XML de la hoja,
 * ajusta el rango de la tabla estructurada y guarda ambos contenidos dentro
 * del archivo Excel cargado en memoria.
 *
 * @async
 * @param {@param {AdmZip} zip} zip - Archivo Excel abierto como contenedor ZIP.
 * @returns {Promise<{
 *   totalExtintores: number,
 *   rango: string,
 *   inspecciones: string[]
 * }>} Resultado de la actualización, rango de la tabla e inspecciones incluidas.
 * @throws {Error} Si no se proporciona el archivo Excel cargado en memoria.
 */

async function actualizarExtintores(zip) {
  if (!zip) {
    throw new Error("Se requiere el archivo Excel cargado en memoria");
  }

  const filasExtintores = await obtenerFilasExtintoresSstAprobados();

  const hojaXml = obtenerXml(zip, RUTA_HOJA_EXTINTORES);

  const tablaXml = obtenerXml(zip, RUTA_TABLA_EXTINTORES);

  const hojaActualizada = actualizarFilasExtintoresXml(
    hojaXml,
    filasExtintores,
  );

  const tablaActualizada = actualizarRangoTablaExtintores(
    tablaXml,
    filasExtintores.length,
  );

  reemplazarXml(zip, RUTA_HOJA_EXTINTORES, hojaActualizada);

  reemplazarXml(zip, RUTA_TABLA_EXTINTORES, tablaActualizada.xml);

  return {
    totalExtintores: filasExtintores.length,

    rango: tablaActualizada.rango,

    inspecciones: filasExtintores.map((fila) => fila.A),
  };
}

module.exports = {
  diagnosticarTablaExtintores,

  mapearTipoExtintor,
  mapearExtintorAExcel,
  mapearExtintoresAExcel,

  obtenerFilasExtintoresSstAprobados,

  actualizarFilasExtintoresXml,
  actualizarRangoTablaExtintores,

  actualizarExtintores,
};
