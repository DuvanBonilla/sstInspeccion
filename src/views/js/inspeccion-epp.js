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


let pasoActual = 1;

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

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await cargarCatalogoEpp();

    inicializarFecha();

    inicializarNavegacion();

    inicializarSalida();

    trabajadoresManager.init();

    inicializarEnvioEpp();

    actualizarPaso();

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

function inicializarNavegacion() {
  document.querySelectorAll("[data-step-target]").forEach((boton) => {
    boton.addEventListener("click", () => {
      const destino = Number(boton.dataset.stepTarget);

      if (!destino) {
        return;
      }

      navegarAPaso(destino);
    });
  });
}

/**
 * Controla la navegación entre las etapas del formulario de inspección EPP.
 *
 * Antes de avanzar, valida la información correspondiente al paso actual.
 * Cuando se accede al resumen, actualiza la información general, el detalle
 * de los trabajadores y las verificaciones previas al envío.
 *
 * @param {number} destino - Número del paso al que se desea navegar.
 * @returns {void}
 */

function navegarAPaso(destino) {
  if (destino < 1 || destino > TOTAL_PASOS) {
    return;
  }

  if (pasoActual === 1 && destino > pasoActual) {
    const formularioValido = validarInformacionGeneral();

    if (!formularioValido) {
      return;
    }
  }


  if (pasoActual === 2 && destino > pasoActual) {
    const resultado = trabajadoresManager.validar();

    if (!resultado.valido) {
      return;
    }
  }

  if (destino === 3) {
    construirResumenGeneral();

    construirResumenTrabajadores();

    verificarInspeccionEpp();

    verificarFormDataEpp();
  }

  pasoActual = destino;

  actualizarPaso();
}

/**
 * Actualiza visualmente el paso activo del formulario.
 *
 * Muestra el panel correspondiente, actualiza los indicadores de progreso
 * y desplaza la página hacia la parte superior.
 *
 * @returns {void}
 */

function actualizarPaso() {
  document.querySelectorAll("[data-step-panel]").forEach((panel) => {
    const numeroPaso = Number(panel.dataset.stepPanel);

    panel.classList.toggle("hidden", numeroPaso !== pasoActual);
  });

  document.querySelectorAll("[data-step-indicator]").forEach((indicador) => {
    const numeroPaso = Number(indicador.dataset.stepIndicator);

    indicador.classList.toggle("active", numeroPaso === pasoActual);

    indicador.classList.toggle("completed", numeroPaso < pasoActual);
  });

  window.scrollTo({
    top: 0,
    behavior: "smooth",
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

camposInformacionGeneral.forEach((id) => {
  const campo = document.getElementById(id);

  if (!campo) {
    return;
  }

  const limpiarError = () => {
    if (campo.value.trim()) {
      campo.classList.remove("campo-error");
    }
  };

  campo.addEventListener("input", limpiarError);

  campo.addEventListener("change", limpiarError);
});


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
    const novedades = trabajador.elementos.filter(
      (elemento) =>
        elemento.condicion === "M" ||
        elemento.condicion === "R" ||
        elemento.uso === "M" ||
        elemento.uso === "R",
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
  const trabajadores = trabajadoresManager.leer();

  const informacionGeneral = {
    fecha: obtenerValor("fecha"),

    sede: obtenerValor("sedeOperacion"),

    area: obtenerValor("areaTrabajo"),

    jefeArea: obtenerValor("jefeResponsable"),

    cargoJefe: obtenerValor("cargoJefe"),

    responsableInspeccion: obtenerValor("responsableInspeccion"),

    cargoResponsable: obtenerValor("cargoResponsable"),
  };

  return {
    tipoInspeccion: "EPP",

    inspeccionId: inspeccionId,

    informacionGeneral,

    trabajadores,
  };
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
  const inspeccion = construirInspeccionEpp(inspeccionId);

  const evidencias = trabajadoresManager.obtenerEvidencias();

  const formData = new FormData();

  // -------------------------------------------------------
  // PAYLOAD JSON
  // -------------------------------------------------------

  formData.append("payload", JSON.stringify(inspeccion));

  // -------------------------------------------------------
  // EVIDENCIAS DE TRABAJADORES
  // -------------------------------------------------------

  evidencias.forEach((evidencia) => {
    /*
      El backend trabaja con la posición actual del trabajador:

      evidencia_trabajador_0
      evidencia_trabajador_1
      evidencia_trabajador_2
      ...
    */

    const indice = evidencia.indice;

    const archivo = evidencia.archivo;

    if (!archivo) {
      return;
    }

    const nombreCampo = `evidencia_trabajador_${indice}`;

    formData.append(nombreCampo, archivo, archivo.name);

    // Fecha original/modificación como respaldo del EXIF.
    formData.append(
      `${nombreCampo}_lastmod`,
      String(archivo.lastModified || ""),
    );
  });

  return formData;
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
    // Generar el ID una sola vez para este envío
    const inspeccionId = generarInspeccionId();

    // Construir todo el FormData utilizando el mismo ID
    const formData = construirFormDataEpp(inspeccionId);

    const respuesta = await fetch("/enviar-inspeccion-epp", {
      method: "POST",
      body: formData,
    });

    const data = await respuesta.json();

    if (!respuesta.ok || !data.ok) {
      throw new Error(
        data.mensaje || "No fue posible registrar la inspección EPP.",
      );
    }

    return data;
  } catch (error) {
    console.error("❌ Error enviando inspección EPP:", error);

    throw error;
  }
}

/**
 * Construye los enlaces de aprobación de una inspección EPP.
 *
 * Utiliza el origen actual de la aplicación y los tokens entregados por el
 * backend para generar los enlaces del jefe responsable y de COPASST.
 *
 * @param {Object|null} tokens - Tokens de aprobación generados por el backend.
 * @param {string} [tokens.jefe] - Token asignado al jefe responsable.
 * @param {string} [tokens.copasst] - Token asignado a COPASST.
 * @returns {{jefe: string|null, copasst: string|null}|null}
 * Enlaces de aprobación disponibles, o `null` si no se reciben tokens.
 */

function construirLinksAprobacionEpp(tokens) {
  if (!tokens) {
    return null;
  }

  const baseUrl = window.location.origin;

  return {
    jefe: tokens.jefe ? `${baseUrl}/aprobar/${tokens.jefe}` : null,

    copasst: tokens.copasst ? `${baseUrl}/aprobar/${tokens.copasst}` : null,
  };
}

/**
 * Inicializa el proceso de envío de la inspección EPP.
 *
 * Registra el evento del botón de envío, controla su estado durante la
 * solicitud y muestra los modales correspondientes al resultado de la
 * operación. Cuando el registro finaliza correctamente, construye los
 * enlaces de aprobación recibidos desde el backend.
 *
 * @returns {void}
 */

function inicializarEnvioEpp() {
  const btnEnviar = document.getElementById("btn-enviar-inspeccion-epp");

  if (!btnEnviar) {
    return;
  }

  btnEnviar.addEventListener("click", async () => {
    try {
      // ---------------------------------------------------
      // BLOQUEAR BOTÓN
      // ---------------------------------------------------

      btnEnviar.disabled = true;
      btnEnviar.textContent = "Enviando...";

      // ---------------------------------------------------
      // MOSTRAR MODAL DE CARGA
      // ---------------------------------------------------

      if (typeof window.mostrarModal === "function") {
        window.mostrarModal("cargando");
      }

      // ---------------------------------------------------
      // ENVIAR INSPECCIÓN
      // ---------------------------------------------------

      const resultado = await enviarInspeccionEpp();

      // ---------------------------------------------------
      // CONSTRUIR LINKS DE APROBACIÓN
      // ---------------------------------------------------

      const links = construirLinksAprobacionEpp(resultado.tokens);

      // ---------------------------------------------------
      // MOSTRAR MODAL DE ÉXITO
      // ---------------------------------------------------

      if (typeof window.mostrarModal === "function") {
        window.mostrarModal(
          "exito",
          resultado.inspeccionId,
          resultado.numInspeccion,
          links,
          "crear",
        );
      }

      btnEnviar.textContent = "Inspección enviada";
    } catch (error) {
      console.error("❌ No fue posible completar el envío EPP:", error);

      // ---------------------------------------------------
      // MODAL ERROR
      // ---------------------------------------------------

      if (typeof window.mostrarModal === "function") {
        window.mostrarModal("error");
      }

      btnEnviar.disabled = false;
      btnEnviar.textContent = "Enviar inspección";
    }
  });
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
