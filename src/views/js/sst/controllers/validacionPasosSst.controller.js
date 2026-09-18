/**
 * Crea el controlador de validación visual de los pasos SST.
 */
export function crearValidacionPasosSst({
  documento,
  seccionesOmitibles,
  seccionesOmitidas,
  esCampoOpcional,
  tieneItemsInspeccion,
}) {
  function limpiarErrores(panel) {
    panel
      .querySelectorAll(".campo-error")
      .forEach((elemento) => {
        elemento.classList.remove("campo-error");
      });
  }

  function validarPaso(numeroPaso) {
    const panel = documento.querySelector(
      `[data-step-panel="${numeroPaso}"]`,
    );

    if (!panel) {
      return true;
    }

    const seccion = seccionesOmitibles.find(
      (item) => item.step === numeroPaso,
    );

    if (
      seccion &&
      seccionesOmitidas[seccion.key]
    ) {
      limpiarErrores(panel);

      panel
        .querySelector(".validation-summary")
        ?.remove();

      return true;
    }

    limpiarErrores(panel);

    let valido = true;

    panel
      .querySelectorAll(
        'input[type="text"], input[type="number"], input[type="date"], input[type="month"], input[type="file"]',
      )
      .forEach((input) => {
        if (
          input.disabled ||
          esCampoOpcional(input)
        ) {
          return;
        }

        if (!input.value.trim()) {
          input.classList.add("campo-error");
          valido = false;
        }
      });

    panel
      .querySelectorAll("select")
      .forEach((select) => {
        if (select.disabled) {
          return;
        }

        if (!select.value) {
          select.classList.add("campo-error");
          valido = false;
        }
      });

    const resumenExistente = panel.querySelector(
      ".validation-summary",
    );

    if (!valido) {
      if (!resumenExistente) {
        const mensaje =
          documento.createElement("div");

        mensaje.className = "validation-summary";

        mensaje.innerHTML =
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clip-rule="evenodd"/></svg><span>Completa los campos marcados en rojo para continuar.</span>`;

        const acciones =
          panel.querySelector(".step-actions");

        const accionesDerecha =
          acciones?.querySelector(
            ".step-actions-right",
          );

        const contenedor =
          accionesDerecha ?? acciones;

        const botonPrincipal =
          contenedor?.querySelector(
            ".nav-primary",
          );

        if (botonPrincipal && contenedor) {
          contenedor.insertBefore(
            mensaje,
            botonPrincipal,
          );
        } else if (acciones) {
          acciones.appendChild(mensaje);
        } else {
          panel.appendChild(mensaje);
        }
      }

      const primerError =
        panel.querySelector(".campo-error");

      primerError?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    } else {
      resumenExistente?.remove();
    }

    if (
      numeroPaso === 7 &&
      !tieneItemsInspeccion()
    ) {
      const mensaje =
        documento.getElementById("msg");

      if (mensaje) {
        mensaje.textContent =
          "No puede enviar este informe porque no se ha registrado ningún ítem en la inspección.";
      }

      const botonEnviar =
        documento.getElementById("btn-onedrive");

      if (botonEnviar) {
        botonEnviar.disabled = true;
      }

      return false;
    }

    return valido;
  }

  function actualizarBotonSiguienteGeneral() {
    const panel = documento.querySelector(
      '[data-step-panel="1"]',
    );

    const botonSiguiente = panel?.querySelector(
      '[data-step-target="2"]',
    );

    if (!panel || !botonSiguiente) {
      return;
    }

    const campos = panel.querySelectorAll(
      'input[type="text"], input[type="date"], select',
    );

    const camposCompletos = Array.from(
      campos,
    ).every((campo) => {
      if (
        campo.disabled ||
        esCampoOpcional(campo)
      ) {
        return true;
      }

      return String(
        campo.value || "",
      ).trim() !== "";
    });

    botonSiguiente.disabled =
      !camposCompletos;
  }

  function inicializar() {
    const panel = documento.querySelector(
      '[data-step-panel="1"]',
    );

    panel?.addEventListener(
      "input",
      actualizarBotonSiguienteGeneral,
    );

    panel?.addEventListener(
      "change",
      actualizarBotonSiguienteGeneral,
    );

    actualizarBotonSiguienteGeneral();
  }

  return {
    inicializar,
    validarPaso,
    actualizarBotonSiguienteGeneral,
  };
}