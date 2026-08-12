/**
 * index.js
 *
 * Controla las interacciones de la página principal.
 *
 * Funciones:
 * - Actualiza automáticamente el año del footer.
 * - Abre y cierra el selector de tipo de inspección.
 * - Abre y cierra el selector de tipo de estadística.
 * - Permite cerrar los selectores haciendo clic fuera.
 * - Permite cerrar los selectores con Escape.
 */

// =====================================================
// ELEMENTOS DEL DOM
// =====================================================

// Footer
const yearElement = document.getElementById("yr");

// -----------------------------------------------------
// Selector de inspección
// -----------------------------------------------------

const btnSeleccionarInspeccion = document.getElementById(
  "btn-seleccionar-inspeccion",
);

const modalSeleccionarInspeccion = document.getElementById(
  "modal-seleccionar-inspeccion",
);

const btnCerrarSelectorInspeccion = document.getElementById(
  "btn-cerrar-selector-inspeccion",
);

const selectorInspeccionBackdrop = document.getElementById(
  "selector-inspeccion-backdrop",
);

// -----------------------------------------------------
// Selector de estadísticas
// -----------------------------------------------------

const btnSeleccionarEstadistica = document.getElementById(
  "btn-seleccionar-estadistica",
);

const modalSeleccionarEstadistica = document.getElementById(
  "modal-seleccionar-estadistica",
);

const btnCerrarSelectorEstadistica = document.getElementById(
  "btn-cerrar-selector-estadistica",
);

const selectorEstadisticaBackdrop = document.getElementById(
  "selector-estadistica-backdrop",
);

// =====================================================
// AÑO DEL FOOTER
// =====================================================

if (yearElement) {
  yearElement.textContent = new Date().getFullYear();
}

// =====================================================
// SELECTOR DE INSPECCIÓN
// =====================================================

function abrirSelectorInspeccion() {
  if (!modalSeleccionarInspeccion) return;

  modalSeleccionarInspeccion.classList.remove("hidden");

  document.body.classList.add("modal-open");
}

function cerrarSelectorInspeccion() {
  if (!modalSeleccionarInspeccion) return;

  modalSeleccionarInspeccion.classList.add("hidden");

  document.body.classList.remove("modal-open");
}

// =====================================================
// SELECTOR DE ESTADÍSTICAS
// =====================================================

function abrirSelectorEstadistica() {
  if (!modalSeleccionarEstadistica) return;

  modalSeleccionarEstadistica.classList.remove("hidden");

  document.body.classList.add("modal-open");
}

function cerrarSelectorEstadistica() {
  if (!modalSeleccionarEstadistica) return;

  modalSeleccionarEstadistica.classList.add("hidden");

  document.body.classList.remove("modal-open");
}

// =====================================================
// EVENTOS - INSPECCIÓN
// =====================================================

btnSeleccionarInspeccion?.addEventListener("click", abrirSelectorInspeccion);

btnCerrarSelectorInspeccion?.addEventListener(
  "click",
  cerrarSelectorInspeccion,
);

selectorInspeccionBackdrop?.addEventListener("click", cerrarSelectorInspeccion);

// =====================================================
// EVENTOS - ESTADÍSTICAS
// =====================================================

btnSeleccionarEstadistica?.addEventListener("click", abrirSelectorEstadistica);

btnCerrarSelectorEstadistica?.addEventListener(
  "click",
  cerrarSelectorEstadistica,
);

selectorEstadisticaBackdrop?.addEventListener(
  "click",
  cerrarSelectorEstadistica,
);

// =====================================================
// CERRAR CON TECLA ESCAPE
// =====================================================

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") {
    return;
  }

  // Cerrar selector de inspección
  if (
    modalSeleccionarInspeccion &&
    !modalSeleccionarInspeccion.classList.contains("hidden")
  ) {
    cerrarSelectorInspeccion();

    return;
  }

  // Cerrar selector de estadísticas
  if (
    modalSeleccionarEstadistica &&
    !modalSeleccionarEstadistica.classList.contains("hidden")
  ) {
    cerrarSelectorEstadistica();
  }
});
