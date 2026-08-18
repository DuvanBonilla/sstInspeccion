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