const { enviarCorreoPorGraph } = require("./correo.service");

const {
  construirHtmlSolicitudAprobacion,
} = require("./correoAprobacion.template");

const ROLES = ["jefe", "copasst"];

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
