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

    container?.addEventListener("input", limpiarErrorCampo);

    container?.addEventListener("change", limpiarErrorCampo);

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

  function limpiarErrorCampo(event) {
    const elemento = event.target;

    // =======================================================
    // CÓDIGO DEL TRABAJADOR
    // Solo números y máximo 6 dígitos
    // =======================================================

    if (elemento.matches('[data-role="codigo"]')) {
      elemento.value = elemento.value.replace(/\D/g, "").slice(0, 6);
    }

    // =======================================================
    // NOMBRE DEL TRABAJADOR
    // No permitir números
    // =======================================================

    if (elemento.matches('[data-role="nombre"]')) {
      elemento.value = elemento.value.replace(/[0-9]/g, "").slice(0, 100);
    }
    // =======================================================
    // LIMPIAR ERROR VISUAL
    // =======================================================

    if (elemento.matches("input, select, textarea")) {
      elemento.classList.remove("campo-error");
    }

    // =======================================================
    // ACTUALIZAR NOMBRE DEL ACORDEÓN
    // =======================================================

    if (elemento.matches('[data-role="nombre"]')) {
      actualizarNombreResumen(elemento);
    }
  }

  function actualizarNombreResumen(input) {
    const tarjeta = input.closest(".trabajador-card");

    if (!tarjeta) {
      return;
    }

    const resumen = tarjeta.querySelector('[data-role="nombreResumen"]');

    if (!resumen) {
      return;
    }

    const nombre = input.value.trim();

    resumen.textContent = nombre || "Sin diligenciar";
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

    // -------------------------------------------------------
    // ELIMINAR TRABAJADOR
    // -------------------------------------------------------

    const botonEliminar = event.target.closest(
      '[data-action="eliminar-trabajador"]',
    );

    if (botonEliminar) {
      event.stopPropagation();

      const tarjeta = botonEliminar.closest(".trabajador-card");

      if (!tarjeta) {
        return;
      }

      eliminarTrabajador(tarjeta);

      return;
    }

    // -------------------------------------------------------
    // ABRIR / MINIMIZAR TRABAJADOR
    // -------------------------------------------------------

    const header = event.target.closest('[data-action="toggle-trabajador"]');

    if (!header) {
      return;
    }

    const tarjeta = header.closest(".trabajador-card");

    if (!tarjeta) {
      return;
    }

    if (tarjeta.classList.contains("trabajador-collapsed")) {
      abrirTrabajador(tarjeta);

      return;
    }

    tarjeta.classList.add("trabajador-collapsed");

    const icono = tarjeta.querySelector('[data-role="toggleIcon"]');

    if (icono) {
      icono.textContent = "▶";
    }
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

    actualizarNumeracion();

    const primerTrabajador = container.querySelector(".trabajador-card");

    abrirTrabajador(primerTrabajador);
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

    const trabajador = crearTrabajador(trabajadorId);

    container.appendChild(trabajador);

    cantidadActual++;

    actualizarNumeracion();

    abrirTrabajador(trabajador);
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

    cantidadActual--;

    actualizarNumeracion();

    mostrarEstado(
      `${cantidadActual} ${
        cantidadActual === 1
          ? "trabajador registrado"
          : "trabajadores registrados"
      }.`,
    );
  }

  function actualizarNumeracion() {
    const tarjetas = container.querySelectorAll(".trabajador-card");

    tarjetas.forEach((tarjeta, indice) => {
      const numero = tarjeta.querySelector('[data-role="numeroTrabajador"]');

      if (numero) {
        numero.textContent = `Trabajador ${indice + 1}`;
      }
    });

    cantidadActual = tarjetas.length;
  }

  function abrirTrabajador(tarjeta) {
    if (!tarjeta) {
      return;
    }

    const tarjetas = container.querySelectorAll(".trabajador-card");

    tarjetas.forEach((item) => {
      const icono = item.querySelector('[data-role="toggleIcon"]');

      if (item === tarjeta) {
        item.classList.remove("trabajador-collapsed");

        if (icono) {
          icono.textContent = "▼";
        }
      } else {
        item.classList.add("trabajador-collapsed");

        if (icono) {
          icono.textContent = "▶";
        }
      }
    });
  }

  function crearTrabajador(trabajadorId) {
    const card = document.createElement("article");

    card.className = "trabajador-card";
    card.dataset.trabajadorId = trabajadorId;

    const filasEppHtml = obtenerElementosPredeterminados()
      .map((elemento, elementoIndex) =>
        crearFilaEpp(elemento, elementoIndex, VALORES_CALIFICACION),
      )
      .join("");

    const panelCatalogoHtml = crearPanelCatalogoEpp();

    card.innerHTML = crearContenidoTrabajador({
      filasEppHtml,
      panelCatalogoHtml,
    });

    card.classList.add("trabajador-collapsed");

    return card;
  }

  function obtenerElementosActuales(card) {
    return Array.from(
      card.querySelectorAll(".epp-table tbody tr[data-elemento]"),
    ).map((fila) => fila.dataset.elemento);
  }

  function mostrarEstado(mensaje) {
    if (!estadoElement) {
      return;
    }

    estadoElement.textContent = mensaje;

    estadoElement.classList.remove("hidden");
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

    if (resultado.valido) {
      ocultarEstado();

      return {
        valido: true,
        mensaje: "",
      };
    }

    if (resultado.campo === "cantidad") {
      mostrarEstado("Debe generar al menos un trabajador antes de continuar.");

      cantidadInput?.focus();

      return {
        valido: false,
        mensaje: resultado.mensaje,
      };
    }

    const tarjeta = tarjetas[resultado.trabajadorIndex];

    if (!tarjeta) {
      mostrarEstado(resultado.mensaje);

      return {
        valido: false,
        mensaje: resultado.mensaje,
      };
    }

    abrirTrabajador(tarjeta);

    if (resultado.campo === "elementos") {
      mostrarEstado(resultado.mensaje);

      return {
        valido: false,
        mensaje: resultado.mensaje,
      };
    }

    const selectoresTrabajador = {
      nombre: '[data-role="nombre"]',
      codigo: '[data-role="codigo"]',
      cargo: '[data-role="cargo"]',
      evidencia: '[data-role="evidencia"]',
    };

    let elemento = null;

    if (selectoresTrabajador[resultado.campo]) {
      elemento = tarjeta.querySelector(selectoresTrabajador[resultado.campo]);
    } else {
      const filasEpp = tarjeta.querySelectorAll("tr[data-elemento]");

      const fila = filasEpp[resultado.elementoIndex];

      if (resultado.campo === "condicion") {
        elemento = fila?.querySelector('[data-role="condicion"]');
      }

      if (resultado.campo === "uso") {
        elemento = fila?.querySelector('[data-role="uso"]');
      }

      const filaPlan = fila?.nextElementSibling;

      if (resultado.campo === "planAccion") {
        elemento = filaPlan?.querySelector('[data-role="epp-plan-accion"]');
      }

      if (resultado.campo === "fechaPlanAccion") {
        elemento = filaPlan?.querySelector('[data-role="epp-fecha-plan"]');
      }
    }

    return marcarError(elemento, resultado.mensaje);
  }

  function marcarError(elemento, mensaje) {
    mostrarEstado(mensaje);

    if (elemento) {
      elemento.classList.add("campo-error");

      elemento.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      setTimeout(() => {
        elemento.focus();
      }, 300);
    }

    return {
      valido: false,
      mensaje,
    };
  }

  function ocultarEstado() {
    if (!estadoElement) {
      return;
    }

    estadoElement.textContent = "";

    estadoElement.classList.add("hidden");
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
