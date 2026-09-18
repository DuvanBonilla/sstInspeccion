/**
 * Crea el controlador de salida de una inspección EPP.
 *
 * Gestiona la confirmación de abandono del formulario y las acciones
 * disponibles después de registrar exitosamente una inspección.
 *
 * @param {Object} dependencias Dependencias del controlador.
 * @param {Document} [dependencias.documento=document] Documento actual.
 * @param {Window} [dependencias.ventana=window] Ventana actual.
 * @returns {Object} API del controlador.
 */
export function crearSalidaInspeccionEppController({
  documento = document,
  ventana = window,
} = {}) {
  const btnSalir =
    documento.getElementById("btn-salir");

  const btnLogoInicio =
    documento.getElementById(
      "btn-logo-inicio",
    );

  const cancelarModal =
    documento.getElementById(
      "cancelar-modal",
    );

  const btnCancelarNo =
    documento.getElementById(
      "btn-cancelar-no",
    );

  const btnCancelarSi =
    documento.getElementById(
      "btn-cancelar-si",
    );

  const btnInicio =
    documento.getElementById(
      "btn-modal-inicio",
    );

  const btnNueva =
    documento.getElementById(
      "btn-modal-nueva",
    );

  function abrirModalSalida() {
    cancelarModal?.classList.add(
      "visible",
    );
  }

  function cerrarModalSalida() {
    cancelarModal?.classList.remove(
      "visible",
    );
  }

  function inicializar() {
    btnSalir?.addEventListener(
      "click",
      abrirModalSalida,
    );

    btnLogoInicio?.addEventListener(
      "click",
      abrirModalSalida,
    );

    btnCancelarNo?.addEventListener(
      "click",
      cerrarModalSalida,
    );

    btnCancelarSi?.addEventListener(
      "click",
      () => {
        ventana.location.href = "/";
      },
    );

    cancelarModal?.addEventListener(
      "click",
      (event) => {
        if (event.target === cancelarModal) {
          cerrarModalSalida();
        }
      },
    );

    documento.addEventListener(
      "keydown",
      (event) => {
        if (
          event.key === "Escape" &&
          cancelarModal?.classList.contains(
            "visible",
          )
        ) {
          cerrarModalSalida();
        }
      },
    );

    btnInicio?.addEventListener(
      "click",
      () => {
        ventana.location.href = "/";
      },
    );

    btnNueva?.addEventListener(
      "click",
      () => {
        ventana.location.href =
          "/inspeccion-epp";
      },
    );
  }

  return {
    inicializar,
    abrirModalSalida,
    cerrarModalSalida,
  };
}