/**
 * Calificaciones permitidas para la evaluación de elementos EPP.
 */
export const VALORES_CALIFICACION = Object.freeze([
  "B",
  "R",
  "M",
  "NA",
]);

/**
 * Determina si una evaluación EPP contiene una novedad.
 *
 * Una evaluación tiene novedad cuando la condición o el uso
 * está calificado como regular (R) o malo (M).
 *
 * @param {string} condicion Calificación de la condición.
 * @param {string} uso Calificación del uso.
 * @returns {boolean} `true` cuando existe una novedad.
 */
export function esNovedadEpp(condicion, uso) {
  return (
    condicion === "R" ||
    condicion === "M" ||
    uso === "R" ||
    uso === "M"
  );
}

/**
 * Determina si un elemento EPP requiere plan de acción.
 *
 * Mantiene el comportamiento actual del formulario: la regla
 * solo se evalúa cuando condición y uso tienen valor.
 *
 * @param {string} condicion Calificación de la condición.
 * @param {string} uso Calificación del uso.
 * @returns {boolean} `true` cuando debe registrarse un plan.
 */
export function requierePlanAccion(condicion, uso) {
  if (!condicion || !uso) {
    return false;
  }

  return esNovedadEpp(condicion, uso);
}