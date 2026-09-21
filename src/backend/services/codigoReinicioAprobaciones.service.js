const crypto = require("node:crypto");

const DURACION_CODIGO_MS = 10 * 60 * 1000;
const MAXIMO_INTENTOS = 5;

/**
 * Genera un código numérico aleatorio de seis dígitos para reiniciar aprobaciones.
 *
 * @returns {string} Código entre `000000` y `999999`.
 */

function generarCodigoReinicio() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

/**
 * Genera un hash seguro y una sal para almacenar un código de reinicio.
 *
 * Utiliza `scrypt` para evitar persistir el código en texto plano.
 *
 * @param {string} codigo Código temporal que será protegido.
 * @returns {{hash: string, salt: string}} Hash generado y sal utilizada.
 */

function crearHashCodigoReinicio(codigo) {
  const salt = crypto.randomBytes(16).toString("hex");

  const hash = crypto
    .scryptSync(String(codigo), salt, 64)
    .toString("hex");

  return { hash, salt };
}

/**
 * Comprueba un código temporal contra su hash almacenado.
 *
 * La comparación se realiza en tiempo constante para reducir riesgos de ataques
 * basados en diferencias de tiempo.
 *
 * @param {string} codigo Código recibido para validación.
 * @param {string} hash Hash almacenado del código.
 * @param {string} salt Sal utilizada al generar el hash.
 * @returns {boolean} `true` si el código coincide con el hash.
 */

function compararCodigoReinicio(codigo, hash, salt) {
  const hashCalculado = crypto
    .scryptSync(String(codigo), salt, 64)
    .toString("hex");

  const recibido = Buffer.from(hashCalculado, "hex");
  const almacenado = Buffer.from(hash, "hex");

  return (
    recibido.length === almacenado.length &&
    crypto.timingSafeEqual(recibido, almacenado)
  );
}

/**
 * Calcula la fecha de vencimiento de un código de reinicio.
 *
 * @param {Date} [fechaActual=new Date()] Fecha y hora base del cálculo.
 * @returns {Date} Fecha y hora de vencimiento, diez minutos después.
 */

function calcularVencimientoCodigo(fechaActual = new Date()) {
  return new Date(fechaActual.getTime() + DURACION_CODIGO_MS);
}

/**
 * Valida si un código de reinicio puede utilizarse.
 *
 * Verifica que no haya sido usado, que no alcance el límite de intentos, que
 * no esté vencido y que coincida con el hash almacenado.
 *
 * @param {Object} datos Datos necesarios para la validación.
 * @param {string} datos.codigo Código recibido.
 * @param {string} datos.hash Hash almacenado.
 * @param {string} datos.salt Sal utilizada para crear el hash.
 * @param {Date|string} datos.venceEn Fecha de vencimiento.
 * @param {Date|string} [datos.fechaActual=new Date()] Fecha actual de referencia.
 * @param {number} [datos.intentos=0] Cantidad de intentos fallidos.
 * @param {Date|string|null} [datos.usadoEn=null] Fecha de uso previo del código.
 * @returns {{valido: boolean, motivo?: string}} Resultado de validación y, si
 * aplica, uno de los motivos: `UTILIZADO`, `BLOQUEADO`, `EXPIRADO` o `INCORRECTO`.
 */

function validarCodigoReinicio({
  codigo,
  hash,
  salt,
  venceEn,
  fechaActual = new Date(),
  intentos = 0,
  usadoEn = null,
}) {
  if (usadoEn) {
    return { valido: false, motivo: "UTILIZADO" };
  }

  if (intentos >= MAXIMO_INTENTOS) {
    return { valido: false, motivo: "BLOQUEADO" };
  }

  if (new Date(fechaActual) > new Date(venceEn)) {
    return { valido: false, motivo: "EXPIRADO" };
  }

  if (!compararCodigoReinicio(codigo, hash, salt)) {
    return { valido: false, motivo: "INCORRECTO" };
  }

  return { valido: true };
}

module.exports = {
  generarCodigoReinicio,
  crearHashCodigoReinicio,
  compararCodigoReinicio,
  calcularVencimientoCodigo,
  validarCodigoReinicio,
};
