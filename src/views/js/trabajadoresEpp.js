import { optimizarImagen } from "./imageOptimizer.js";

import { consultarCatalogoEpp } from "./epp/catalogoEpp.api.js";

import { crearContenidoTrabajador } from "./epp/trabajadorEpp.template.js";

import {
  leerTrabajadoresEpp,
  obtenerEvidenciasTrabajadoresEpp,
} from "./epp/trabajadoresEpp.reader.js";

import {
  clasificarCatalogoEpp,
  prepararElementosPredeterminadosEpp,
} from "./epp/catalogoEpp.model.js";

import { filtrarCatalogoEpp } from "./epp/catalogoEpp.search.js";

import {
  formatearPesoArchivo,
  validarEvidenciaEpp,
} from "./epp/evidenciasEpp.js";

import { VALORES_CALIFICACION, requierePlanAccion } from "./epp/reglasEpp.js";

import {
  crearMensajeCatalogoSinResultados,
  crearOpcionesCatalogoEpp,
  crearPanelCatalogoEpp,
} from "./epp/catalogoEpp.templates.js";

import { validarTrabajadoresEpp } from "./epp/validators/trabajadoresEpp.validator.js";

import { crearFilaEpp } from "./epp/evaluacionEpp.templates.js";

import {
  filtrarElementosEpp as filtrarElementosCatalogoEpp,
  manejarAccionCatalogoEpp,
  registrarEventosCatalogoEpp,
} from "./epp/controllers/catalogoEppUi.controller.js";

import { manejarCambioCalificacionEpp as manejarCambioEvaluacionEpp } from "./epp/controllers/evaluacionEppUi.controller.js";

import { manejarCambioEvidencia as manejarCambioEvidenciaTrabajador } from "./epp/controllers/evidenciasTrabajadorEpp.controller.js";

import {
  abrirTrabajador as abrirTarjetaTrabajador,
  actualizarNombreResumen as actualizarResumenTrabajador,
  actualizarNumeracion as numerarTrabajadores,
  crearTrabajador as crearTarjetaTrabajador,
  manejarAccionTrabajador,
  manejarEntradaTrabajador,
} from "./epp/controllers/trabajadoresEppUi.controller.js";

import {
  mostrarEstadoValidacion,
  presentarResultadoValidacion,
} from "./epp/controllers/validacionTrabajadoresEppUi.controller.js";

let ELEMENTOS_EPP_PREDETERMINADOS = [];
let ELEMENTOS_EPP_OTROS = [];
let ELEMENTOS_EPP = [];

/**
 * Carga desde el backend el catálogo de elementos de protección personal.
 *
 * Clasifica los elementos obtenidos entre predeterminados y adicionales,
 * dejando disponible el catálogo completo para la construcción y edición
 * de las evaluaciones de cada trabajador.
 *
 * @async
 * @returns {Promise<void>}
 * @throws {Error} Si la solicitud falla o la respuesta no contiene un catálogo válido.
 */

export async function cargarCatalogoEpp() {
  const catalogo = clasificarCatalogoEpp(await consultarCatalogoEpp());

  ELEMENTOS_EPP_PREDETERMINADOS = catalogo.predeterminados;

  ELEMENTOS_EPP_OTROS = catalogo.otros;

  ELEMENTOS_EPP = catalogo.todos;

  console.log("[EPP] Catálogo cargado:", {
    total: ELEMENTOS_EPP.length,
    predeterminados: ELEMENTOS_EPP_PREDETERMINADOS.length,
    otros: ELEMENTOS_EPP_OTROS.length,
  });
}

function obtenerElementosPredeterminados() {
  return prepararElementosPredeterminadosEpp(ELEMENTOS_EPP_PREDETERMINADOS);
}

/**
 * Crea el administrador encargado de gestionar los trabajadores de una
 * inspección EPP.
 *
 * Mantiene el estado de los trabajadores y sus evidencias, registra los
 * eventos de la interfaz y proporciona las operaciones públicas necesarias
 * para generar, validar y obtener la información de la inspección.
 *
 * @param {Object} elementos - Elementos de la interfaz utilizados por el administrador.
 * @param {HTMLElement} elementos.container - Contenedor de las tarjetas de trabajadores.
 * @param {HTMLInputElement} elementos.cantidadInput - Campo con la cantidad de trabajadores.
 * @param {HTMLButtonElement} elementos.generarButton - Botón para generar trabajadores.
 * @param {HTMLElement} elementos.estadoElement - Elemento utilizado para mostrar mensajes.
 * @param {HTMLButtonElement} elementos.agregarButton - Botón para agregar un trabajador.
 * @param {HTMLElement} elementos.accionesElement - Contenedor de acciones del formulario.
 * @returns {Object} API para inicializar, generar, validar y leer los trabajadores y evidencias.
 */

export function createTrabajadoresEppManager({
  container,
  cantidadInput,
  generarButton,
  estadoElement,
  agregarButton,
  accionesElement,
}) {
  let cantidadActual = 0;

  let siguienteTrabajadorId = 1;

  const evidencias = new Map();

  /**
   * Inicializa los eventos del administrador de trabajadores EPP.
   *
   * Configura la generación y administración de trabajadores, el procesamiento
   * de evidencias, los cambios de calificación y la interacción con el catálogo
   * de elementos EPP.
   *
   * @returns {void}
   */

  function init() {
    generarButton?.addEventListener("click", generarDesdeInput);

    agregarButton?.addEventListener("click", agregarTrabajador);

    container?.addEventListener("input", manejarEntradaTrabajador);

    container?.addEventListener("change", manejarEntradaTrabajador);

    container?.addEventListener("change", (event) => {
      manejarCambioEvidenciaTrabajador(event, {
        container,
        evidencias,
        validarEvidenciaEpp,
        optimizarImagen,
        formatearPesoArchivo,
      });
    });

    container?.addEventListener("click", manejarAccionesTrabajador);

    container?.addEventListener("change", (event) => {
      manejarCambioEvaluacionEpp(event, {
        requierePlanAccion,

        obtenerFechaInspeccion() {
          return document.querySelector('[name="fecha"]')?.value || "";
        },
      });
    });

    registrarEventosCatalogoEpp({
      container,
      documento: document,

      filtrarElementosEpp(card, terminoBusqueda) {
        filtrarElementosCatalogoEpp(card, terminoBusqueda, {
          elementosEpp: ELEMENTOS_EPP,
          filtrarCatalogoEpp,
          crearMensajeCatalogoSinResultados,
          crearOpcionesCatalogoEpp,
        });
      },
    });
  }

  /**
   * Procesa la evidencia fotográfica seleccionada para un trabajador.
   *
   * Optimiza la imagen, almacena el archivo resultante asociado con el
   * identificador interno del trabajador y actualiza el estado visual de
   * la evidencia.
   *
   * Si el archivo se elimina o no puede procesarse, también elimina la
   * evidencia previamente almacenada para el trabajador.
   *
   * @async
   * @param {Event} event - Evento de cambio generado por el campo de evidencia.
   * @returns {Promise<void>}
   */

  function manejarAccionesTrabajador(event) {
    const accionCatalogoManejada = manejarAccionCatalogoEpp(event, {
      elementosEpp: ELEMENTOS_EPP,
      crearFilaEpp,
      valoresCalificacion: VALORES_CALIFICACION,
      mostrarEstado,
    });

    if (accionCatalogoManejada) {
      return;
    }

    manejarAccionTrabajador(event, {
      container,
      eliminarTrabajador,
    });
  }

  function generarDesdeInput() {
    const cantidad = Number.parseInt(cantidadInput?.value, 10);

    if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 100) {
      mostrarEstado("Ingrese una cantidad válida entre 1 y 100 trabajadores.");

      cantidadInput?.focus();

      return;
    }

    generar(cantidad);
  }

  /**
   * Genera una nueva colección de trabajadores para la inspección EPP.
   *
   * Elimina los trabajadores y evidencias existentes, reinicia los
   * identificadores internos y crea la cantidad de trabajadores indicada.
   *
   * @param {number} cantidad - Cantidad de trabajadores que deben generarse.
   * @returns {void}
   */

  function generar(cantidad) {
    // Limpiar trabajadores de una generación anterior
    container.innerHTML = "";

    // Limpiar evidencias anteriores
    evidencias.clear();

    // Reiniciar cantidad
    cantidadActual = 0;

    // Reiniciar identificador interno
    siguienteTrabajadorId = 1;

    // -------------------------------------------------------
    // GENERAR TRABAJADORES
    // -------------------------------------------------------

    for (let indice = 0; indice < cantidad; indice++) {
      agregarTrabajador();
    }

    // -------------------------------------------------------
    // ACTUALIZAR NUMERACIÓN
    // -------------------------------------------------------

    cantidadActual = numerarTrabajadores(container);

    const primerTrabajador = container.querySelector(".trabajador-card");

    abrirTarjetaTrabajador(container, primerTrabajador);
    // -------------------------------------------------------
    // MOSTRAR ESTADO
    // -------------------------------------------------------

    mostrarEstado(
      `${cantidad} ${
        cantidad === 1 ? "trabajador generado" : "trabajadores generados"
      }.`,
    );

    // -------------------------------------------------------
    // MOSTRAR BOTÓN AGREGAR TRABAJADOR
    // -------------------------------------------------------

    accionesElement?.classList.remove("hidden");
  }

  function agregarTrabajador() {
    if (cantidadActual >= 100) {
      mostrarEstado("La inspección permite un máximo de 100 trabajadores.");

      return;
    }

    const trabajadorId = siguienteTrabajadorId++;

    const trabajador = crearTarjetaTrabajador({
      documento: document,
      trabajadorId,
      elementosPredeterminados: obtenerElementosPredeterminados(),
      crearFilaEpp,
      valoresCalificacion: VALORES_CALIFICACION,
      crearPanelCatalogoEpp,
      crearContenidoTrabajador,
    });

    container.appendChild(trabajador);

    cantidadActual = numerarTrabajadores(container);

    abrirTarjetaTrabajador(container, trabajador);
  }

  function eliminarTrabajador(tarjeta) {
    const tarjetas = container.querySelectorAll(".trabajador-card");

    if (tarjetas.length <= 1) {
      mostrarEstado("La inspección debe conservar al menos un trabajador.");

      return;
    }

    const trabajadorId = Number(tarjeta.dataset.trabajadorId);

    // Eliminar su evidencia optimizada.
    evidencias.delete(trabajadorId);

    // Eliminar únicamente esta tarjeta.
    tarjeta.remove();

    cantidadActual = numerarTrabajadores(container);

    mostrarEstado(
      `${cantidadActual} ${
        cantidadActual === 1
          ? "trabajador registrado"
          : "trabajadores registrados"
      }.`,
    );
  }

  function mostrarEstado(mensaje) {
    mostrarEstadoValidacion(estadoElement, mensaje);
  }

  /**
   * Valida todos los trabajadores registrados en la inspección EPP.
   *
   * Comprueba los datos personales, la unicidad y formato de los códigos,
   * la existencia y calificación de los elementos EPP, los planes de acción
   * requeridos, sus fechas límite y la evidencia fotográfica de cada trabajador.
   *
   * Cuando encuentra un dato inválido, abre la tarjeta correspondiente,
   * marca el campo afectado y detiene el proceso de validación.
   *
   * @returns {{valido: boolean, mensaje: string}} Resultado de la validación
   * y descripción del primer incumplimiento encontrado.
   */

  function validar() {
    const tarjetas = Array.from(container.querySelectorAll(".trabajador-card"));

    const trabajadores = leerTrabajadoresEpp(container);

    const inputFechaInspeccion =
      document.querySelector('[data-role="fecha-inspeccion"]') ||
      document.querySelector("#fecha-inspeccion") ||
      document.querySelector("#fechaInspeccion") ||
      document.querySelector('[name="fecha"]');

    const resultado = validarTrabajadoresEpp({
      trabajadores,
      evidencias,
      fechaInspeccion: inputFechaInspeccion?.value || "",
    });

    return presentarResultadoValidacion({
      resultado,
      tarjetas,
      container,
      cantidadInput,
      estadoElement,
      abrirTrabajador: abrirTarjetaTrabajador,
    });
  }

  /**
   * Obtiene la información estructurada de los trabajadores de la inspección.
   *
   * Lee desde la interfaz los datos de cada trabajador, sus elementos EPP,
   * las calificaciones de condición y uso, las observaciones y los planes
   * de acción asociados con cada elemento.
   *
   * @returns {Array<Object>} Lista de trabajadores con sus evaluaciones EPP.
   */

  function leer() {
    const trabajadores = leerTrabajadoresEpp(container);

    console.log("📋 Trabajadores EPP:", trabajadores);
    console.log(
      "📋 Trabajadores EPP JSON:",
      JSON.stringify(trabajadores, null, 2),
    );

    return trabajadores;
  }

  /**
   * Obtiene las evidencias fotográficas procesadas de los trabajadores.
   *
   * Relaciona cada archivo optimizado con el identificador del trabajador
   * y con su posición actual dentro del formulario, utilizada posteriormente
   * para construir los campos enviados al backend.
   *
   * @returns {Array<{
   *   trabajadorId: number,
   *   indice: number,
   *   archivo: File
   * }>} Evidencias disponibles para el envío de la inspección.
   */

  function obtenerEvidencias() {
    return obtenerEvidenciasTrabajadoresEpp(container, evidencias);
  }

  // =======================================================
  // API PÚBLICA
  // =======================================================

  return {
    init,

    generar,

    validar,

    leer,

    obtenerEvidencias,

    getCantidad() {
      return cantidadActual;
    },
  };
}
