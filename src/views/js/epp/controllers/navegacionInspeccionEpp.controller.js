/**
 * Crea el controlador de navegación de la inspección EPP.
 *
 * @param {Object} dependencias Dependencias del controlador.
 * @param {Document} [dependencias.documento=document] Documento actual.
 * @param {Window} [dependencias.ventana=window] Ventana actual.
 * @param {number} [dependencias.totalPasos=3] Cantidad de pasos.
 * @param {number} [dependencias.pasoInicial=1] Paso inicial.
 * @param {Function} dependencias.validarInformacionGeneral Validación general.
 * @param {Function} dependencias.validarTrabajadores Validación de trabajadores.
 * @param {Function} dependencias.prepararResumen Preparación del resumen.
 * @returns {Object} API de navegación.
 */
export function crearNavegacionInspeccionEpp({
  documento = document,
  ventana = window,
  totalPasos = 3,
  pasoInicial = 1,
  validarInformacionGeneral = () => true,
  validarTrabajadores = () => true,
  prepararResumen = () => {},
} = {}) {
  let pasoActual = pasoInicial;

  function inicializar() {
    documento
      .querySelectorAll("[data-step-target]")
      .forEach((boton) => {
        boton.addEventListener("click", () => {
          const destino = Number(
            boton.dataset.stepTarget,
          );

          if (!destino) {
            return;
          }

          navegarAPaso(destino);
        });
      });
  }

  function navegarAPaso(destino) {
    if (
      destino < 1 ||
      destino > totalPasos
    ) {
      return;
    }

    if (
      pasoActual === 1 &&
      destino > pasoActual
    ) {
      const formularioValido =
        validarInformacionGeneral();

      if (!formularioValido) {
        return;
      }
    }

    if (
      pasoActual === 2 &&
      destino > pasoActual
    ) {
      const trabajadoresValidos =
        validarTrabajadores();

      if (!trabajadoresValidos) {
        return;
      }
    }

    if (destino === 3) {
      prepararResumen();
    }

    pasoActual = destino;

    actualizarPaso();
  }

  function actualizarPaso() {
    documento
      .querySelectorAll("[data-step-panel]")
      .forEach((panel) => {
        const numeroPaso = Number(
          panel.dataset.stepPanel,
        );

        panel.classList.toggle(
          "hidden",
          numeroPaso !== pasoActual,
        );
      });

    documento
      .querySelectorAll("[data-step-indicator]")
      .forEach((indicador) => {
        const numeroPaso = Number(
          indicador.dataset.stepIndicator,
        );

        indicador.classList.toggle(
          "active",
          numeroPaso === pasoActual,
        );

        indicador.classList.toggle(
          "completed",
          numeroPaso < pasoActual,
        );
      });

    ventana.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function obtenerPasoActual() {
    return pasoActual;
  }

  return {
    inicializar,
    navegarAPaso,
    actualizarPaso,
    obtenerPasoActual,
  };
}