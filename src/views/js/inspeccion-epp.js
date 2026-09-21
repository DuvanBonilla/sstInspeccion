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
import { inicializarFechaEpp } from "./epp/controllers/inicializacionFechaEpp.controller.js";
import { crearInicializacionInspeccionEppController } from "./epp/controllers/inicializacionInspeccionEpp.controller.js";
import { generarInspeccionId } from "./epp/inspeccionEpp.id.js";
import { crearRegistroInspeccionEppService } from "./epp/services/registroInspeccionEpp.service.js";
import { crearContactosAprobacionController } from "./shared/controllers/contactosAprobacion.controller.js";

const TOTAL_PASOS = 3;

const fecha = document.getElementById("fecha");

const contactosAprobacion = crearContactosAprobacionController({
  documento: document,
});
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
  await inicializacionInspeccionEpp.inicializar();
});

const registroInspeccionEpp = crearRegistroInspeccionEppService({
  generarInspeccionId,

  construirPayload: construirPayloadInspeccionEpp,
  construirContenidoFormData: construirContenidoFormDataEpp,
  enviarInspeccion: enviarInspeccionEppApi,

  obtenerValor,

  leerTrabajadores() {
    return trabajadoresManager.leer();
  },

  obtenerEvidencias() {
    return trabajadoresManager.obtenerEvidencias();
  },

  obtenerContactos() {
    return contactosAprobacion.obtenerContactos();
  },
});

const inicializacionInspeccionEpp =
  crearInicializacionInspeccionEppController({
    cargarCatalogoEpp,
    console,
    alert,

    inicializarFechaEpp,
    fecha,
    asignarFechaHoy,
    abrirSelectorFecha,

    validacionInformacionGeneral,
    contactosAprobacion,

    inicializarEnvioEpp,
    documento: document,
    ventana: window,
    enviarInspeccionEpp,

    navegacion,
    salidaInspeccion,
    trabajadoresManager,

    obtenerValor,
  });
/**
 * Envía la inspección EPP y sus evidencias.
 *
 * @returns {Promise<Object>} Respuesta procesada del backend.
 * @throws {Error} Cuando no puede completarse el envío.
 */
async function enviarInspeccionEpp() {
  try {
    return await registroInspeccionEpp.enviar();
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
