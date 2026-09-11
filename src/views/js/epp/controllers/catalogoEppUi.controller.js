/**
 * Obtiene la selección temporal del catálogo asociada con un trabajador.
 *
 * @param {HTMLElement} card Tarjeta del trabajador.
 * @returns {Set<string>} Identificadores seleccionados.
 */
export function obtenerSeleccionCatalogoEpp(card) {
  if (!card._eppSeleccionados) {
    card._eppSeleccionados = new Set();
  }

  return card._eppSeleccionados;
}

/**
 * Actualiza el contador y el botón de elementos seleccionados.
 *
 * @param {HTMLElement} card Tarjeta del trabajador.
 * @returns {void}
 */
export function actualizarSeleccionCatalogoEpp(card) {
  if (!card) {
    return;
  }

  const seleccionados = obtenerSeleccionCatalogoEpp(card);
  const cantidad = seleccionados.size;

  const contador = card.querySelector(".epp-catalogo-contador");

  const botonAgregar = card.querySelector(
    ".epp-catalogo-agregar-seleccionados",
  );

  if (contador) {
    contador.textContent =
      cantidad === 1
        ? "1 elemento seleccionado"
        : `${cantidad} elementos seleccionados`;
  }

  if (botonAgregar) {
    botonAgregar.textContent = `Agregar seleccionados (${cantidad})`;
    botonAgregar.disabled = cantidad === 0;
  }
}

/**
 * Elimina la selección temporal del catálogo.
 *
 * @param {HTMLElement} card Tarjeta del trabajador.
 * @returns {void}
 */
export function limpiarSeleccionCatalogoEpp(card) {
  if (!card) {
    return;
  }

  card._eppSeleccionados = new Set();

  actualizarSeleccionCatalogoEpp(card);
}

/**
 * Sincroniza las opciones del catálogo con los elementos ya agregados.
 *
 * @param {HTMLElement} card Tarjeta del trabajador.
 * @returns {void}
 */
export function sincronizarCatalogoEpp(card) {
  if (!card) {
    return;
  }

  const idsActuales = new Set(
    Array.from(
      card.querySelectorAll(
        ".epp-table tbody tr[data-elemento-epp-id]",
      ),
    )
      .map((fila) => fila.dataset.elementoEppId)
      .filter(Boolean),
  );

  const checks = card.querySelectorAll(".epp-catalogo-checkbox");

  checks.forEach((check) => {
    const elementoEppId = check.dataset.elementoEppId;

    const yaAgregado =
      elementoEppId && idsActuales.has(elementoEppId);

    check.checked = false;
    check.disabled = Boolean(yaAgregado);

    const opcion = check.closest(".epp-catalogo-opcion");

    if (opcion) {
      opcion.classList.toggle(
        "epp-catalogo-opcion-agregada",
        Boolean(yaAgregado),
      );
    }
  });
}

/**
 * Abre o cierra el panel del catálogo de elementos EPP.
 *
 * @param {HTMLElement} card Tarjeta del trabajador.
 * @param {HTMLButtonElement|null} boton Botón que controla el panel.
 * @returns {void}
 */
export function alternarCatalogoEpp(card, boton) {
  const panel = card?.querySelector(".epp-catalogo-panel");

  if (!panel) {
    return;
  }

  const abrir = panel.hidden;

  if (abrir) {
    sincronizarCatalogoEpp(card);
  }

  panel.hidden = !abrir;

  if (boton) {
    boton.textContent = abrir
      ? "− Ocultar elementos EPP"
      : "+ Agregar elementos EPP";
  }
}

/**
 * Registra los eventos del buscador y del catálogo EPP.
 *
 * La función de filtrado se recibe como dependencia porque el controlador
 * no debe conocer el estado general del administrador de trabajadores.
 *
 * @param {Object} dependencias Dependencias del controlador.
 * @param {HTMLElement|null} dependencias.container Contenedor de trabajadores.
 * @param {Document} dependencias.documento Documento de la interfaz.
 * @param {Function} dependencias.filtrarElementosEpp Función de filtrado.
 * @returns {void}
 */
export function registrarEventosCatalogoEpp({
  container,
  documento = document,
  filtrarElementosEpp,
}) {
  container?.addEventListener("focusin", (event) => {
    const buscador = event.target.closest(".epp-catalogo-buscador");

    if (!buscador) {
      return;
    }

    const card = buscador.closest(".trabajador-card");

    if (!card) {
      return;
    }

    filtrarElementosEpp(card, buscador.value);
  });

  container?.addEventListener("input", (event) => {
    const buscador = event.target.closest(".epp-catalogo-buscador");

    if (!buscador) {
      return;
    }

    const card = buscador.closest(".trabajador-card");

    if (!card) {
      return;
    }

    filtrarElementosEpp(card, buscador.value);
  });

  container?.addEventListener("keydown", (event) => {
    const buscador = event.target.closest(".epp-catalogo-buscador");

    if (!buscador) {
      return;
    }

    const card = buscador.closest(".trabajador-card");

    if (!card) {
      return;
    }

    const resultados = card.querySelector(".epp-catalogo-resultados");

    if (!resultados || resultados.hidden) {
      return;
    }

    const opciones = Array.from(
      resultados.querySelectorAll(".epp-combobox-opcion"),
    );

    if (opciones.length === 0) {
      return;
    }

    let indiceActivo = opciones.findIndex((opcion) =>
      opcion.classList.contains("epp-combobox-opcion-activa"),
    );

    if (event.key === "ArrowDown") {
      event.preventDefault();

      indiceActivo =
        indiceActivo < opciones.length - 1
          ? indiceActivo + 1
          : 0;
    } else if (event.key === "ArrowUp") {
      event.preventDefault();

      indiceActivo =
        indiceActivo > 0
          ? indiceActivo - 1
          : opciones.length - 1;
    } else if (event.key === "Enter") {
      event.preventDefault();

      const opcionSeleccionada =
        indiceActivo >= 0
          ? opciones[indiceActivo]
          : opciones[0];

      opcionSeleccionada?.click();

      return;
    } else if (event.key === "Escape") {
      resultados.hidden = true;
      resultados.innerHTML = "";

      buscador.setAttribute("aria-expanded", "false");

      return;
    } else {
      return;
    }

    opciones.forEach((opcion) => {
      opcion.classList.remove("epp-combobox-opcion-activa");
    });

    const opcionActiva = opciones[indiceActivo];

    opcionActiva.classList.add("epp-combobox-opcion-activa");

    opcionActiva.scrollIntoView({
      block: "nearest",
    });
  });

  documento.addEventListener("click", (event) => {
    if (
      event.target.closest(".epp-catalogo-buscador") ||
      event.target.closest(".epp-catalogo-resultados")
    ) {
      return;
    }

    container
      ?.querySelectorAll(".epp-catalogo-resultados")
      .forEach((resultados) => {
        resultados.hidden = true;
        resultados.innerHTML = "";

        const card = resultados.closest(".trabajador-card");

        const buscador = card?.querySelector(
          ".epp-catalogo-buscador",
        );

        buscador?.setAttribute("aria-expanded", "false");
      });
  });
}
