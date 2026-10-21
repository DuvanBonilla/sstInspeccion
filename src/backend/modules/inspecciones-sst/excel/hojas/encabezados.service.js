const {
  obtenerXml,
  reemplazarXml,
  escaparXml,
  obtenerNumeroColumna,
} = require("../../../../shared/utils/excelXml.util");

const { buscarRutaHoja, buscarRutaTabla } = require("../rutasLibroExcel");

const RUTA_CADENAS_COMPARTIDAS = "xl/sharedStrings.xml";

/**
 * Hojas de datos cuyos encabezados se revisan. Cada una tiene una tabla
 * estructurada cuyos nombres de columna deben coincidir con los encabezados.
 */

const HOJAS_ENCABEZADOS = [
  "Extintores",
  "Camillas",
  "Señalizacion",
  "Equipo_T.A.D.E",
  "Botiquin",
];

/**
 * Correcciones ortográficas de los títulos de columna. La clave es el texto
 * sin espacios en los extremos; los espacios originales se conservan.
 */

const CORRECCIONES_ENCABEZADOS = new Map([
  ["Area Trabajo", "Área Trabajo"],
  ["Fecha Inspeccion", "Fecha Inspección"],
  ["Responsable Inspeccion", "Responsable Inspección"],
  ["TIPO MULTIPROPOSITO", "TIPO MULTIPROPÓSITO"],
  ["MANOMETRO", "MANÓMETRO"],
  ["PRESION", "PRESIÓN"],
  ["ROTULO", "RÓTULO"],
  ["UBICACION", "UBICACIÓN"],
  ["TIPO DE SEÑALIZACION", "TIPO DE SEÑALIZACIÓN"],
  ["AFECTACION_SERVICIO", "AFECTACIÓN_SERVICIO"],
  ["SEÑALIZACIÓN _CAMILLA", "SEÑALIZACIÓN_CAMILLA"],
  ["ITEM", "ÍTEM"],
]);

function desescaparXml(valor) {
  return String(valor)
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function extraerTextoXml(fragmento) {
  return desescaparXml(
    [...fragmento.matchAll(/<t\b[^>]*>([^<]*)<\/t>/g)]
      .map((coincidencia) => coincidencia[1])
      .join(""),
  );
}

function leerCadenasCompartidas(zip) {
  if (!zip.getEntry(RUTA_CADENAS_COMPARTIDAS)) {
    return [];
  }

  const xml = obtenerXml(zip, RUTA_CADENAS_COMPARTIDAS);

  return (xml.match(/<si\b[^>]*>[\s\S]*?<\/si>|<si\b[^>]*\/>/g) || []).map(
    extraerTextoXml,
  );
}

/**
 * Obtiene el texto corregido de un encabezado.
 *
 * @param {string} texto Texto actual del encabezado.
 * @returns {string|null} Texto corregido, o `null` si no requiere corrección.
 */

function corregirEncabezado(texto) {
  const correccion = CORRECCIONES_ENCABEZADOS.get(texto.trim());

  if (!correccion) {
    return null;
  }

  const espaciosInicio = texto.slice(0, texto.length - texto.trimStart().length);

  const espaciosFin = texto.slice(texto.trimEnd().length);

  return `${espaciosInicio}${correccion}${espaciosFin}`;
}

/**
 * Lee el texto de los encabezados de una hoja de datos.
 *
 * @param {AdmZip} zip Archivo Excel abierto como contenedor ZIP.
 * @param {string} rutaHoja Ruta interna de la hoja.
 * @returns {Map<number, string>} Texto del encabezado por número de columna.
 */

function leerEncabezados(zip, rutaHoja) {
  const cadenas = leerCadenasCompartidas(zip);

  const fila = obtenerXml(zip, rutaHoja).match(
    /<row\b[^>]*\br="1"[^>]*>[\s\S]*?<\/row>/,
  )?.[0];

  const textos = new Map();

  for (const celda of fila?.match(/<c\b[^>]*?(?:\/>|>[\s\S]*?<\/c>)/g) || []) {
    const referencia = celda.match(/\br="([A-Z]+)\d+"/)?.[1];

    const tipo = celda.match(/\bt="([^"]+)"/)?.[1];

    let texto = null;

    if (tipo === "s") {
      texto = cadenas[Number(celda.match(/<v>(\d+)<\/v>/)?.[1])] ?? null;
    } else if (tipo === "inlineStr") {
      texto = extraerTextoXml(celda);
    }

    if (referencia && texto != null) {
      textos.set(obtenerNumeroColumna(referencia), texto);
    }
  }

  return textos;
}

/**
 * Lee el texto de una celda de una hoja, ya sea una cadena compartida o una
 * cadena en línea.
 *
 * @param {AdmZip} zip Archivo Excel abierto como contenedor ZIP.
 * @param {string} rutaHoja Ruta interna de la hoja.
 * @param {string} referencia Referencia de la celda, por ejemplo `AD1`.
 * @returns {string|null} Texto de la celda, o `null` si no existe o no es texto.
 */

function leerTextoCelda(zip, rutaHoja, referencia) {
  const hojaXml = obtenerXml(zip, rutaHoja);

  const inicio = hojaXml.search(new RegExp(`<c\\b[^>]*\\br="${referencia}"`));

  if (inicio < 0) {
    return null;
  }

  const celda = hojaXml
    .slice(inicio)
    .match(/^<c\b[^>]*?(?:\/>|>[\s\S]*?<\/c>)/)?.[0];

  const tipo = celda?.match(/\bt="([^"]+)"/)?.[1];

  if (tipo === "inlineStr") {
    return extraerTextoXml(celda);
  }

  if (tipo === "s") {
    const indice = Number(celda.match(/<v>(\d+)<\/v>/)?.[1]);

    return leerCadenasCompartidas(zip)[indice] ?? null;
  }

  return null;
}

function corregirFilaEncabezados(hojaXml, cadenas) {
  const coincidenciaFila = hojaXml.match(
    /<row\b[^>]*\br="1"[^>]*>[\s\S]*?<\/row>/,
  );

  if (!coincidenciaFila) {
    return { xml: hojaXml, corregidos: 0 };
  }

  let corregidos = 0;

  const filaActualizada = coincidenciaFila[0].replace(
    /<c\b[^>]*?(?:\/>|>[\s\S]*?<\/c>)/g,
    (celda) => {
      const tipo = celda.match(/\bt="([^"]+)"/)?.[1];

      let texto = null;

      if (tipo === "s") {
        const indice = Number(celda.match(/<v>(\d+)<\/v>/)?.[1]);

        texto = Number.isInteger(indice) ? cadenas[indice] : null;
      } else if (tipo === "inlineStr") {
        texto = extraerTextoXml(celda);
      }

      const corregido = texto == null ? null : corregirEncabezado(texto);

      if (corregido == null) {
        return celda;
      }

      const referencia = celda.match(/\br="([A-Z]+\d+)"/)[1];

      const estilo = celda.match(/\bs="(\d+)"/)?.[1];

      corregidos += 1;

      return (
        `<c r="${referencia}"${estilo ? ` s="${estilo}"` : ""} t="inlineStr">` +
        `<is><t xml:space="preserve">${escaparXml(corregido)}</t></is>` +
        "</c>"
      );
    },
  );

  return {
    xml: hojaXml.replace(coincidenciaFila[0], filaActualizada),
    corregidos,
  };
}

function corregirColumnasTabla(tablaXml) {
  return tablaXml.replace(
    /(<tableColumn\b[^>]*\bname=")([^"]*)(")/g,
    (coincidencia, prefijo, nombre, sufijo) => {
      const corregido = corregirEncabezado(desescaparXml(nombre));

      return corregido == null
        ? coincidencia
        : `${prefijo}${escaparXml(corregido)}${sufijo}`;
    },
  );
}

/**
 * Corrige la ortografía de los títulos de columna de las hojas de datos SST.
 *
 * Actualiza la celda de encabezado y el nombre de la columna en la tabla
 * estructurada para que sigan coincidiendo. No modifica datos, fórmulas,
 * posiciones, estilos ni rangos, y el aplicativo escribe por posición, por lo
 * que sus consultas no dependen del texto de los encabezados. Puede
 * ejecutarse en cada actualización: si el texto ya está corregido no cambia
 * nada.
 *
 * @param {AdmZip} zip Archivo Excel abierto como contenedor ZIP.
 * @returns {{total: number, hojas: Array<{hoja: string, corregidos: number}>}}
 * Cantidad de encabezados corregidos por hoja.
 */

function corregirEncabezados(zip) {
  if (!zip) {
    throw new Error("Se requiere el archivo Excel cargado en memoria");
  }

  const cadenas = leerCadenasCompartidas(zip);

  const hojas = [];

  for (const nombre of HOJAS_ENCABEZADOS) {
    const ruta = buscarRutaHoja(zip, nombre);

    if (!ruta || !zip.getEntry(ruta)) {
      continue;
    }

    const { xml, corregidos } = corregirFilaEncabezados(
      obtenerXml(zip, ruta),
      cadenas,
    );

    if (corregidos > 0) {
      reemplazarXml(zip, ruta, xml);

      const rutaTabla = buscarRutaTabla(zip, ruta);

      if (rutaTabla && zip.getEntry(rutaTabla)) {
        reemplazarXml(
          zip,
          rutaTabla,
          corregirColumnasTabla(obtenerXml(zip, rutaTabla)),
        );
      }
    }

    hojas.push({ hoja: nombre, corregidos });
  }

  return {
    total: hojas.reduce((suma, hoja) => suma + hoja.corregidos, 0),
    hojas,
  };
}

module.exports = {
  CORRECCIONES_ENCABEZADOS,
  corregirEncabezado,
  corregirEncabezados,
  leerEncabezados,
  leerTextoCelda,
};
