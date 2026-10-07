const { enviarCorreoPorGraph } = require("./correo.service");

const {
  construirHtmlSolicitudAprobacion,
} = require("./correoAprobacion.template");

const ROLES = ["jefe", "copasst"];

/**
 * Lee y valida los contactos utilizados en las solicitudes de aprobación.
 *
 * Acepta un objeto o su representación JSON. Verifica que Jefe de Área y
 * COPASST tengan un medio válido —correo o WhatsApp— y un destino con el
 * formato correspondiente.
 *
 * @param {Object|string|null|undefined} valor Contactos recibidos desde el
 * formulario o la base de datos.
 * @returns {Object|null} Contactos normalizados por rol, o `null` cuando no
 * se recibe ninguna configuración.
 * @throws {Error} Si la estructura, el medio de envío o el destino son inválidos.
 */

function leerContactosAprobacion(valor) {
  if (valor == null || valor === "") {
    return null; // Mantiene compatibles los envíos anteriores.
  }

  const contactos = typeof valor === "string" ? JSON.parse(valor) : valor;

  if (!contactos || typeof contactos !== "object" || Array.isArray(contactos)) {
    throw new Error("Los contactos de aprobación no son válidos.");
  }

  const resultado = {};

  for (const rol of ROLES) {
    const contacto = contactos[rol];
    const metodo = contacto?.metodo;
    const destino = String(contacto?.destino || "").trim();

    if (metodo === "correo") {
      if (
        destino.length > 254 ||
        !/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(destino)
      ) {
        throw new Error(`El correo de ${rol} no es válido.`);
      }
    } else if (metodo === "whatsapp") {
      if (!/^3\d{9}$/.test(destino)) {
        throw new Error(`El teléfono de ${rol} no es válido.`);
      }
    } else {
      throw new Error(`El medio de envío de ${rol} no es válido.`);
    }

    resultado[rol] = { metodo, destino };
  }

  return resultado;
}

/**
 * Envía por correo las solicitudes de aprobación configuradas para una inspección.
 *
 * Los contactos configurados para WhatsApp se marcan como envío manual. Para
 * los correos, valida que el enlace pertenezca al origen público configurado y
 * registra individualmente los resultados de Jefe de Área y COPASST.
 *
 * @async
 * @param {Object} datos Información de la inspección y sus destinatarios.
 * @param {Object|null} datos.contactos Contactos configurados por rol.
 * @param {Object} datos.links Enlaces de aprobación por rol.
 * @param {string} datos.tipoInspeccion Tipo de inspección.
 * @param {number|string} datos.numInspeccion Número consecutivo.
 * @param {string} datos.inspeccionId Identificador único de la inspección.
 * @param {string} datos.fecha Fecha de realización.
 * @param {string} datos.sede Sede operacional.
 * @param {string} datos.area Área inspeccionada.
 * @param {Function} [datos.enviarCorreo=enviarCorreoPorGraph] Función usada
 * para enviar el correo; permite inyectar una implementación de prueba.
 * @returns {Promise<Object>} Estado de envío por rol: `enviado`, `manual`,
 * `fallido` o `no_configurado`.
 */

async function enviarSolicitudesAprobacion({
  contactos,
  links,
  tipoInspeccion,
  numInspeccion,
  inspeccionId,
  fecha,
  sede,
  area,
  enviarCorreo = enviarCorreoPorGraph,
}) {
  const estados = {};

  for (const rol of ROLES) {
    const contacto = contactos?.[rol];

    if (!contacto) {
      estados[rol] = "no_configurado";
      continue;
    }

    if (contacto.metodo === "whatsapp") {
      estados[rol] = "manual";
      continue;
    }

    try {
      if (!links?.[rol]) {
        throw new Error(`No existe un enlace de aprobación para ${rol}.`);
      }

      // El envío real por Graph solo admite enlaces del origen público.
      // Las pruebas pueden seguir inyectando una función de correo simulada.
      if (enviarCorreo === enviarCorreoPorGraph) {
        const origenPublico = new URL(process.env.APP_URL);
        const origenEnlace = new URL(links[rol]);

        if (
          origenPublico.protocol !== "https:" ||
          origenEnlace.origin !== origenPublico.origin
        ) {
          throw new Error(
            "El enlace no pertenece a la URL pública configurada.",
          );
        }
      }

      const nombreRol = rol === "jefe" ? "Jefe de Área" : "COPASST";

      await enviarCorreo({
        to: contacto.destino,
        subject: `Solicitud de aprobación de inspección ${tipoInspeccion} N.º ${numInspeccion}`,
        html: construirHtmlSolicitudAprobacion({
          tipoInspeccion,
          rol: nombreRol,
          numInspeccion,
          inspeccionId,
          fecha,
          sede,
          area,
          enlace: links[rol],
        }),
      });

      estados[rol] = "enviado";
    } catch (error) {
      console.error(`[Aprobación] No se envió el correo de ${rol}:`, error);
      estados[rol] = "fallido";
    }
  }

  return estados;
}

module.exports = {
  leerContactosAprobacion,
  enviarSolicitudesAprobacion,
};
