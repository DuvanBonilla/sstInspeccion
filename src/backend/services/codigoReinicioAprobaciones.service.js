const crypto = require("node:crypto");

const DURACION_CODIGO_MS = 10 * 60 * 1000;
const MAXIMO_INTENTOS = 5;

function generarCodigoReinicio() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

function crearHashCodigoReinicio(codigo) {
  const salt = crypto.randomBytes(16).toString("hex");

  const hash = crypto
    .scryptSync(String(codigo), salt, 64)
    .toString("hex");

  return { hash, salt };
}

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

function calcularVencimientoCodigo(fechaActual = new Date()) {
  return new Date(fechaActual.getTime() + DURACION_CODIGO_MS);
}

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
