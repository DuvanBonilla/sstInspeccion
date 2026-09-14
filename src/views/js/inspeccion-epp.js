/**
 * inspeccion-epp.js
 *
 * Controlador principal del formulario de Inspección EPP.
 *
 * Responsabilidades actuales:
 * - Inicializar la fecha de inspección.
 * - Controlar la navegación entre pasos.
 * - Validar Información General.
 * - Actualizar la barra de progreso.
 * - Construir el resumen de Información General.
 * - Controlar la salida del formulario.
 *
 * Posteriormente:
 * - Gestión dinámica de trabajadores.
 * - Evaluación de elementos EPP.
 * - Evidencias.
 * - Construcción del payload.
 * - Envío al backend.
 */

import { asignarFechaHoy, abrirSelectorFecha } from "/js/shared.js";

import {
  createTrabajadoresEppManager,
  cargarCatalogoEpp,
} from "./trabajadoresEpp.js";

import { esNovedadEpp } from "./epp/reglasEpp.js";

import { construirInspeccionEpp as construirPayloadInspeccionEpp } from "./epp/inspeccionEpp.payload.js";

import { construirFormDataEpp as construirContenidoFormDataEpp } from "./epp/inspeccionEpp.formData.js";

import { enviarInspeccionEpp as enviarInspeccionEppApi } from "./epp/inspeccionEpp.api.js";

import { inicializarEnvioEpp } from "./epp/controllers/envioInspeccionEpp.controller.js";

import { crearNavegacionInspeccionEpp } from "./epp/controllers/navegacionInspeccionEpp.controller.js";

const TOTAL_PASOS = 3;

const fecha = document.getElementById("fecha");

const btnSalir = document.getElementById("btn-salir");

const btnLogoInicio = document.getElementById("btn-logo-inicio");

const cancelarModal = document.getElementById("cancelar-modal");

const btnCancelarNo = document.getElementById("btn-cancelar-no");

const btnCancelarSi = document.getElementById("btn-cancelar-si");

const trabajadoresManager = createTrabajadoresEppManager({
  container: document.getElementById("trabajadores-container"),

  cantidadInput: document.getElementById("cantidadTrabajadores"),

  generarButton: document.getElementById("btn-generar-trabajadores"),

  estadoElement: document.getElementById("trabajadores-estado"),

  agregarButton: document.getElementById("btn-agregar-trabajador"),

  accionesElement: document.getElementById("acciones-trabajadores"),
});

const camposInformacionGeneral = [
  "fecha",
  "sedeOperacion",
  "areaTrabajo",
  "jefeResponsable",
  "cargoJefe",
  "responsableInspeccion",
  "cargoResponsable",
];

const navegacion =
  crearNavegacionInspeccionEpp({
    documento: document,

    ventana: window,

    totalPasos: TOTAL_PASOS,

    validarInformacionGeneral,

    validarTrabajadores() {
      return trabajadoresManager.validar().valido;
    },

    prepararResumen() {
      construirResumenGeneral();

      construirResumenTrabajadores();

      verificarInspeccionEpp();

      verificarFormDataEpp();
    },
  });

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await cargarCatalogoEpp();

    inicializarFecha();

    navegacion.inicializar();;

    inicializarSalida();

    trabajadoresManager.init();

    inicializarEnvioEpp({
      documento: document,

      ventana: window,

      enviarInspeccionEpp,
    });

    navegacion.navegacion.actualizarPaso();

    inicializarAccionesModalExito();
  } catch (error) {
    console.error("[EPP] Error inicializando inspección:", error);

    alert(
      "No fue posible cargar el catálogo de elementos EPP. " +
        "Recarga la página e intenta nuevamente.",
    );
  }
});

function inicializarFecha() {
  if (!fecha) {
    return;
  }

  // Asignar automáticamente la fecha actual
  asignarFechaHoy(fecha);

  // El selector nativo solo puede abrirse
  // como consecuencia de una acción del usuario.
  fecha.addEventListener("click", () => {
    abrirSelectorFecha(fecha);
  });
}

function inicializarAccionesModalExito() {
  const btnInicio = document.getElementById("btn-modal-inicio");
  const btnNueva = document.getElementById("btn-modal-nueva");

  btnInicio?.addEventListener("click", () => {
    window.location.href = "/";
  });

  btnNueva?.addEventListener("click", () => {
    window.location.href = "/inspeccion-epp";
  });
}

/**
 * Valida que los campos obligatorios de la información general estén completos.
 *
 * Marca visualmente los campos vacíos y posiciona el foco sobre el primer
 * campo que no cumple la validación.
 *
 * @returns {boolean} `true` si todos los campos requeridos tienen información;
 * de lo contrario, `false`.
 */

function validarInformacionGeneral() {
  let valido = true;

  let primerCampoInvalido = null;

  camposInformacionGeneral.forEach((id) => {
    const campo = document.getElementById(id);

    if (!campo) {
      return;
    }

    const valor = campo.value.trim();

    if (!valor) {
      valido = false;

      campo.classList.add("campo-error");

      if (!primerCampoInvalido) {
        primerCampoInvalido = campo;
      }
    } else {
      campo.classList.remove("campo-error");
    }
  });

  if (primerCampoInvalido) {
    primerCampoInvalido.focus();
  }

  return valido;
}

function actualizarBotonSiguienteGeneral() {
  const botonSiguiente = document.querySelector(
    '[data-step-panel="1"] [data-step-target="2"]',
  );

  if (!botonSiguiente) {
    return;
  }

  const camposCompletos = camposInformacionGeneral.every((id) => {
    const campo = document.getElementById(id);

    if (!campo || campo.disabled) {
      return true;
    }

    return String(campo.value || "").trim() !== "";
  });

  botonSiguiente.disabled = !camposCompletos;
}

camposInformacionGeneral.forEach((id) => {
  const campo = document.getElementById(id);

  if (!campo) {
    return;
  }

  const actualizarCampo = () => {
    if (campo.value.trim()) {
      campo.classList.remove("campo-error");
    }

    actualizarBotonSiguienteGeneral();
  };

  campo.addEventListener("input", actualizarCampo);
  campo.addEventListener("change", actualizarCampo);
});

actualizarBotonSiguienteGeneral();

function construirResumenGeneral() {
  asignarTextoResumen("resumen-fecha", obtenerValor("fecha"));

  asignarTextoResumen("resumen-sede", obtenerValor("sedeOperacion"));

  asignarTextoResumen("resumen-area", obtenerValor("areaTrabajo"));

  asignarTextoResumen("resumen-jefe", obtenerValor("jefeResponsable"));

  asignarTextoResumen("resumen-cargo-jefe", obtenerValor("cargoJefe"));

  asignarTextoResumen(
    "resumen-responsable",
    obtenerValor("responsableInspeccion"),
  );

  asignarTextoResumen(
    "resumen-cargo-responsable",
    obtenerValor("cargoResponsable"),
  );
}

/**
 * Construye el resumen visual de los trabajadores incluidos en la inspección.
 *
 * Por cada trabajador muestra sus datos principales, la cantidad de elementos
 * EPP evaluados, las novedades encontradas, el estado del plan de acción y la
 * existencia de evidencia. También calcula los totales generales del resumen.
 *
 * @returns {void}
 */

function construirResumenTrabajadores() {
  const trabajadores = trabajadoresManager.leer();

  const evidencias = trabajadoresManager.obtenerEvidencias();

  // -------------------------------------------------------
  // CONTENEDOR
  // -------------------------------------------------------

  const container = document.getElementById("resumen-trabajadores");

  if (!container) {
    return;
  }

  // -------------------------------------------------------
  // LIMPIAR RESUMEN ANTERIOR
  // -------------------------------------------------------

  container.innerHTML = "";

  // -------------------------------------------------------
  // CALCULAR TOTALES
  // -------------------------------------------------------

  let totalNovedades = 0;

  let trabajadoresConNovedades = 0;

  trabajadores.forEach((trabajador) => {
    const novedades = trabajador.elementos.filter((elemento) =>
      esNovedadEpp(elemento.condicion, elemento.uso),
    );

    if (novedades.length > 0) {
      trabajadoresConNovedades++;
    }

    totalNovedades += novedades.length;

    // ---------------------------------------------------
    // BUSCAR EVIDENCIA
    // ---------------------------------------------------

    const tieneEvidencia = evidencias.some(
      (evidencia) => evidencia.trabajadorId === trabajador.trabajadorId,
    );

    // ---------------------------------------------------
    // CREAR TARJETA RESUMEN
    // ---------------------------------------------------

    const card = document.createElement("div");

    card.className = "resumen-trabajador-card";

    card.innerHTML = `

        <div class="resumen-trabajador-header">

          <div>

            <strong>
              Trabajador ${trabajador.indice + 1}
            </strong>

            <span class="resumen-trabajador-nombre">
              ${escaparHtml(trabajador.nombre)}
            </span>

          </div>

          <span class="resumen-estado">
            Completo
          </span>

        </div>


        <div class="resumen-trabajador-grid">

          <div>
            <span class="resumen-label">
              Código
            </span>

            <strong>
              ${escaparHtml(trabajador.codigo)}
            </strong>
          </div>


          <div>
            <span class="resumen-label">
              Labor / Cargo
            </span>

            <strong>
              ${escaparHtml(trabajador.cargo)}
            </strong>
          </div>


          <div>
            <span class="resumen-label">
              EPP evaluados
            </span>

            <strong>
              ${trabajador.elementos.length}
            </strong>
          </div>


          <div>
            <span class="resumen-label">
              Novedades
            </span>

            <strong>
              ${novedades.length}
            </strong>
          </div>


          <div>
            <span class="resumen-label">
              Plan de acción
            </span>

            <strong>
              ${trabajador.planAccion ? "Registrado" : "No requerido"}
            </strong>
          </div>


          <div>
            <span class="resumen-label">
              Evidencia
            </span>

            <strong>
              ${tieneEvidencia ? "Registrada" : "Sin evidencia"}
            </strong>
          </div>

        </div>

      `;

    container.appendChild(card);
  });

  // -------------------------------------------------------
  // TOTALES GENERALES
  // -------------------------------------------------------

  asignarTextoResumen("resumen-total-trabajadores", trabajadores.length);

  asignarTextoResumen("resumen-trabajadores-novedad", trabajadoresConNovedades);

  asignarTextoResumen(
    "resumen-trabajadores-sin-novedad",
    trabajadores.length - trabajadoresConNovedades,
  );

  asignarTextoResumen("resumen-total-novedades", totalNovedades);
}

function escaparHtml(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/**
 * Genera un identificador único para una inspección EPP.
 *
 * El identificador combina el prefijo de inspección, la fecha actual y una
 * cadena aleatoria en mayúsculas.
 *
 * @returns {string} Identificador con formato `INSP-AAAAMMDD-XXXX`.
 */

function generarInspeccionId() {
  const hoy = new Date();

  const fecha =
    `${hoy.getFullYear()}` +
    `${String(hoy.getMonth() + 1).padStart(2, "0")}` +
    `${String(hoy.getDate()).padStart(2, "0")}`;

  const aleatorio = Math.random().toString(36).slice(2, 6).toUpperCase();

  return `INSP-${fecha}-${aleatorio}`;
}
// CONSTRUIR INSPECCIÓN EPP
// =========================================================

/**
 * Construye el objeto principal de la inspección EPP.
 *
 * Recopila la información general registrada en el formulario y los datos
 * de los trabajadores administrados por el gestor de trabajadores.
 *
 * @param {string|null} [inspeccionId=null] - Identificador asignado a la inspección.
 * @returns {Object} Datos estructurados de la inspección EPP.
 */

function construirInspeccionEpp(inspeccionId = null) {
  return construirPayloadInspeccionEpp({
    inspeccionId,

    obtenerValor,

    trabajadores: trabajadoresManager.leer(),
  });
}

/**
 * Construye el contenido multipart utilizado para enviar la inspección EPP.
 *
 * Agrega la inspección serializada en el campo `payload` y adjunta las
 * evidencias de cada trabajador utilizando nombres de campo asociados
 * con su posición dentro de la inspección.
 *
 * También incorpora la fecha de modificación de cada archivo como respaldo
 * para determinar la fecha de la evidencia.
 *
 * @param {string|null} [inspeccionId=null] - Identificador de la inspección.
 * @returns {FormData} FormData con el payload y las evidencias de los trabajadores.
 */

function construirFormDataEpp(inspeccionId = null) {
  return construirContenidoFormDataEpp({
    inspeccion: construirInspeccionEpp(inspeccionId),

    evidencias: trabajadoresManager.obtenerEvidencias(),
  });
}

/**
 * Envía la inspección EPP y sus evidencias al backend.
 *
 * Genera un identificador para la operación, construye el FormData y realiza
 * una solicitud POST al endpoint encargado de registrar la inspección.
 *
 * @async
 * @returns {Promise<Object>} Respuesta procesada enviada por el backend.
 * @throws {Error} Si el servidor rechaza la solicitud o no puede completarse el envío.
 */

async function enviarInspeccionEpp() {
  try {
    const inspeccionId = generarInspeccionId();

    const formData = construirFormDataEpp(inspeccionId);

    return await enviarInspeccionEppApi(formData);
  } catch (error) {
    console.error("❌ Error enviando inspección EPP:", error);

    throw error;
  }
}

function verificarFormDataEpp() {
  const formData = construirFormDataEpp();

  for (const [clave, valor] of formData.entries()) {
    if (valor instanceof File) {
      console.log(clave, {
        nombre: valor.name,
        tipo: valor.type,
        tamaño: valor.size,
        lastModified: valor.lastModified,
      });
    } else {
      console.log(clave, valor);
    }
  }
}

function verificarInspeccionEpp() {
  const inspeccion = construirInspeccionEpp();

  const evidencias = trabajadoresManager.obtenerEvidencias();

  console.log("======================================");

  console.log("INSPECCIÓN EPP FINAL:", inspeccion);

  console.log("EVIDENCIAS EPP:", evidencias);

  console.log("======================================");
}

function obtenerValor(id) {
  const elemento = document.getElementById(id);

  if (!elemento) {
    return "";
  }

  return elemento.value.trim();
}

function asignarTextoResumen(id, valor) {
  const elemento = document.getElementById(id);

  if (!elemento) {
    return;
  }

  elemento.textContent = valor || "—";
}

function inicializarSalida() {
  // Botón de salida de la esquina superior derecha
  btnSalir?.addEventListener("click", abrirModalSalida);

  // Logo de Cargoban de la esquina superior izquierda
  btnLogoInicio?.addEventListener("click", abrirModalSalida);

  // Continuar trabajando
  btnCancelarNo?.addEventListener("click", cerrarModalSalida);

  // Confirmar salida
  btnCancelarSi?.addEventListener("click", () => {
    window.location.href = "/";
  });

  // Cerrar pulsando fuera del cuadro
  cancelarModal?.addEventListener("click", (event) => {
    if (event.target === cancelarModal) {
      cerrarModalSalida();
    }
  });

  // Cerrar con ESC
  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      cancelarModal?.classList.contains("visible")
    ) {
      cerrarModalSalida();
    }
  });
}

function abrirModalSalida() {
  cancelarModal?.classList.add("visible");
}

function cerrarModalSalida() {
  cancelarModal?.classList.remove("visible");
}
