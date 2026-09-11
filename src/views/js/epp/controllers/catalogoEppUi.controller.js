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