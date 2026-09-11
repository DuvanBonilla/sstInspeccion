/**
 * Lee el valor de un campo y elimina espacios externos.
 *
 * @param {Object} elemento Elemento que contiene los campos.
 * @param {string} selector Selector del campo.
 * @returns {string} Valor normalizado.
 */
function leerValor(elemento, selector) {
  const valor = elemento?.querySelector(selector)?.value;

  return typeof valor === "string" ? valor.trim() : "";
}

/**
 * Lee una evaluación EPP desde su fila.
 *
 * @param {HTMLTableRowElement} fila Fila de evaluación.
 * @param {number} elementoIndex Posición del elemento.
 * @returns {Object} Evaluación estructurada.
 */
export function leerElementoEpp(fila, elementoIndex) {
  const elementoEppId = fila.dataset.elementoEppId
    ? Number(fila.dataset.elementoEppId)
    : null;

  const elemento =
    fila.dataset.elemento ||
    fila.querySelector(".epp-nombre")?.textContent?.trim() ||
    "";

  const condicion = leerValor(
    fila,
    '[data-role="condicion"]',
  );

  const uso = leerValor(
    fila,
    '[data-role="uso"]',
  );

  const filaPlan = fila.nextElementSibling;

  const esFilaPlan =
    filaPlan?.classList.contains("epp-plan-row") || false;

  const planAccion = esFilaPlan
    ? leerValor(filaPlan, '[data-role="epp-plan-accion"]')
    : "";

  const fechaPlanAccion = esFilaPlan
    ? leerValor(filaPlan, '[data-role="epp-fecha-plan"]')
    : "";

  return {
    indice: elementoIndex,
    elementoEppId,
    elemento,
    condicion,
    uso,
    planAccion,
    fechaPlanAccion,
  };
}

/**
 * Lee los datos y evaluaciones de un trabajador.
 *
 * @param {HTMLElement} tarjeta Tarjeta del trabajador.
 * @param {number} trabajadorIndex Posición del trabajador.
 * @returns {Object} Trabajador estructurado.
 */
export function leerTrabajadorEpp(
  tarjeta,
  trabajadorIndex,
) {
  const filasEpp = tarjeta.querySelectorAll(
    "tr[data-elemento]",
  );

  const elementos = Array.from(filasEpp).map(
    leerElementoEpp,
  );

  return {
    trabajadorId: Number(tarjeta.dataset.trabajadorId),
    indice: trabajadorIndex,
    nombre: leerValor(tarjeta, '[data-role="nombre"]'),
    codigo: leerValor(tarjeta, '[data-role="codigo"]'),
    cargo: leerValor(tarjeta, '[data-role="cargo"]'),
    elementos,
    observaciones: leerValor(
      tarjeta,
      '[data-role="observaciones"]',
    ),
  };
}

/**
 * Lee todos los trabajadores existentes en el contenedor.
 *
 * @param {HTMLElement} container Contenedor de trabajadores.
 * @returns {Array<Object>} Trabajadores estructurados.
 */
export function leerTrabajadoresEpp(container) {
  const tarjetas = container.querySelectorAll(
    ".trabajador-card",
  );

  return Array.from(tarjetas).map(leerTrabajadorEpp);
}

/**
 * Relaciona las evidencias procesadas con los trabajadores.
 *
 * @param {HTMLElement} container Contenedor de trabajadores.
 * @param {Map<number, File>} evidencias Evidencias procesadas.
 * @returns {Array<Object>} Evidencias disponibles.
 */
export function obtenerEvidenciasTrabajadoresEpp(
  container,
  evidencias,
) {
  const tarjetas = container.querySelectorAll(
    ".trabajador-card",
  );

  return Array.from(tarjetas)
    .map((tarjeta, indice) => {
      const trabajadorId = Number(
        tarjeta.dataset.trabajadorId,
      );

      const archivo = evidencias.get(trabajadorId);

      if (!archivo) {
        return null;
      }

      return {
        trabajadorId,
        indice,
        archivo,
      };
    })
    .filter(Boolean);
}