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

import { crearValidacionInformacionGeneralEpp } from "./epp/controllers/validacionInformacionGeneralEpp.controller.js";

import { crearResumenTrabajadorHtml } from "./epp/resumenEpp.template.js";

import { crearResumenInspeccionEpp } from "./epp/controllers/resumenInspeccionEpp.controller.js";

import { crearSalidaInspeccionEppController } from "./epp/controllers/salidaInspeccionEpp.controller.js";

const resumenInspeccion = crearResumenInspeccionEpp({
  documento: document,

  obtenerValor,

  leerTrabajadores() {
    return trabajadoresManager.leer();
  },

  obtenerEvidencias() {
    return trabajadoresManager.obtenerEvidencias();
  },

  esNovedadEpp,

  crearResumenTrabajadorHtml,
});

const TOTAL_PASOS = 3;

const fecha = document.getElementById("fecha");

const salidaInspeccion = crearSalidaInspeccionEppController({
  documento: document,
  ventana: window,
});

const trabajadoresManager = createTrabajadoresEppManager({
  container: document.getElementById("trabajadores-container"),

  cantidadInput: document.getElementById("cantidadTrabajadores"),

  generarButton: document.getElementById("btn-generar-trabajadores"),

  estadoElement: document.getElementById("trabajadores-estado"),

  agregarButton: document.getElementById("btn-agregar-trabajador"),

  accionesElement: document.getElementById("acciones-trabajadores"),
});

const validacionInformacionGeneral = crearValidacionInformacionGeneralEpp({
  documento: document,
});

const navegacion = crearNavegacionInspeccionEpp({
  documento: document,

  ventana: window,

  totalPasos: TOTAL_PASOS,

  validarInformacionGeneral: validacionInformacionGeneral.validar,

  validarTrabajadores() {
    return trabajadoresManager.validar().valido;
  },

  prepararResumen() {
    resumenInspeccion.construir();
  },
});

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await cargarCatalogoEpp();

    inicializarFecha();

    validacionInformacionGeneral.inicializar();

    navegacion.inicializar();

    salidaInspeccion.inicializar();

    trabajadoresManager.init();

    inicializarEnvioEpp({
      documento: document,

      ventana: window,

      enviarInspeccionEpp,
    });

    navegacion.actualizarPaso();
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

function obtenerValor(id) {
  const elemento = document.getElementById(id);

  if (!elemento) {
    return "";
  }

  return elemento.value.trim();
}
