/**
 * Actualiza el nombre mostrado en el resumen de un trabajador.
 *
 * @param {HTMLInputElement|null} input Campo de nombre.
 * @returns {boolean} Indica si el resumen fue actualizado.
 */
export function actualizarNombreResumen(input) {
  const tarjeta = input?.closest(
    ".trabajador-card",
  );

  if (!tarjeta) {
    return false;
  }

  const resumen = tarjeta.querySelector(
    '[data-role="nombreResumen"]',
  );

  if (!resumen) {
    return false;
  }

  const nombre = input.value.trim();

  resumen.textContent =
    nombre || "Sin diligenciar";

  return true;
}

/**
 * Actualiza la numeración visual de las tarjetas.
 *
 * @param {HTMLElement|null} container Contenedor de trabajadores.
 * @returns {number} Cantidad actual de tarjetas.
 */
export function actualizarNumeracion(container) {
  if (!container) {
    return 0;
  }

  const tarjetas = container.querySelectorAll(
    ".trabajador-card",
  );

  tarjetas.forEach((tarjeta, indice) => {
    const numero = tarjeta.querySelector(
      '[data-role="numeroTrabajador"]',
    );

    if (numero) {
      numero.textContent =
        `Trabajador ${indice + 1}`;
    }
  });

  return tarjetas.length;
}

/**
 * Abre una tarjeta y minimiza las demás.
 *
 * @param {HTMLElement|null} container Contenedor de trabajadores.
 * @param {HTMLElement|null} tarjeta Tarjeta que debe abrirse.
 * @returns {boolean} Indica si se actualizó la interfaz.
 */
export function abrirTrabajador(
  container,
  tarjeta,
) {
  if (!container || !tarjeta) {
    return false;
  }

  const tarjetas = container.querySelectorAll(
    ".trabajador-card",
  );

  tarjetas.forEach((item) => {
    const icono = item.querySelector(
      '[data-role="toggleIcon"]',
    );

    if (item === tarjeta) {
      item.classList.remove(
        "trabajador-collapsed",
      );

      if (icono) {
        icono.textContent = "▼";
      }
    } else {
      item.classList.add(
        "trabajador-collapsed",
      );

      if (icono) {
        icono.textContent = "▶";
      }
    }
  });

  return true;
}

/**
 * Construye la tarjeta visual de un trabajador EPP.
 *
 * @param {Object} opciones Datos y dependencias de construcción.
 * @param {Document} opciones.documento Documento utilizado para crear la tarjeta.
 * @param {number} opciones.trabajadorId Identificador interno.
 * @param {Array<Object>} opciones.elementosPredeterminados Elementos iniciales.
 * @param {Function} opciones.crearFilaEpp Generador de filas EPP.
 * @param {Array<string>} opciones.valoresCalificacion Calificaciones permitidas.
 * @param {Function} opciones.crearPanelCatalogoEpp Generador del catálogo.
 * @param {Function} opciones.crearContenidoTrabajador Generador del contenido.
 * @returns {HTMLElement} Tarjeta construida.
 */
export function crearTrabajador({
  documento,
  trabajadorId,
  elementosPredeterminados,
  crearFilaEpp,
  valoresCalificacion,
  crearPanelCatalogoEpp,
  crearContenidoTrabajador,
}) {
  const card = documento.createElement(
    "article",
  );

  card.className = "trabajador-card";
  card.dataset.trabajadorId = trabajadorId;

  const filasEppHtml =
    elementosPredeterminados
      .map((elemento, elementoIndex) =>
        crearFilaEpp(
          elemento,
          elementoIndex,
          valoresCalificacion,
        ),
      )
      .join("");

  const panelCatalogoHtml =
    crearPanelCatalogoEpp();

  card.innerHTML =
    crearContenidoTrabajador({
      filasEppHtml,
      panelCatalogoHtml,
    });

  card.classList.add(
    "trabajador-collapsed",
  );

  return card;
}