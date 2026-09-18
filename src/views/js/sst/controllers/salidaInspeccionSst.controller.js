/**
 * Gestiona el modal de confirmación de salida de la inspección SST.
 *
 * @param {Object} dependencias Dependencias del controlador.
 * @param {Document} dependencias.documento Documento de la interfaz.
 * @param {Window} dependencias.ventana Ventana utilizada para navegar.
 * @returns {Object} API del controlador de salida.
 */
export function crearSalidaInspeccionSstController({
  documento,
  ventana,
}) {
  function obtenerModal() {
    return documento.getElementById("cancelar-modal");
  }

  function mostrar() {
    obtenerModal()?.classList.add("visible");
  }

  function cerrar() {
    obtenerModal()?.classList.remove("visible");
  }

  function confirmarSalida() {
    ventana.location.href = "/";
  }

  function manejarClicModal(event) {
    const modal = obtenerModal();

    if (event.target === modal) {
      cerrar();
    }
  }

  function manejarTecla(event) {
    if (
      event.key === "Escape" &&
      obtenerModal()?.classList.contains("visible")
    ) {
      cerrar();
    }
  }

  function inicializar() {
    documento
      .getElementById("btn-salir")
      ?.addEventListener("click", mostrar);

    documento
      .getElementById("btn-cancelar-no")
      ?.addEventListener("click", cerrar);

    documento
      .getElementById("btn-cancelar-si")
      ?.addEventListener("click", confirmarSalida);

    obtenerModal()?.addEventListener("click", manejarClicModal);

    documento.addEventListener("keydown", manejarTecla);
  }

  return {
    mostrar,
    cerrar,
    confirmarSalida,
    manejarClicModal,
    manejarTecla,
    inicializar,
  };
}