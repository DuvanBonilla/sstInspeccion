/**
 * inspeccion-epp.js
 *
 * Orquestador principal del formulario de Inspección EPP.
 *
 * Responsabilidades:
 * - Cargar el catálogo de elementos EPP.
 * - Crear y conectar los controladores de la interfaz.
 * - Inicializar el flujo principal del formulario.
 * - Coordinar trabajadores, payload, evidencias y envío.
 *
 * Las reglas, plantillas, validaciones y operaciones específicas
 * se encuentran separadas en los módulos del dominio EPP.
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

import { generarInspeccionId } from "./epp/inspeccionEpp.id.js";

const TOTAL_PASOS = 3;

const fecha = document.getElementById("fecha");

/*
 * 1. Administrador de trabajadores
 */
const trabajadoresManager = createTrabajadoresEppManager({
  container: document.getElementById("trabajadores-container"),

  cantidadInput: document.getElementById("cantidadTrabajadores"),

  generarButton: document.getElementById("btn-generar-trabajadores"),

  estadoElement: document.getElementById("trabajadores-estado"),

  agregarButton: document.getElementById("btn-agregar-trabajador"),

  accionesElement: document.getElementById("acciones-trabajadores"),
});

/*
 * 2. Validación de información general
 */
const validacionInformacionGeneral = crearValidacionInformacionGeneralEpp({
  documento: document,
});

/*
 * 3. Resumen de la inspección
 */
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

/*
 * 4. Navegación entre pasos
 */
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

/*
 * 5. Salida del formulario
 */
const salidaInspeccion = crearSalidaInspeccionEppController({
  documento: document,

  ventana: window,
});

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await cargarCatalogoEpp();
  } catch (error) {
    console.error("[EPP] Error cargando catálogo:", error);

    alert(
      "No fue posible cargar el catálogo de elementos EPP. " +
        "Recarga la página e intenta nuevamente.",
    );

    return;
  }

  try {
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
    console.error("[EPP] Error inicializando formulario:", error);

    alert(
      "No fue posible inicializar el formulario de inspección EPP. " +
        "Recarga la página e intenta nuevamente.",
    );
  }
});

function inicializarFecha() {
  if (!fecha) {
    return;
  }

  asignarFechaHoy(fecha);

  fecha.addEventListener("click", () => {
    abrirSelectorFecha(fecha);
  });
}

/**
 * Construye el objeto principal de la inspección EPP.
 *
 * @param {string|null} [inspeccionId=null] Identificador de la inspección.
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
 * Construye el contenido multipart de la inspección EPP.
 *
 * @param {string|null} [inspeccionId=null] Identificador de la inspección.
 * @returns {FormData} Contenido multipart.
 */
function construirFormDataEpp(inspeccionId = null) {
  return construirContenidoFormDataEpp({
    inspeccion: construirInspeccionEpp(inspeccionId),

    evidencias: trabajadoresManager.obtenerEvidencias(),
  });
}

/**
 * Envía la inspección EPP y sus evidencias.
 *
 * @returns {Promise<Object>} Respuesta procesada del backend.
 * @throws {Error} Cuando no puede completarse el envío.
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
