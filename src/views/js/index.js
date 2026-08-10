/**
 * index.js
 *
 * Controla las interacciones de la página principal.
 *
 * Actualmente:
 * - Actualiza automáticamente el año del footer.
 * - Abre el selector de tipo de inspección.
 * - Cierra el selector.
 * - Permite cerrarlo haciendo clic fuera.
 * - Permite cerrarlo con Escape.
 */


// =====================================================
// ELEMENTOS DEL DOM
// =====================================================

const yearElement =
  document.getElementById("yr");

const btnSeleccionarInspeccion =
  document.getElementById("btn-seleccionar-inspeccion");

const modalSeleccionarInspeccion =
  document.getElementById("modal-seleccionar-inspeccion");

const btnCerrarSelectorInspeccion =
  document.getElementById("btn-cerrar-selector-inspeccion");

const selectorInspeccionBackdrop =
  document.getElementById("selector-inspeccion-backdrop");


// =====================================================
// AÑO DEL FOOTER
// =====================================================

if (yearElement) {
  yearElement.textContent =
    new Date().getFullYear();
}


// =====================================================
// SELECTOR DE INSPECCIÓN
// =====================================================

function abrirSelectorInspeccion() {

  modalSeleccionarInspeccion.classList.remove("hidden");

  document.body.classList.add("modal-open");

}


function cerrarSelectorInspeccion() {

  modalSeleccionarInspeccion.classList.add("hidden");

  document.body.classList.remove("modal-open");

}


// =====================================================
// EVENTOS
// =====================================================

btnSeleccionarInspeccion?.addEventListener(
  "click",
  abrirSelectorInspeccion
);


btnCerrarSelectorInspeccion?.addEventListener(
  "click",
  cerrarSelectorInspeccion
);


selectorInspeccionBackdrop?.addEventListener(
  "click",
  cerrarSelectorInspeccion
);


// Cerrar con tecla Escape
document.addEventListener("keydown", (event) => {

  if (
    event.key === "Escape" &&
    !modalSeleccionarInspeccion?.classList.contains("hidden")
  ) {

    cerrarSelectorInspeccion();

  }

});