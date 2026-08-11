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

import { createTrabajadoresEppManager } from "./trabajadoresEpp.js";

// =========================================================
// ESTADO DEL FORMULARIO
// =========================================================

let pasoActual = 1;

const TOTAL_PASOS = 3;

// =========================================================
// REFERENCIAS DEL DOM
// =========================================================

const fecha = document.getElementById("fecha");

const btnSalir = document.getElementById("btn-salir");

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

// =========================================================
// CAMPOS DE INFORMACIÓN GENERAL
// =========================================================

const camposInformacionGeneral = [
  "fecha",
  "sedeOperacion",
  "areaTrabajo",
  "jefeResponsable",
  "cargoJefe",
  "responsableInspeccion",
  "cargoResponsable",
];

// =========================================================
// INICIALIZACIÓN
// =========================================================

document.addEventListener("DOMContentLoaded", () => {
  inicializarFecha();

  inicializarNavegacion();

  inicializarSalida();

  trabajadoresManager.init();

  actualizarPaso();
});

// =========================================================
// FECHA
// =========================================================

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

// =========================================================
// NAVEGACIÓN
// =========================================================

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

function navegarAPaso(destino) {
  if (destino < 1 || destino > TOTAL_PASOS) {
    return;
  }

  // -------------------------------------------------------
  // Si avanzamos desde Información General,
  // primero debemos validarla.
  // -------------------------------------------------------

  if (pasoActual === 1 && destino > pasoActual) {
    const formularioValido = validarInformacionGeneral();

    if (!formularioValido) {
      return;
    }
  }

  // -------------------------------------------------------
  // Si avanzamos desde Inspección EPP,
  // validar todos los trabajadores.
  // -------------------------------------------------------

  if (pasoActual === 2 && destino > pasoActual) {
    const resultado = trabajadoresManager.validar();

    if (!resultado.valido) {
      return;
    }
  }

  // -------------------------------------------------------
  // Al llegar al resumen construimos la información.
  // -------------------------------------------------------

  if (destino === 3) {
    construirResumenGeneral();

    construirResumenGeneral();

    construirResumenTrabajadores();
  }

  pasoActual = destino;

  actualizarPaso();
}

// =========================================================
// ACTUALIZAR PASO
// =========================================================

function actualizarPaso() {
  // -------------------------------------------------------
  // Paneles
  // -------------------------------------------------------

  document.querySelectorAll("[data-step-panel]").forEach((panel) => {
    const numeroPaso = Number(panel.dataset.stepPanel);

    panel.classList.toggle("hidden", numeroPaso !== pasoActual);
  });

  // -------------------------------------------------------
  // Indicadores superiores
  // -------------------------------------------------------

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

// =========================================================
// VALIDACIÓN INFORMACIÓN GENERAL
// =========================================================

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

// =========================================================
// ELIMINAR ERROR AL CORREGIR CAMPO
// =========================================================

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

// =========================================================
// RESUMEN INFORMACIÓN GENERAL
// =========================================================

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

// =========================================================
// RESUMEN TRABAJADORES EPP
// =========================================================

function construirResumenTrabajadores() {

  const trabajadores =
    trabajadoresManager.leer();

  const evidencias =
    trabajadoresManager.obtenerEvidencias();


  // -------------------------------------------------------
  // CONTENEDOR
  // -------------------------------------------------------

  const container =
    document.getElementById(
      "resumen-trabajadores"
    );

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


  trabajadores.forEach(
    (trabajador) => {

      const novedades =
        trabajador.elementos.filter(
          (elemento) =>
            elemento.condicion === "M" ||
            elemento.condicion === "R" ||
            elemento.uso === "M" ||
            elemento.uso === "R"
        );


      if (novedades.length > 0) {
        trabajadoresConNovedades++;
      }


      totalNovedades +=
        novedades.length;


      // ---------------------------------------------------
      // BUSCAR EVIDENCIA
      // ---------------------------------------------------

      const tieneEvidencia =
        evidencias.some(
          (evidencia) =>
            evidencia.trabajadorId ===
            trabajador.trabajadorId
        );


      // ---------------------------------------------------
      // CREAR TARJETA RESUMEN
      // ---------------------------------------------------

      const card =
        document.createElement(
          "div"
        );

      card.className =
        "resumen-trabajador-card";


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
              ${
                trabajador.planAccion
                  ? "Registrado"
                  : "No requerido"
              }
            </strong>
          </div>


          <div>
            <span class="resumen-label">
              Evidencia
            </span>

            <strong>
              ${
                tieneEvidencia
                  ? "Registrada"
                  : "Sin evidencia"
              }
            </strong>
          </div>

        </div>

      `;


      container.appendChild(
        card
      );

    }
  );


  // -------------------------------------------------------
  // TOTALES GENERALES
  // -------------------------------------------------------

  asignarTextoResumen(
    "resumen-total-trabajadores",
    trabajadores.length
  );

  asignarTextoResumen(
    "resumen-trabajadores-novedad",
    trabajadoresConNovedades
  );

  asignarTextoResumen(
    "resumen-trabajadores-sin-novedad",
    trabajadores.length -
      trabajadoresConNovedades
  );

  asignarTextoResumen(
    "resumen-total-novedades",
    totalNovedades
  );

}

// =========================================================
// ESCAPAR TEXTO PARA HTML
// =========================================================

function escaparHtml(valor) {

  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

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

// =========================================================
// SALIR DEL FORMULARIO
// =========================================================

function inicializarSalida() {
  btnSalir?.addEventListener("click", abrirModalSalida);

  btnCancelarNo?.addEventListener("click", cerrarModalSalida);

  btnCancelarSi?.addEventListener("click", () => {
    window.location.href = "/";
  });

  cancelarModal?.addEventListener("click", (event) => {
    if (event.target === cancelarModal) {
      cerrarModalSalida();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && cancelarModal?.classList.contains("open")) {
      cerrarModalSalida();
    }
  });
}

function abrirModalSalida() {
  cancelarModal?.classList.add("open");
}

function cerrarModalSalida() {
  cancelarModal?.classList.remove("open");
}
