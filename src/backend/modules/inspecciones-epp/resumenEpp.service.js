
/**
 * Calcula el resumen general de una inspección EPP.
 *
 * Recorre los trabajadores y sus elementos evaluados para determinar el total
 * de evaluaciones y novedades. Una evaluación se considera novedad cuando la
 * condición o el uso del elemento tiene una calificación `M` o `R`.
 *
 * Un trabajador se clasifica con novedad cuando al menos uno de sus elementos
 * cumple el criterio anterior.
 *
 * @param {Array<Object>} [trabajadores=[]] Trabajadores incluidos en la inspección.
 * @param {Array<Object>} [trabajadores[].elementos] Elementos EPP evaluados.
 * @returns {{
 *   totalTrabajadores: number,
 *   totalEvaluaciones: number,
 *   totalNovedades: number,
 *   trabajadoresConNovedad: number,
 *   trabajadoresSinNovedad: number
 * }} Resumen cuantitativo de la inspección EPP.
 */

function calcularResumenEpp(trabajadores = []) {
  const listaTrabajadores = Array.isArray(trabajadores)
    ? trabajadores
    : [];

  let totalEvaluaciones = 0;
  let totalNovedades = 0;
  let trabajadoresConNovedad = 0;

  for (const trabajador of listaTrabajadores) {
    const elementos = Array.isArray(trabajador?.elementos)
      ? trabajador.elementos
      : [];

    totalEvaluaciones += elementos.length;

    const novedadesTrabajador = elementos.filter((elemento) => {
      const condicion = String(elemento?.condicion || "").toUpperCase();
      const uso = String(elemento?.uso || "").toUpperCase();

      return (
        condicion === "M" ||
        condicion === "R" ||
        uso === "M" ||
        uso === "R"
      );
    }).length;

    totalNovedades += novedadesTrabajador;

    if (novedadesTrabajador > 0) {
      trabajadoresConNovedad++;
    }
  }

  const totalTrabajadores = listaTrabajadores.length;

  return {
    totalTrabajadores,
    totalEvaluaciones,
    totalNovedades,
    trabajadoresConNovedad,
    trabajadoresSinNovedad:
      totalTrabajadores - trabajadoresConNovedad,
  };
}

module.exports = {
  calcularResumenEpp,
};