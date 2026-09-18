/**
 * Crea el controlador de navegación de la inspección SST.
 */
export function crearNavegacionInspeccionSst({
  documento,
  ventana,
  totalPasos,
  validarPaso,
  actualizarVisibilidadOmitir,
  prepararResumen,
}) {
  let pasoActual = 1;

  function limpiarErroresPaso(paso) {
    const panel = documento.querySelector(
      `[data-step-panel="${paso}"]`,
    );

    panel
      ?.querySelector(".validation-summary")
      ?.remove();

    panel
      ?.querySelectorAll(".campo-error")
      .forEach((elemento) => {
        elemento.classList.remove("campo-error");
      });
  }

  function actualizarVista() {
    documento
      .querySelectorAll("[data-step-panel]")
      .forEach((panel) => {
        const numeroPaso = Number(
          panel.getAttribute("data-step-panel"),
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
          indicador.getAttribute(
            "data-step-indicator",
          ),
        );

        indicador.classList.remove(
          "active",
          "done",
        );

        if (numeroPaso < pasoActual) {
          indicador.classList.add("done");
        } else if (numeroPaso === pasoActual) {
          indicador.classList.add("active");
        }
      });

    ventana.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function irPaso(destino) {
    if (destino < 1 || destino > totalPasos) {
      return false;
    }

    if (
      destino > pasoActual &&
      !validarPaso(pasoActual)
    ) {
      return false;
    }

    limpiarErroresPaso(pasoActual);

    pasoActual = destino;

    actualizarVisibilidadOmitir();

    if (pasoActual === totalPasos) {
      prepararResumen();
    }

    actualizarVista();

    return true;
  }

  function inicializar() {
    documento
      .querySelectorAll("[data-step-target]")
      .forEach((boton) => {
        boton.addEventListener("click", () => {
          irPaso(
            Number(
              boton.getAttribute("data-step-target"),
            ),
          );
        });
      });

    documento
      .querySelectorAll("[data-step-indicator]")
      .forEach((indicador) => {
        indicador.addEventListener("click", () => {
          irPaso(
            Number(
              indicador.getAttribute(
                "data-step-indicator",
              ),
            ),
          );
        });
      });

    irPaso(1);
  }

  function obtenerPasoActual() {
    return pasoActual;
  }

  return {
    inicializar,
    irPaso,
    actualizarVista,
    obtenerPasoActual,
  };
}