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

function mapearTipoExtintor(tipo) {
  const valor = String(tipo || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  return {
    L: ["solkaflam", "solkaflan"].includes(valor)
      ? "SI"
      : "NO",

    M: valor === "co2"
      ? "SI"
      : "NO",

    N: valor === "multiproposito"
      ? "SI"
      : "NO",

    O: valor === "agua"
      ? "SI"
      : "NO",
  };
}

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

  for (const [
    columna,
    campo,
  ] of COLUMNAS_CONDICION_EXTINTOR) {
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

async function obtenerFilasExtintoresSstAprobados() {
  const registros = await obtenerExtintoresSstAprobados();

  return registros.map((registro) =>
    mapearExtintorAExcel(registro, registro),
  );
}



function actualizarFilasExtintoresXml(
  hojaXml,
  filasExtintores,
) {
  return actualizarFilasHojaXml({
    hojaXml,

    filas: filasExtintores,

    ultimaColumna:
      ULTIMA_COLUMNA_EXTINTORES,

    nombreHoja:
      "Extintores",

    columnasFecha:
      ["C"],

    columnasNumericas:
      ["B", "R"],
  });
}

function actualizarRangoTablaExtintores(
  tablaXml,
  cantidadFilas,
) {
  return actualizarRangoTablaXml({
    tablaXml,

    ultimaColumna:
      ULTIMA_COLUMNA_EXTINTORES,

    cantidadFilas,
  });
}

function diagnosticarTablaExtintores(zip) {
  const tablaXml = obtenerXml(
    zip,
    RUTA_TABLA_EXTINTORES,
  );

  const hojaXml = obtenerXml(
    zip,
    RUTA_HOJA_EXTINTORES,
  );

  const rango = tablaXml.match(
    /<table\b[^>]*\bref="([^"]+)"/,
  )?.[1] || null;

  const columnas = [
    ...tablaXml.matchAll(
      /<tableColumn\b[^>]*\bid="([^"]+)"[^>]*\bname="([^"]*)"/g,
    ),
  ].map((match, index) => ({
    posicion: index + 1,
    id: match[1],
    nombre: match[2],
  }));

  const fila2 = hojaXml.match(
    /<row\b[^>]*\br="2"[^>]*>[\s\S]*?<\/row>/,
  )?.[0] || null;

  return {
    rango,
    totalColumnas: columnas.length,
    columnas,
    fila2,
  };
}

async function actualizarExtintores(zip) {
  if (!zip) {
    throw new Error(
      "Se requiere el archivo Excel cargado en memoria",
    );
  }

  const filasExtintores =
    await obtenerFilasExtintoresSstAprobados();

  const hojaXml = obtenerXml(
    zip,
    RUTA_HOJA_EXTINTORES,
  );

  const tablaXml = obtenerXml(
    zip,
    RUTA_TABLA_EXTINTORES,
  );

  const hojaActualizada = actualizarFilasExtintoresXml(
    hojaXml,
    filasExtintores,
  );

  const tablaActualizada =
    actualizarRangoTablaExtintores(
      tablaXml,
      filasExtintores.length,
    );

  reemplazarXml(
    zip,
    RUTA_HOJA_EXTINTORES,
    hojaActualizada,
  );

  reemplazarXml(
    zip,
    RUTA_TABLA_EXTINTORES,
    tablaActualizada.xml,
  );

  return {
    totalExtintores: filasExtintores.length,

    rango: tablaActualizada.rango,

    inspecciones: filasExtintores.map(
      (fila) => fila.A,
    ),
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