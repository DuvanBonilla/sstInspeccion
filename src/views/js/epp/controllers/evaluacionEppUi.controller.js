/**
 * Actualiza el plan de acción asociado con una evaluación EPP.
 *
 * Configura la fecha mínima del plan, determina si debe mostrarse
 * y limpia sus campos cuando deja de ser obligatorio.
 *
 * @param {HTMLTableRowElement|null} fila Fila de evaluación EPP.
 * @param {Object} dependencias Dependencias de la evaluación.
 * @param {Function} dependencias.requierePlanAccion Regla del plan.
 * @param {string} dependencias.fechaInspeccion Fecha de inspección.
 * @returns {void}
 */
export function actualizarPlanElemento(
  fila,
  {
    requierePlanAccion,
    fechaInspeccion = "",
  },
) {
  if (!fila) {
    return;
  }

  const condicion = fila.querySelector(
    '[data-role="condicion"]',
  )?.value;

  const uso = fila.querySelector(
    '[data-role="uso"]',
  )?.value;

  const filaPlan = fila.nextElementSibling;

  if (
    !filaPlan ||
    !filaPlan.classList.contains("epp-plan-row")
  ) {
    return;
  }

  const plan = filaPlan.querySelector(
    '[data-role="epp-plan-accion"]',
  );

  const fecha = filaPlan.querySelector(
    '[data-role="epp-fecha-plan"]',
  );

  if (fecha) {
    if (fechaInspeccion) {
      fecha.min = fechaInspeccion;
    } else {
      fecha.removeAttribute("min");
    }
  }

  const mostrar = requierePlanAccion(
    condicion,
    uso,
  );

  filaPlan.hidden = !mostrar;

  if (!mostrar) {
    if (plan) {
      plan.value = "";
      plan.classList.remove("campo-error");
    }

    if (fecha) {
      fecha.value = "";
      fecha.classList.remove("campo-error");
    }
  }
}

/**
 * Atiende los cambios realizados en las calificaciones EPP.
 *
 * @param {Event} event Evento delegado desde el contenedor.
 * @param {Object} dependencias Dependencias de la evaluación.
 * @param {Function} dependencias.requierePlanAccion Regla del plan.
 * @param {Function} dependencias.obtenerFechaInspeccion Obtiene la fecha.
 * @returns {boolean} `true` si se procesó una calificación EPP.
 */
export function manejarCambioCalificacionEpp(
  event,
  {
    requierePlanAccion,
    obtenerFechaInspeccion,
  },
) {
  const select = event.target.closest(
    ".epp-calificacion",
  );

  if (!select) {
    return false;
  }

  const fila = select.closest(
    "tr[data-elemento]",
  );

  if (!fila) {
    return false;
  }

  actualizarPlanElemento(fila, {
    requierePlanAccion,
    fechaInspeccion:
      obtenerFechaInspeccion?.() || "",
  });

  return true;
}