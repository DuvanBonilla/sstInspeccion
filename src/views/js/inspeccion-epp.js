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

  inicializarEnvioEpp();

  actualizarPaso();

  inicializarAccionesModalExito();
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

    construirResumenTrabajadores();

    verificarInspeccionEpp();

    verificarFormDataEpp();
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

function generarInspeccionId() {
  const hoy = new Date();

  const fecha =
    `${hoy.getFullYear()}` +
    `${String(hoy.getMonth() + 1).padStart(2, "0")}` +
    `${String(hoy.getDate()).padStart(2, "0")}`;

  const aleatorio = Math.random().toString(36).slice(2, 6).toUpperCase();

  return `INSP-${fecha}-${aleatorio}`;
}

// =========================================================
// CONSTRUIR INSPECCIÓN EPP
// =========================================================

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

// =========================================================
// CONSTRUIR FORMDATA EPP
// =========================================================

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

// =========================================================
// ENVIAR INSPECCIÓN EPP
// =========================================================

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

// =========================================================
// INICIALIZAR ENVÍO EPP
// =========================================================
// =========================================================
// CONSTRUIR LINKS DE APROBACIÓN EPP
// =========================================================

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

// =========================================================
// INICIALIZAR ENVÍO EPP
// =========================================================

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
// =========================================================
// VERIFICAR FORMDATA EPP
// Temporal durante el desarrollo
// =========================================================

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

// =========================================================
// VERIFICAR DATOS FINALES EPP
// Temporal durante el desarrollo
// =========================================================

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

// =========================================================
// SALIR DEL FORMULARIO
// =========================================================

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
