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
  actualizarSeleccionCatalogoEpp,
  alternarCatalogoEpp,
  limpiarSeleccionCatalogoEpp,
  obtenerSeleccionCatalogoEpp,
  registrarEventosCatalogoEpp,
  sincronizarCatalogoEpp,
} from "./epp/controllers/catalogoEppUi.controller.js";

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

function filtrarElementosEpp(card, terminoBusqueda = "") {
  const contenedorResultados = card.querySelector(".epp-catalogo-resultados");

  const buscador = card.querySelector(".epp-catalogo-buscador");

  if (!contenedorResultados) {
    return;
  }

  const idsActuales = new Set(
    Array.from(
      card.querySelectorAll(
        ".epp-table tbody tr.epp-fila[data-elemento-epp-id]",
      ),
    )
      .map((fila) => fila.dataset.elementoEppId)
      .filter(Boolean),
  );

  const seleccionados = obtenerSeleccionCatalogoEpp(card);

  const resultados = filtrarCatalogoEpp({
    elementos: ELEMENTOS_EPP,
    idsActuales,
    terminoBusqueda,
  });

  // =====================================================
  // SIN RESULTADOS
  // =====================================================

  if (resultados.length === 0) {
    contenedorResultados.innerHTML = crearMensajeCatalogoSinResultados();

    contenedorResultados.hidden = false;

    buscador?.setAttribute("aria-expanded", "true");

    return;
  }

  // =====================================================
  // RENDERIZAR RESULTADOS
  // =====================================================

  contenedorResultados.innerHTML = crearOpcionesCatalogoEpp(
    resultados,
    seleccionados,
  );

  contenedorResultados.hidden = false;

  buscador?.setAttribute("aria-expanded", "true");
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

    container?.addEventListener("change", manejarCambioEvidencia);

    container?.addEventListener("click", manejarAccionesTrabajador);

    container?.addEventListener("change", manejarCambioCalificacionEpp);

    registrarEventosCatalogoEpp({
      container,
      documento: document,
      filtrarElementosEpp,
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

  async function manejarCambioEvidencia(event) {
    const input = event.target;

    if (!input.matches('[data-role="evidencia"]')) {
      return;
    }

    const tarjeta = input.closest(".trabajador-card");

    if (!tarjeta) {
      return;
    }

    const trabajadorId = Number(tarjeta.dataset.trabajadorId);

    const estado = tarjeta.querySelector('[data-role="evidenciaEstado"]');

    const archivo = input.files?.[0];

    // Limpiar la apariencia de errores anteriores
    estado?.classList.remove("evidencia-estado--error");

    // Si no existe un archivo seleccionado
    if (!archivo) {
      evidencias.delete(trabajadorId);

      if (estado) {
        estado.textContent = "Sin evidencia";
      }

      return;
    }

    const validacion = validarEvidenciaEpp(archivo);

    if (!validacion.valido) {
      evidencias.delete(trabajadorId);
      input.value = "";

      if (estado) {
        estado.textContent = validacion.mensaje;
        estado.classList.add("evidencia-estado--error");
      }

      return;
    }
    // Bloquear el campo mientras se procesa la imagen
    input.disabled = true;

    if (estado) {
      estado.textContent = "Optimizando imagen...";
    }

    try {
      // Optimizar la imagen seleccionada
      const archivoOptimizado = await optimizarImagen(archivo);

      // Guardar la evidencia optimizada
      evidencias.set(trabajadorId, archivoOptimizado);

      if (estado) {
        estado.classList.remove("evidencia-estado--error");

        estado.textContent = `Evidencia lista · ${formatearPesoArchivo(
          archivoOptimizado.size,
        )}`;
      }

      const numeroVisual =
        Array.from(container.querySelectorAll(".trabajador-card")).indexOf(
          tarjeta,
        ) + 1;

      console.log(`Evidencia trabajador ${numeroVisual}:`, {
        trabajadorId,
        original: archivo.size,
        optimizado: archivoOptimizado.size,
        archivo: archivoOptimizado,
      });
    } catch (error) {
      console.error("Error procesando evidencia EPP:", error);

      evidencias.delete(trabajadorId);
      input.value = "";

      if (estado) {
        estado.textContent =
          "⚠ No fue posible procesar la imagen seleccionada.";

        estado.classList.add("evidencia-estado--error");
      }
    } finally {
      input.disabled = false;
    }
  }

  function manejarAccionesTrabajador(event) {
    // -------------------------------------------------------
    // ABRIR / CERRAR CATÁLOGO EPP
    // -------------------------------------------------------

    const botonCatalogo = event.target.closest(".btn-toggle-catalogo-epp");

    if (botonCatalogo) {
      event.stopPropagation();

      const tarjeta = botonCatalogo.closest(".trabajador-card");

      if (!tarjeta) {
        return;
      }

      alternarCatalogoEpp(tarjeta, botonCatalogo);

      return;
    }

    // -------------------------------------------------------
    // AGREGAR EPP DESDE EL BUSCADOR
    // -------------------------------------------------------

    const botonAgregarSeleccionados = event.target.closest(
      ".epp-catalogo-agregar-seleccionados",
    );

    if (botonAgregarSeleccionados) {
      event.stopPropagation();

      const tarjeta = botonAgregarSeleccionados.closest(".trabajador-card");

      if (!tarjeta) {
        return;
      }

      agregarElementosSeleccionados(tarjeta);

      return;
    }
    // -------------------------------------------------------
    // SELECCIONAR / DESELECCIONAR EPP DEL CATÁLOGO
    // -------------------------------------------------------

    const opcionEpp = event.target.closest(".epp-combobox-opcion");

    if (opcionEpp) {
      event.stopPropagation();

      const tarjeta = opcionEpp.closest(".trabajador-card");

      if (!tarjeta) {
        return;
      }

      const checkbox = opcionEpp.querySelector(".epp-catalogo-checkbox");

      if (!checkbox) {
        return;
      }

      // Esperar a que el checkbox termine de cambiar su estado
      // antes de actualizar el contador.
      setTimeout(() => {
        const seleccionados = obtenerSeleccionCatalogoEpp(tarjeta);

        const elementoEppId = String(checkbox.dataset.elementoEppId);

        if (checkbox.checked) {
          seleccionados.add(elementoEppId);
        } else {
          seleccionados.delete(elementoEppId);
        }

        actualizarSeleccionCatalogoEpp(tarjeta);
      }, 0);

      return;
    }

    // -------------------------------------------------------
    // ELIMINAR ELEMENTO EPP
    // -------------------------------------------------------

    const botonEliminarEpp = event.target.closest(
      '[data-action="eliminar-epp"]',
    );

    if (botonEliminarEpp) {
      event.stopPropagation();

      const tarjeta = botonEliminarEpp.closest(".trabajador-card");

      const fila = botonEliminarEpp.closest("tr[data-elemento]");

      if (!tarjeta || !fila) {
        return;
      }

      eliminarElementoEpp(tarjeta, fila);

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

  function manejarCambioCalificacionEpp(event) {
    const select = event.target.closest(".epp-calificacion");

    if (!select) {
      return;
    }

    const fila = select.closest("tr[data-elemento]");

    if (!fila) {
      return;
    }

    actualizarPlanElemento(fila);
  }

  /**
   * Actualiza la sección del plan de acción asociada con un elemento EPP.
   *
   * Evalúa las calificaciones de condición y uso para determinar si debe
   * mostrarse el plan de acción. También establece como fecha mínima la fecha
   * de la inspección y limpia el plan cuando deja de ser obligatorio.
   *
   * @param {HTMLTableRowElement} fila - Fila que contiene la evaluación del elemento EPP.
   * @returns {void}
   */

  function actualizarPlanElemento(fila) {
    if (!fila) {
      return;
    }

    const condicion = fila.querySelector('[data-role="condicion"]')?.value;

    const uso = fila.querySelector('[data-role="uso"]')?.value;

    const filaPlan = fila.nextElementSibling;

    if (!filaPlan || !filaPlan.classList.contains("epp-plan-row")) {
      return;
    }

    const plan = filaPlan.querySelector('[data-role="epp-plan-accion"]');

    const fecha = filaPlan.querySelector('[data-role="epp-fecha-plan"]');

    const fechaInspeccion =
      document.querySelector('[name="fecha"]')?.value || "";

    // -------------------------------------------------------
    // ESTABLECER FECHA MÍNIMA DEL PLAN
    // -------------------------------------------------------

    if (fecha) {
      if (fechaInspeccion) {
        fecha.min = fechaInspeccion;
      } else {
        fecha.removeAttribute("min");
      }
    }

    // -------------------------------------------------------
    // DETERMINAR SI REQUIERE PLAN
    // -------------------------------------------------------

    const mostrar = requierePlanAccion(condicion, uso);

    filaPlan.hidden = !mostrar;

    // -------------------------------------------------------
    // SI YA NO REQUIERE PLAN, LIMPIAR LOS DATOS
    // -------------------------------------------------------

    if (!mostrar) {
      if (plan) {
        plan.value = "";
        plan.classList.remove("campo-error");
      }

      if (fecha) {
        fecha.value = "";
        fecha.classList.remove("campo-error");
      }
    }
  }

  function obtenerElementosActuales(card) {
    return Array.from(
      card.querySelectorAll(".epp-table tbody tr[data-elemento]"),
    ).map((fila) => fila.dataset.elemento);
  }

  /**
   * Agrega a un trabajador los elementos seleccionados desde el catálogo EPP.
   *
   * Evita agregar elementos duplicados, genera las filas de evaluación
   * correspondientes y actualiza el estado del catálogo después de completar
   * la operación.
   *
   * @param {HTMLElement} card - Tarjeta del trabajador que recibirá los elementos.
   * @returns {void}
   */

  function agregarElementosSeleccionados(card) {
    if (!card) {
      return;
    }

    const seleccionados = obtenerSeleccionCatalogoEpp(card);

    if (seleccionados.size === 0) {
      return;
    }

    const tbody = card.querySelector(".epp-table tbody");

    if (!tbody) {
      return;
    }

    // =====================================================
    // IDs DE ELEMENTOS EPP YA AGREGADOS
    // =====================================================

    const idsActuales = new Set(
      Array.from(tbody.querySelectorAll("tr[data-elemento-epp-id]"))
        .map((fila) => fila.dataset.elementoEppId)
        .filter(Boolean),
    );

    // =====================================================
    // AGREGAR ELEMENTOS SELECCIONADOS
    // =====================================================

    seleccionados.forEach((elementoEppId) => {
      if (idsActuales.has(elementoEppId)) {
        return;
      }

      const elementoCatalogo = ELEMENTOS_EPP.find(
        (elemento) => String(elemento.id) === String(elementoEppId),
      );

      if (!elementoCatalogo) {
        console.warn(
          "[EPP] Elemento seleccionado no encontrado en catálogo:",
          elementoEppId,
        );

        return;
      }

      const nuevoIndex = tbody.querySelectorAll("tr[data-elemento]").length;

      tbody.insertAdjacentHTML(
        "beforeend",
        crearFilaEpp(
          {
            elementoEppId: elementoCatalogo.id,
            elemento: elementoCatalogo.nombre,
          },
          nuevoIndex,
          VALORES_CALIFICACION,
        ),
      );

      idsActuales.add(String(elementoEppId));
    });

    // =====================================================
    // LIMPIAR SELECCIÓN TEMPORAL
    // =====================================================

    limpiarSeleccionCatalogoEpp(card);

    // =====================================================
    // ACTUALIZAR ESTADO DEL CATÁLOGO
    // =====================================================

    sincronizarCatalogoEpp(card);

    // =====================================================
    // CERRAR PANEL
    // =====================================================

    const panel = card.querySelector(".epp-catalogo-panel");

    const boton = card.querySelector(".btn-toggle-catalogo-epp");

    if (panel) {
      panel.hidden = true;
    }

    if (boton) {
      boton.textContent = "+ Agregar elementos EPP";
    }
  }

  function eliminarElementoEpp(card, fila) {
    if (!card || !fila) {
      return;
    }

    const tbody = card.querySelector(".epp-table tbody");

    if (!tbody) {
      return;
    }

    const filas = tbody.querySelectorAll("tr[data-elemento]");

    if (filas.length <= 1) {
      mostrarEstado("Cada trabajador debe tener al menos un elemento EPP.");

      return;
    }

    // -------------------------------------------------------
    // BUSCAR FILA DEL PLAN ASOCIADA AL ELEMENTO
    // -------------------------------------------------------

    const filaPlan = fila.nextElementSibling;

    const tieneFilaPlan = filaPlan?.classList.contains("epp-plan-row");

    // -------------------------------------------------------
    // ELIMINAR PLAN DEL ELEMENTO
    // -------------------------------------------------------

    if (tieneFilaPlan) {
      filaPlan.remove();
    }

    // -------------------------------------------------------
    // ELIMINAR ELEMENTO EPP
    // -------------------------------------------------------

    fila.remove();

    // -------------------------------------------------------
    // ACTUALIZAR CATÁLOGO
    // -------------------------------------------------------

    sincronizarCatalogoEpp(card);
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
