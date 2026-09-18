/**
 * Organiza los elementos del catálogo EPP según su configuración.
 *
 * Este módulo transforma datos del catálogo. No realiza solicitudes HTTP,
 * no mantiene estado global y no manipula elementos del DOM.
 *
 * @param {Array} elementos Elementos recibidos desde el catálogo.
 * @returns {{
 *   todos: Array,
 *   predeterminados: Array,
 *   otros: Array
 * }} Catálogo clasificado.
 */
export function clasificarCatalogoEpp(elementos) {
  const todos = [...elementos];

  const predeterminados = todos.filter(
    (elemento) => elemento.predeterminado === true,
  );

  const otros = todos.filter(
    (elemento) => elemento.predeterminado !== true,
  );

  return {
    todos,
    predeterminados,
    otros,
  };
}

/**
 * Adapta los elementos predeterminados al formato utilizado
 * para construir las filas de evaluación EPP.
 *
 * @param {Array} elementos Elementos predeterminados.
 * @returns {Array<{
 *   elementoEppId: number|string,
 *   elemento: string,
 *   categoria: string
 * }>} Elementos preparados para la interfaz.
 */
export function prepararElementosPredeterminadosEpp(
  elementos,
) {
  return elementos.map((elemento) => ({
    elementoEppId: elemento.id,
    elemento: elemento.nombre,
    categoria: elemento.categoria,
  }));
}