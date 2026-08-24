const AdmZip = require("adm-zip");

const {
  descargarArchivoOneDrive,
} = require("./graph.service");

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
 * Ruta del Excel SST configurado en OneDrive.
 */
function obtenerRutaExcelSst() {
  const ruta = process.env.ONEDRIVE_EXCEL_PATH;

  if (!ruta) {
    throw new Error(
      "La variable ONEDRIVE_EXCEL_PATH no está configurada",
    );
  }

  return ruta;
}

/**
 * Descarga el XLSM SST desde OneDrive y lo abre como paquete ZIP.
 *
 * Todo el procesamiento se realiza en memoria.
 * No genera archivos temporales.
 */
async function cargarExcelSst() {
  const rutaExcel = obtenerRutaExcelSst();

  const buffer = await descargarArchivoOneDrive(rutaExcel);

  if (!buffer) {
    throw new Error(
      `No fue posible descargar el Excel SST desde OneDrive: ${rutaExcel}`,
    );
  }

  return new AdmZip(buffer);
}

/**
 * Obtiene el contenido XML de un archivo interno del XLSM.
 */
function obtenerXml(zip, rutaInterna) {
  const entrada = zip.getEntry(rutaInterna);

  if (!entrada) {
    throw new Error(
      `No se encontró ${rutaInterna} dentro del Excel SST`,
    );
  }

  return entrada.getData().toString("utf8");
}

/**
 * Reemplaza un XML dentro del XLSM.
 */
function reemplazarXml(zip, rutaInterna, contenidoXml) {
  const entrada = zip.getEntry(rutaInterna);

  if (!entrada) {
    throw new Error(
      `No se encontró ${rutaInterna} dentro del Excel SST`,
    );
  }

  zip.updateFile(
    rutaInterna,
    Buffer.from(contenidoXml, "utf8"),
  );
}

/**
 * Convierte nuevamente el XLSM modificado en un Buffer.
 */
function generarBufferExcel(zip) {
  return zip.toBuffer();
}

async function diagnosticarTablaExtintores() {
  const zip = await cargarExcelSst();

  const rutaTabla = "xl/tables/table1.xml";
  const rutaHoja = "xl/worksheets/sheet2.xml";

  const tablaXml = obtenerXml(zip, rutaTabla);
  const hojaXml = obtenerXml(zip, rutaHoja);

  // Rango actual de TablaExtintores.
  const rango = tablaXml.match(/<table\b[^>]*\bref="([^"]+)"/)?.[1] || null;

  // Encabezados definidos en table1.xml.
  const columnas = [...tablaXml.matchAll(/<tableColumn\b[^>]*\bid="([^"]+)"[^>]*\bname="([^"]*)"/g)]
    .map((match, index) => ({
      posicion: index + 1,
      id: match[1],
      nombre: match[2],
    }));

  // XML correspondiente a la fila 2 existente.
  const fila2 =
    hojaXml.match(/<row\b[^>]*\br="2"[^>]*>[\s\S]*?<\/row>/)?.[0] || null;

  return {
    rango,
    totalColumnas: columnas.length,
    columnas,
    fila2,
  };
}

function mapearTipoExtintor(tipo) {
  const valor = String(tipo || "").trim().toLowerCase();

  return {
    L: valor === "solkaflam" ? "X" : "",
    M: valor === "co2" ? "X" : "",
    N: valor === "multiproposito" ? "X" : "",
    O: valor === "agua" ? "X" : "",
  };
}

function mapearExtintorAExcel(inspeccion, extintor) {
  const fila = {
    // Información general de la inspección
    A: inspeccion.inspeccion_id || "",
    B: inspeccion.inspecciones_id || "",
    C: inspeccion.fecha || "",
    D: inspeccion.sede_operacion || "",
    E: inspeccion.area_trabajo || "",
    F: inspeccion.jefe_responsable || "",
    G: inspeccion.cargo_jefe || "",
    H: inspeccion.responsable_inspeccion || "",
    I: inspeccion.cargo_responsable || "",

    // Información propia del extintor
    J: extintor.numero || "",
    K: extintor.ubicacion || "",

    // Tipo de extintor
    ...mapearTipoExtintor(extintor.tipo),

    P: extintor.capacidad || "",
    Q: extintor.mes_recarga || "",
    R: extintor.ano_recarga || "",

    // Información final
    AL: extintor.observaciones || "",
    AM: extintor.evidencia_archivo || "",

    // Pendiente de definir comportamiento del XLSM
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

module.exports = {
  cargarExcelSst,
  obtenerXml,
  reemplazarXml,
  generarBufferExcel,
  diagnosticarTablaExtintores,
 
  mapearTipoExtintor,
  mapearExtintorAExcel,
  mapearExtintoresAExcel,
};