/**
 * Muestra un mensaje en el estado general del formulario.
 *
 * @param {HTMLElement|null} estadoElement Elemento de estado.
 * @param {string} mensaje Mensaje que debe mostrarse.
 * @returns {void}
 */
export function mostrarEstadoValidacion(
  estadoElement,
  mensaje,
) {
  if (!estadoElement) {
    return;
  }

  estadoElement.textContent = mensaje;

  estadoElement.classList.remove(
    "hidden",
  );
}

/**
 * Limpia y oculta el estado general del formulario.
 *
 * @param {HTMLElement|null} estadoElement Elemento de estado.
 * @returns {void}
 */
export function ocultarEstadoValidacion(
  estadoElement,
) {
  if (!estadoElement) {
    return;
  }

  estadoElement.textContent = "";

  estadoElement.classList.add("hidden");
}

function obtenerElementoError(
  tarjeta,
  resultado,
) {
  const selectoresTrabajador = {
    nombre: '[data-role="nombre"]',
    codigo: '[data-role="codigo"]',
    cargo: '[data-role="cargo"]',
    evidencia: '[data-role="evidencia"]',
  };

  if (selectoresTrabajador[resultado.campo]) {
    return tarjeta.querySelector(
      selectoresTrabajador[resultado.campo],
    );
  }

  const filasEpp = tarjeta.querySelectorAll(
    "tr[data-elemento]",
  );

  const fila =
    filasEpp[resultado.elementoIndex];

  if (resultado.campo === "condicion") {
    return fila?.querySelector(
      '[data-role="condicion"]',
    );
  }

  if (resultado.campo === "uso") {
    return fila?.querySelector(
      '[data-role="uso"]',
    );
  }

  const filaPlan = fila?.nextElementSibling;

  if (resultado.campo === "planAccion") {
    return filaPlan?.querySelector(
      '[data-role="epp-plan-accion"]',
    );
  }

  if (
    resultado.campo ===
    "fechaPlanAccion"
  ) {
    return filaPlan?.querySelector(
      '[data-role="epp-fecha-plan"]',
    );
  }

  return null;
}

/**
 * Representa visualmente el resultado de la validación.
 *
 * @param {Object} opciones Datos y dependencias de presentación.
 * @param {Object} opciones.resultado Resultado del validador.
 * @param {Array<HTMLElement>} opciones.tarjetas Tarjetas existentes.
 * @param {HTMLElement} opciones.container Contenedor de trabajadores.
 * @param {HTMLInputElement|null} opciones.cantidadInput Campo de cantidad.
 * @param {HTMLElement|null} opciones.estadoElement Estado general.
 * @param {Function} opciones.abrirTrabajador Abre la tarjeta afectada.
 * @param {Function} opciones.programar Programa el enfoque del campo.
 * @returns {{valido: boolean, mensaje: string}}
 */
export function presentarResultadoValidacion({
  resultado,
  tarjetas,
  container,
  cantidadInput,
  estadoElement,
  abrirTrabajador,
  programar = setTimeout,
}) {
  if (resultado.valido) {
    ocultarEstadoValidacion(
      estadoElement,
    );

    return {
      valido: true,
      mensaje: "",
    };
  }

  if (resultado.campo === "cantidad") {
    mostrarEstadoValidacion(
      estadoElement,
      "Debe generar al menos un trabajador antes de continuar.",
    );

    cantidadInput?.focus();

    return {
      valido: false,
      mensaje: resultado.mensaje,
    };
  }

  const tarjeta =
    tarjetas[resultado.trabajadorIndex];

  if (!tarjeta) {
    mostrarEstadoValidacion(
      estadoElement,
      resultado.mensaje,
    );

    return {
      valido: false,
      mensaje: resultado.mensaje,
    };
  }

  abrirTrabajador(container, tarjeta);

  if (resultado.campo === "elementos") {
    mostrarEstadoValidacion(
      estadoElement,
      resultado.mensaje,
    );

    return {
      valido: false,
      mensaje: resultado.mensaje,
    };
  }

  const elemento = obtenerElementoError(
    tarjeta,
    resultado,
  );

  mostrarEstadoValidacion(
    estadoElement,
    resultado.mensaje,
  );

  if (elemento) {
    elemento.classList.add(
      "campo-error",
    );

    elemento.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });

    programar(() => {
      elemento.focus();
    }, 300);
  }

  return {
    valido: false,
    mensaje: resultado.mensaje,
  };
}