const crypto = require("crypto");

const {
  obtenerXml,
  reemplazarXml,
} = require("../../../../shared/utils/excelXml.util");

const { RegistroEstilos } = require("../seguimientoSstExcel.estilos");

const { buscarRutaHoja } = require("../rutasLibroExcel");

/**
 * Hojas del seguimiento SST cuyos datos o fórmulas provienen de la base de
 * datos o del aplicativo. Se protegen para que no se editen desde Excel.
 */

const HOJAS_PROTEGIDAS = [
  "Extintores",
  "Camillas",
  "Señalizacion",
  "Equipo_T.A.D.E",
  "Botiquin",
  "_RESUMEN",
  "General",
];

const NOMBRE_HOJA_INICIO = "Inicio";

/**
 * Celdas que el usuario sí puede escribir en hojas protegidas. En General se
 * escribe el identificador de la inspección que se quiere buscar.
 */

const CELDAS_LIBRES = {
  General: ["C11"],
};

/**
 * Acciones que siguen permitidas con la hoja protegida y no alteran los
 * datos: ajustar el ancho de columnas y el alto de filas, y filtrar. Seleccionar
 * y copiar celdas bloqueadas también está permitido por defecto.
 */

const PERMISOS_HOJA = 'autoFilter="0"';

const ITERACIONES_CLAVE = 100000;

/**
 * Calcula el hash de la contraseña de protección de una hoja con el
 * algoritmo que usa Excel (SHA-512 con sal y 100 000 iteraciones).
 *
 * @param {string} clave Contraseña en texto.
 * @param {Buffer} sal Sal aleatoria.
 * @returns {string} Hash en base64.
 */

function calcularHashClave(clave, sal) {
  let hash = crypto
    .createHash("sha512")
    .update(Buffer.concat([sal, Buffer.from(clave, "utf16le")]))
    .digest();

  for (let iteracion = 0; iteracion < ITERACIONES_CLAVE; iteracion += 1) {
    const contador = Buffer.alloc(4);

    contador.writeUInt32LE(iteracion);

    hash = crypto
      .createHash("sha512")
      .update(Buffer.concat([hash, contador]))
      .digest();
  }

  return hash.toString("base64");
}

/**
 * Construye el elemento `sheetProtection`. Sin contraseña, cualquiera puede
 * desproteger la hoja desde Excel; con contraseña, solo quien la conozca.
 *
 * @param {string} [clave] Contraseña opcional.
 * @param {Buffer} [sal] Sal para el hash; se genera una si no se indica.
 * @returns {string} Elemento XML de protección.
 */

function construirElementoProteccion(clave = "", sal = crypto.randomBytes(16)) {
  if (!clave) {
    return `<sheetProtection sheet="1" objects="1" scenarios="1" ${PERMISOS_HOJA}/>`;
  }

  return (
    '<sheetProtection algorithmName="SHA-512" ' +
    `hashValue="${calcularHashClave(clave, sal)}" ` +
    `saltValue="${sal.toString("base64")}" spinCount="${ITERACIONES_CLAVE}" ` +
    `sheet="1" objects="1" scenarios="1" ${PERMISOS_HOJA}/>`
  );
}

/**
 * Inserta la protección en la posición que exige el esquema: justo después de
 * los datos de la hoja y antes de filtros, celdas combinadas y formatos.
 * Reemplaza la protección que la hoja ya tuviera.
 *
 * @param {string} hojaXml Contenido XML de la hoja.
 * @param {string} elemento Elemento `sheetProtection`.
 * @returns {string} XML de la hoja protegida.
 * @throws {Error} Si la hoja no tiene datos donde insertar la protección.
 */

function insertarProteccionXml(hojaXml, elemento) {
  const sinProteccion = hojaXml.replace(/<sheetProtection\b[^>]*\/>/g, "");

  let insertada = false;

  const resultado = sinProteccion.replace(
    /(<\/sheetData>|<sheetData\/>)(<sheetCalcPr\b[^>]*\/>)?/,
    (coincidencia, datos, calculo = "") => {
      insertada = true;

      return `${datos}${calculo}${elemento}`;
    },
  );

  if (!insertada) {
    throw new Error("La hoja no tiene sheetData donde insertar la protección");
  }

  return resultado;
}

/**
 * Crea una copia del formato de celda con la celda desbloqueada.
 *
 * @param {string} xf Elemento `xf` del formato original.
 * @returns {string} Elemento `xf` con `locked="0"`.
 */

function crearFormatoDesbloqueado(xf) {
  let resultado = /\bapplyProtection="[^"]*"/.test(xf)
    ? xf.replace(/\bapplyProtection="[^"]*"/, 'applyProtection="1"')
    : xf.replace(/^<xf\b/, '<xf applyProtection="1"');

  if (/<protection\b[^>]*\/>/.test(resultado)) {
    return resultado.replace(/<protection\b[^>]*\/>/, '<protection locked="0"/>');
  }

  if (/\/>$/.test(resultado)) {
    return resultado.replace(/\/>$/, '><protection locked="0"/></xf>');
  }

  return resultado.replace(/<\/xf>$/, '<protection locked="0"/></xf>');
}

/**
 * Desbloquea una celda para que se pueda editar con la hoja protegida.
 * Si la celda no existe en la hoja, no hace nada.
 *
 * @param {string} hojaXml Contenido XML de la hoja.
 * @param {string} referencia Referencia de la celda, por ejemplo `C11`.
 * @param {RegistroEstilos} registro Registro de estilos del libro.
 * @returns {string} XML de la hoja con la celda desbloqueada.
 */

function desbloquearCeldaXml(hojaXml, referencia, registro) {
  const inicio = hojaXml.search(new RegExp(`<c\\b[^>]*\\br="${referencia}"`));

  if (inicio < 0) {
    return hojaXml;
  }

  const fin = hojaXml.indexOf(">", inicio) + 1;

  const apertura = hojaXml.slice(inicio, fin);

  const estiloActual = Number(apertura.match(/\bs="(\d+)"/)?.[1] ?? 0);

  const estiloNuevo = registro.agregar(
    "cellXfs",
    crearFormatoDesbloqueado(registro.elementos.cellXfs[estiloActual]),
  );

  const aperturaNueva = /\bs="\d+"/.test(apertura)
    ? apertura.replace(/\bs="\d+"/, `s="${estiloNuevo}"`)
    : apertura.replace(/^<c\b/, `<c s="${estiloNuevo}"`);

  return hojaXml.slice(0, inicio) + aperturaNueva + hojaXml.slice(fin);
}

/**
 * Protege las hojas del seguimiento SST alimentadas por la base de datos.
 *
 * Solo afecta lo que se puede editar desde Excel: el aplicativo escribe
 * directamente en el archivo y no se ve afectado. En hojas protegidas se
 * permite filtrar, ajustar columnas y filas, y seleccionar o copiar celdas.
 *
 * @param {AdmZip} zip Archivo XLSM abierto como contenedor ZIP.
 * @param {Object} [opciones] Opciones de protección.
 * @param {string} [opciones.clave] Contraseña de protección; si se omite, las
 * hojas se protegen sin contraseña.
 * @param {boolean} [opciones.incluirInicio=true] Si también se protege la hoja
 * Inicio.
 * @returns {{hojas: string[], conClave: boolean}} Hojas protegidas.
 */

function protegerHojas(zip, { clave = "", incluirInicio = true } = {}) {
  const elemento = construirElementoProteccion(clave);

  const nombres = incluirInicio
    ? [NOMBRE_HOJA_INICIO, ...HOJAS_PROTEGIDAS]
    : HOJAS_PROTEGIDAS;

  const registro = new RegistroEstilos(zip);

  const protegidas = [];

  for (const nombre of nombres) {
    const ruta = buscarRutaHoja(zip, nombre);

    if (!ruta || !zip.getEntry(ruta)) {
      continue;
    }

    let hojaXml = obtenerXml(zip, ruta);

    for (const referencia of CELDAS_LIBRES[nombre] || []) {
      hojaXml = desbloquearCeldaXml(hojaXml, referencia, registro);
    }

    hojaXml = insertarProteccionXml(hojaXml, elemento);

    // Los estilos nuevos se guardan antes de que la hoja los use.
    registro.guardar();

    reemplazarXml(zip, ruta, hojaXml);

    protegidas.push(nombre);
  }

  return { hojas: protegidas, conClave: Boolean(clave) };
}

module.exports = {
  HOJAS_PROTEGIDAS,
  calcularHashClave,
  construirElementoProteccion,
  insertarProteccionXml,
  protegerHojas,
};
