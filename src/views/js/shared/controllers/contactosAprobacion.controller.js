import {
  crearMensajeAprobacion,
  crearUrlCorreo,
  crearUrlWhatsApp,
  validarCorreo,
  validarTelefonoColombia,
} from "../aprobacionContacto.js";

const ICONO_WHATSAPP = `
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path fill="currentColor" d="M12.04 2a9.84 9.84 0 0 0-8.45 14.88L2 22l5.25-1.55A9.92 9.92 0 1 0 12.04 2Zm0 17.98a8.05 8.05 0 0 1-4.1-1.12l-.29-.17-3.12.92.94-3.04-.19-.31a7.91 7.91 0 1 1 6.76 3.72Zm4.42-5.94c-.24-.12-1.43-.7-1.65-.79-.22-.08-.38-.12-.54.12-.16.24-.62.79-.76.95-.14.16-.28.18-.52.06-.24-.12-1.02-.37-1.94-1.19a7.28 7.28 0 0 1-1.34-1.67c-.14-.24-.01-.37.11-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.19-.47-.39-.4-.54-.41h-.46a.88.88 0 0 0-.64.3c-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.69 2.58 4.1 3.62.57.25 1.02.39 1.37.5.58.18 1.1.16 1.51.1.46-.07 1.43-.59 1.63-1.15.2-.56.2-1.04.14-1.15-.06-.1-.22-.16-.46-.28Z" />
  </svg>
`;

const ICONO_CORREO = `
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path fill="currentColor" d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm0 4-8 5-8-5V6l8 5 8-5v2Z" />
  </svg>
`;

const DESTINATARIOS_PREDETERMINADOS = [
  {
    clave: "jefe",
    metodoId: "metodo-aprobacion-jefe",
    destinoId: "destino-aprobacion-jefe",
    errorId: "error-aprobacion-jefe",
    botonId: "btn-compartir-aprobacion-jefe",
    rol: "Jefe de Área",
  },
  {
    clave: "copasst",
    metodoId: "metodo-aprobacion-copasst",
    destinoId: "destino-aprobacion-copasst",
    errorId: "error-aprobacion-copasst",
    botonId: "btn-compartir-aprobacion-copasst",
    rol: "COPASST",
  },
];

/**
 * Crea el controlador de los datos de contacto utilizados para enviar
 * los enlaces de aprobación.
 *
 * @param {Object} dependencias Dependencias del controlador.
 * @param {Document} dependencias.documento Documento de la interfaz.
 * @param {Array<Object>} [dependencias.destinatarios] Configuración de campos.
 * @returns {Object} API pública del controlador.
 */
export function crearContactosAprobacionController({
  documento,
  destinatarios = DESTINATARIOS_PREDETERMINADOS,
}) {
  function obtenerElementos(configuracion) {
    return {
      metodo: documento.getElementById(configuracion.metodoId),
      destino: documento.getElementById(configuracion.destinoId),
      error: documento.getElementById(configuracion.errorId),
    };
  }

  function obtenerMensajeError(metodo) {
    if (metodo === "whatsapp") {
      return "Ingrese un número celular colombiano válido.";
    }

    if (metodo === "correo") {
      return "Ingrese una dirección de correo electrónico válida.";
    }

    return "Seleccione un medio para enviar el enlace.";
  }

  function actualizarCampo(configuracion) {
    const { metodo, destino, error } = obtenerElementos(configuracion);

    if (!metodo || !destino) {
      return;
    }

    if (metodo.value === "whatsapp") {
      destino.type = "tel";
      destino.placeholder = "Ejemplo: 3001234567";
      destino.inputMode = "tel";
      destino.autocomplete = "tel";
    } else if (metodo.value === "correo") {
      destino.type = "email";
      destino.placeholder = "Ejemplo: nombre@empresa.com";
      destino.inputMode = "email";
      destino.autocomplete = "email";
    } else {
      destino.type = "text";
      destino.placeholder = "Seleccione primero el medio de envío";
      destino.inputMode = "text";
      destino.autocomplete = "off";
    }

    destino.disabled = !metodo.value;

    destino.classList.remove("campo-error");
    metodo.classList.remove("campo-error");

    if (error) {
      error.textContent = "";
      error.classList.add("hidden");
    }
  }

  function validarContacto(configuracion, mostrarErrores = true) {
    const { metodo, destino, error } = obtenerElementos(configuracion);

    if (!metodo || !destino) {
      return {
        valido: false,
        campo: metodo || destino || null,
      };
    }

    const medio = String(metodo.value || "").trim();
    const valor = String(destino.value || "").trim();

    let valido = false;

    if (medio === "whatsapp") {
      valido = validarTelefonoColombia(valor);
    } else if (medio === "correo") {
      valido = validarCorreo(valor);
    }

    if (mostrarErrores) {
      metodo.classList.toggle("campo-error", !medio);
      destino.classList.toggle("campo-error", Boolean(medio) && !valido);

      if (error) {
        error.textContent = valido ? "" : obtenerMensajeError(medio);
        error.classList.toggle("hidden", valido);
      }
    }

    return {
      valido,
      campo: !medio ? metodo : destino,
    };
  }

  function validar() {
    let valido = true;
    let primerCampoInvalido = null;

    destinatarios.forEach((configuracion) => {
      const resultado = validarContacto(configuracion);

      if (!resultado.valido) {
        valido = false;

        if (!primerCampoInvalido) {
          primerCampoInvalido = resultado.campo;
        }
      }
    });

    primerCampoInvalido?.focus();

    return valido;
  }

  function esValido() {
    return destinatarios.every(
      (configuracion) => validarContacto(configuracion, false).valido,
    );
  }

  function obtenerContactos() {
    return destinatarios.reduce((contactos, configuracion) => {
      const { metodo, destino } = obtenerElementos(configuracion);

      contactos[configuracion.clave] = {
        metodo: String(metodo?.value || "").trim(),
        destino: String(destino?.value || "").trim(),
      };

      return contactos;
    }, {});
  }

  function ocultarAccion(boton) {
    if (!boton) {
      return;
    }

    boton.href = "#";
    boton.dataset.metodo = "";
    boton.classList.add("hidden");
  }

  function configurarAcciones({
    links = {},
    tipoInspeccion,
    inspeccionId = null,
    numInspeccion = null,
    sede = "",
    area = "",
  } = {}) {
    const contactos = obtenerContactos();

    destinatarios.forEach((configuracion) => {
      const boton = documento.getElementById(configuracion.botonId);
      const contacto = contactos[configuracion.clave];
      const enlace = links?.[configuracion.clave];

      if (!boton || !contacto?.metodo || !contacto.destino || !enlace) {
        ocultarAccion(boton);
        return;
      }

      const mensaje = crearMensajeAprobacion({
        tipoInspeccion,
        rol: configuracion.rol,
        numInspeccion,
        inspeccionId,
        sede,
        area,
        enlace,
      });

      if (contacto.metodo === "whatsapp") {
        boton.href = crearUrlWhatsApp({
          telefono: contacto.destino,
          mensaje,
        });
        boton.innerHTML = ICONO_WHATSAPP;
        boton.title = "Abrir conversación en WhatsApp";
        boton.setAttribute("aria-label", "Abrir conversación en WhatsApp");
      } else if (contacto.metodo === "correo") {
        const referencia = numInspeccion
          ? `N.º ${numInspeccion}`
          : inspeccionId || "";

        boton.href = crearUrlCorreo({
          correo: contacto.destino,
          asunto:
            `Aprobación de inspección ${tipoInspeccion} ${referencia}`.trim(),
          mensaje,
        });
        boton.innerHTML = ICONO_CORREO;
        boton.title = "Preparar correo de aprobación";
        boton.setAttribute("aria-label", "Preparar correo de aprobación");
      } else {
        ocultarAccion(boton);
        return;
      }

      boton.dataset.metodo = contacto.metodo;
      boton.classList.remove("hidden");
    });
  }

  function manejarCambioMetodo(event) {
    const configuracion = destinatarios.find(
      (item) => item.metodoId === event.target?.id,
    );

    if (!configuracion) {
      return;
    }

    actualizarCampo(configuracion);
  }

  function manejarEntradaDestino(event) {
    const configuracion = destinatarios.find(
      (item) => item.destinoId === event.target?.id,
    );

    if (!configuracion) {
      return;
    }

    validarContacto(configuracion);
  }

  function inicializar() {
    destinatarios.forEach((configuracion) => {
      const { metodo, destino } = obtenerElementos(configuracion);

      metodo?.addEventListener("change", manejarCambioMetodo);
      destino?.addEventListener("input", manejarEntradaDestino);
      destino?.addEventListener("change", manejarEntradaDestino);

      actualizarCampo(configuracion);
    });
  }

  return {
    inicializar,
    validar,
    esValido,
    obtenerContactos,
    configurarAcciones,
    actualizarCampo,
  };
}
