/**
 * Normaliza un teléfono celular colombiano para utilizarlo en wa.me.
 *
 * Acepta números como:
 * - 3001234567
 * - 57 300 123 4567
 * - +57 300 123 4567
 *
 * @param {unknown} valor Número recibido.
 * @returns {string} Número con formato 573001234567, o vacío si es inválido.
 */
export function normalizarTelefonoColombia(valor) {
  let telefono = String(valor ?? "").replace(/\D/g, "");

  if (telefono.startsWith("57") && telefono.length === 12) {
    telefono = telefono.slice(2);
  }

  if (!/^3\d{9}$/.test(telefono)) {
    return "";
  }

  return `57${telefono}`;
}

/**
 * Comprueba si un valor corresponde a un celular colombiano.
 *
 * @param {unknown} valor Número recibido.
 * @returns {boolean}
 */
export function validarTelefonoColombia(valor) {
  return normalizarTelefonoColombia(valor) !== "";
}

/**
 * Normaliza una dirección de correo.
 *
 * @param {unknown} valor Correo recibido.
 * @returns {string}
 */
export function normalizarCorreo(valor) {
  return String(valor ?? "").trim().toLowerCase();
}

/**
 * Comprueba si una dirección de correo tiene un formato válido.
 *
 * @param {unknown} valor Correo recibido.
 * @returns {boolean}
 */
export function validarCorreo(valor) {
  const correo = normalizarCorreo(valor);

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
}

/**
 * Construye el mensaje para solicitar la aprobación de una inspección.
 *
 * @param {Object} datos Información incluida en el mensaje.
 * @param {string} datos.tipoInspeccion Tipo de inspección: SST o EPP.
 * @param {string} datos.rol Rol del destinatario.
 * @param {string|number|null} [datos.numInspeccion] Consecutivo de inspección.
 * @param {string|null} [datos.inspeccionId] Identificador de inspección.
 * @param {string} [datos.sede] Sede de operación.
 * @param {string} [datos.area] Área inspeccionada.
 * @param {string} datos.enlace Enlace personal de aprobación.
 * @returns {string}
 */
export function crearMensajeAprobacion({
  tipoInspeccion,
  rol,
  numInspeccion = null,
  inspeccionId = null,
  sede = "",
  area = "",
  enlace,
}) {
  const referencia =
    numInspeccion != null && String(numInspeccion).trim()
      ? `N.º ${numInspeccion}`
      : inspeccionId || "sin consecutivo";

  const lineas = [
    `Solicitud de aprobación de inspección ${tipoInspeccion}.`,
    "",
    `Rol de aprobación: ${rol}.`,
    `Inspección: ${referencia}.`,
  ];

  if (sede) {
    lineas.push(`Sede: ${sede}.`);
  }

  if (area) {
    lineas.push(`Área: ${area}.`);
  }

  lineas.push(
    "",
    "Por favor, revise y registre su aprobación mediante el siguiente enlace:",
    enlace,
    "",
    "Este enlace es personal. No debe compartirse con otras personas.",
  );

  return lineas.join("\n");
}

/**
 * Construye una URL gratuita de WhatsApp con un mensaje predeterminado.
 *
 * @param {Object} datos Datos del enlace.
 * @param {unknown} datos.telefono Teléfono del destinatario.
 * @param {string} datos.mensaje Mensaje que se mostrará en WhatsApp.
 * @returns {string} URL de wa.me, o vacío cuando el teléfono es inválido.
 */
export function crearUrlWhatsApp({ telefono, mensaje }) {
  const telefonoNormalizado = normalizarTelefonoColombia(telefono);

  if (!telefonoNormalizado) {
    return "";
  }

  return `https://wa.me/${telefonoNormalizado}?text=${encodeURIComponent(
    String(mensaje ?? ""),
  )}`;
}

/**
 * Construye una URL mailto con asunto y mensaje predeterminados.
 *
 * @param {Object} datos Datos del correo.
 * @param {unknown} datos.correo Dirección del destinatario.
 * @param {string} datos.asunto Asunto del mensaje.
 * @param {string} datos.mensaje Cuerpo del mensaje.
 * @returns {string} URL mailto, o vacío cuando el correo es inválido.
 */
export function crearUrlCorreo({ correo, asunto, mensaje }) {
  const correoNormalizado = normalizarCorreo(correo);

  if (!validarCorreo(correoNormalizado)) {
    return "";
  }

  const parametros = new URLSearchParams({
    subject: String(asunto ?? ""),
    body: String(mensaje ?? ""),
  });

  return `mailto:${correoNormalizado}?${parametros.toString()}`;
}