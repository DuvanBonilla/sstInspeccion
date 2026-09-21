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
    inicializarFechaEpp({
      fecha,
      asignarFechaHoy,
      abrirSelectorFecha,
    });

    validacionInformacionGeneral.inicializar();

    contactosAprobacion.inicializar();

    inicializarEnvioEpp({
      documento: document,

      ventana: window,

      enviarInspeccionEpp,

      validarContactos: contactosAprobacion.validar,

      prepararAccionesAprobacion(datos) {
        contactosAprobacion.configurarAcciones({
          ...datos,
          tipoInspeccion: "EPP",
          sede: obtenerValor("sedeOperacion"),
          area: obtenerValor("areaTrabajo"),
        });
      },
    });

    navegacion.inicializar();

    salidaInspeccion.inicializar();

    trabajadoresManager.init();

    navegacion.actualizarPaso();
  } catch (error) {
    console.error("[EPP] Error inicializando formulario:", error);

    alert(
      "No fue posible inicializar el formulario de inspección EPP. " +
        "Recarga la página e intenta nuevamente.",
    );
  }
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
