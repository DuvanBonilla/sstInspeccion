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
      card.querySelectorAll(".epp-table tbody tr[data-elemento-epp-id]"),
    )
      .map((fila) => fila.dataset.elementoEppId)
      .filter(Boolean),
  );

  const checks = card.querySelectorAll(".epp-catalogo-checkbox");

  checks.forEach((check) => {
    const elementoEppId = check.dataset.elementoEppId;

    const yaAgregado = elementoEppId && idsActuales.has(elementoEppId);

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
 * Filtra y representa los elementos disponibles del catálogo EPP.
 *
 * @param {HTMLElement} card Tarjeta del trabajador.
 * @param {string} terminoBusqueda Texto ingresado en el buscador.
 * @param {Object} dependencias Dependencias del catálogo.
 * @param {Array<Object>} dependencias.elementosEpp Elementos disponibles.
 * @param {Function} dependencias.filtrarCatalogoEpp Función de filtrado.
 * @param {Function} dependencias.crearMensajeCatalogoSinResultados Plantilla vacía.
 * @param {Function} dependencias.crearOpcionesCatalogoEpp Plantilla de opciones.
 * @returns {void}
 */
export function filtrarElementosEpp(
  card,
  terminoBusqueda = "",
  {
    elementosEpp,
    filtrarCatalogoEpp,
    crearMensajeCatalogoSinResultados,
    crearOpcionesCatalogoEpp,
  },
) {
  const contenedorResultados = card.querySelector(".epp-catalogo-resultados");

  const buscador = card.querySelector(".epp-catalogo-buscador");

  if (!contenedorResultados) {
    return;
  }

  const idsActuales = new Set(
    Array.from(
      card.querySelectorAll(
        ".epp-table tbody tr.epp-fila[data-elemento-epp-id]",
      ),
    )
      .map((fila) => fila.dataset.elementoEppId)
      .filter(Boolean),
  );

  const seleccionados = obtenerSeleccionCatalogoEpp(card);

  const resultados = filtrarCatalogoEpp({
    elementos: elementosEpp,
    idsActuales,
    terminoBusqueda,
  });

  if (resultados.length === 0) {
    contenedorResultados.innerHTML = crearMensajeCatalogoSinResultados();

    contenedorResultados.hidden = false;

    buscador?.setAttribute("aria-expanded", "true");

    return;
  }

  contenedorResultados.innerHTML = crearOpcionesCatalogoEpp(
    resultados,
    seleccionados,
  );

  contenedorResultados.hidden = false;

  buscador?.setAttribute("aria-expanded", "true");
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

      indiceActivo = indiceActivo < opciones.length - 1 ? indiceActivo + 1 : 0;
    } else if (event.key === "ArrowUp") {
      event.preventDefault();

      indiceActivo = indiceActivo > 0 ? indiceActivo - 1 : opciones.length - 1;
    } else if (event.key === "Enter") {
      event.preventDefault();

      const opcionSeleccionada =
        indiceActivo >= 0 ? opciones[indiceActivo] : opciones[0];

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

        const buscador = card?.querySelector(".epp-catalogo-buscador");

        buscador?.setAttribute("aria-expanded", "false");
      });
  });
}

/**
 * Agrega a la evaluación los elementos seleccionados del catálogo.
 *
 * @param {HTMLElement} card Tarjeta del trabajador.
 * @param {Object} dependencias Dependencias necesarias para crear las filas.
 * @param {Array<Object>} dependencias.elementosEpp Catálogo disponible.
 * @param {Function} dependencias.crearFilaEpp Generador de filas EPP.
 * @param {Array<string>} dependencias.valoresCalificacion Calificaciones permitidas.
 * @returns {void}
 */
export function agregarElementosSeleccionados(
  card,
  { elementosEpp, crearFilaEpp, valoresCalificacion },
) {
  if (!card) {
    return;
  }

  const seleccionados = obtenerSeleccionCatalogoEpp(card);

  if (seleccionados.size === 0) {
    return;
  }

  const tbody = card.querySelector(".epp-table tbody");

  if (!tbody) {
    return;
  }

  const idsActuales = new Set(
    Array.from(tbody.querySelectorAll("tr[data-elemento-epp-id]"))
      .map((fila) => fila.dataset.elementoEppId)
      .filter(Boolean),
  );

  seleccionados.forEach((elementoEppId) => {
    if (idsActuales.has(elementoEppId)) {
      return;
    }

    const elementoCatalogo = elementosEpp.find(
      (elemento) => String(elemento.id) === String(elementoEppId),
    );

    if (!elementoCatalogo) {
      console.warn(
        "[EPP] Elemento seleccionado no encontrado en catálogo:",
        elementoEppId,
      );

      return;
    }

    const nuevoIndex = tbody.querySelectorAll("tr[data-elemento]").length;

    tbody.insertAdjacentHTML(
      "beforeend",
      crearFilaEpp(
        {
          elementoEppId: elementoCatalogo.id,
          elemento: elementoCatalogo.nombre,
        },
        nuevoIndex,
        valoresCalificacion,
      ),
    );

    idsActuales.add(String(elementoEppId));
  });

  limpiarSeleccionCatalogoEpp(card);
  sincronizarCatalogoEpp(card);

  const panel = card.querySelector(".epp-catalogo-panel");

  const boton = card.querySelector(".btn-toggle-catalogo-epp");

  if (panel) {
    panel.hidden = true;
  }

  if (boton) {
    boton.textContent = "+ Agregar elementos EPP";
  }
}

/**
 * Elimina un elemento EPP y su fila de plan asociada.
 *
 * @param {HTMLElement} card Tarjeta del trabajador.
 * @param {HTMLTableRowElement} fila Fila del elemento.
 * @param {Function} mostrarEstado Función para mostrar mensajes.
 * @returns {void}
 */
export function eliminarElementoEpp(card, fila, mostrarEstado) {
  if (!card || !fila) {
    return;
  }

  const tbody = card.querySelector(".epp-table tbody");

  if (!tbody) {
    return;
  }

  const filas = tbody.querySelectorAll("tr[data-elemento]");

  if (filas.length <= 1) {
    mostrarEstado("Cada trabajador debe tener al menos un elemento EPP.");

    return;
  }

  const filaPlan = fila.nextElementSibling;

  const tieneFilaPlan = filaPlan?.classList.contains("epp-plan-row");

  if (tieneFilaPlan) {
    filaPlan.remove();
  }

  fila.remove();

  sincronizarCatalogoEpp(card);
}

/**
 * Atiende las acciones por clic relacionadas con el catálogo EPP.
 *
 * @param {Event} event Evento delegado desde el contenedor.
 * @param {Object} dependencias Dependencias de la gestión del catálogo.
 * @param {Array<Object>} dependencias.elementosEpp Catálogo disponible.
 * @param {Function} dependencias.crearFilaEpp Generador de filas EPP.
 * @param {Array<string>} dependencias.valoresCalificacion Calificaciones permitidas.
 * @param {Function} dependencias.mostrarEstado Función para mostrar mensajes.
 * @param {Function} dependencias.programar Función utilizada para diferir tareas.
 * @returns {boolean} `true` cuando la acción pertenecía al catálogo.
 */
export function manejarAccionCatalogoEpp(
  event,
  {
    elementosEpp,
    crearFilaEpp,
    valoresCalificacion,
    mostrarEstado,
    programar = setTimeout,
  },
) {
  const botonCatalogo = event.target.closest(".btn-toggle-catalogo-epp");

  if (botonCatalogo) {
    event.stopPropagation();

    const tarjeta = botonCatalogo.closest(".trabajador-card");

    if (tarjeta) {
      alternarCatalogoEpp(tarjeta, botonCatalogo);
    }

    return true;
  }

  const botonAgregarSeleccionados = event.target.closest(
    ".epp-catalogo-agregar-seleccionados",
  );

  if (botonAgregarSeleccionados) {
    event.stopPropagation();

    const tarjeta = botonAgregarSeleccionados.closest(".trabajador-card");

    if (tarjeta) {
      agregarElementosSeleccionados(tarjeta, {
        elementosEpp,
        crearFilaEpp,
        valoresCalificacion,
      });
    }

    return true;
  }

  const opcionEpp = event.target.closest(".epp-combobox-opcion");

  if (opcionEpp) {
    event.stopPropagation();

    const tarjeta = opcionEpp.closest(".trabajador-card");

    if (!tarjeta) {
      return true;
    }

    const checkbox = opcionEpp.querySelector(".epp-catalogo-checkbox");

    if (!checkbox) {
      return true;
    }

    programar(() => {
      const seleccionados = obtenerSeleccionCatalogoEpp(tarjeta);

      const elementoEppId = String(checkbox.dataset.elementoEppId);

      if (checkbox.checked) {
        seleccionados.add(elementoEppId);
      } else {
        seleccionados.delete(elementoEppId);
      }

      actualizarSeleccionCatalogoEpp(tarjeta);
    }, 0);

    return true;
  }

  const botonEliminarEpp = event.target.closest('[data-action="eliminar-epp"]');

  if (botonEliminarEpp) {
    event.stopPropagation();

    const tarjeta = botonEliminarEpp.closest(".trabajador-card");

    const fila = botonEliminarEpp.closest("tr[data-elemento]");

    if (tarjeta && fila) {
      eliminarElementoEpp(tarjeta, fila, mostrarEstado);
    }

    return true;
  }

  return false;
}
