/**
 * Crea el controlador del resumen de una inspección EPP.
 *
 * @param {Object} dependencias Dependencias necesarias.
 * @returns {Object} API para construir el resumen.
 */
export function crearResumenInspeccionEpp({
  documento = document,
  obtenerValor,
  leerTrabajadores,
  obtenerEvidencias,
  esNovedadEpp,
  crearResumenTrabajadorHtml,
} = {}) {
  function asignarTextoResumen(
    id,
    valor,
  ) {
    const elemento =
      documento.getElementById(id);

    if (!elemento) {
      return;
    }

    elemento.textContent = valor || "—";
  }

  function construirResumenGeneral() {
    asignarTextoResumen(
      "resumen-fecha",
      obtenerValor("fecha"),
    );

    asignarTextoResumen(
      "resumen-sede",
      obtenerValor("sedeOperacion"),
    );

    asignarTextoResumen(
      "resumen-area",
      obtenerValor("areaTrabajo"),
    );

    asignarTextoResumen(
      "resumen-jefe",
      obtenerValor("jefeResponsable"),
    );

    asignarTextoResumen(
      "resumen-cargo-jefe",
      obtenerValor("cargoJefe"),
    );

    asignarTextoResumen(
      "resumen-responsable",
      obtenerValor(
        "responsableInspeccion",
      ),
    );

    asignarTextoResumen(
      "resumen-cargo-responsable",
      obtenerValor("cargoResponsable"),
    );
  }

  function construirResumenTrabajadores() {
    const trabajadores =
      leerTrabajadores();

    const evidencias =
      obtenerEvidencias();

    const container =
      documento.getElementById(
        "resumen-trabajadores",
      );

    if (!container) {
      return;
    }

    container.innerHTML = "";

    let totalNovedades = 0;
    let trabajadoresConNovedades = 0;

    trabajadores.forEach(
      (trabajador) => {
        const novedades =
          trabajador.elementos.filter(
            (elemento) =>
              esNovedadEpp(
                elemento.condicion,
                elemento.uso,
              ),
          );

        if (novedades.length > 0) {
          trabajadoresConNovedades++;
        }

        totalNovedades +=
          novedades.length;

        const tieneEvidencia =
          evidencias.some(
            (evidencia) =>
              evidencia.trabajadorId ===
              trabajador.trabajadorId,
          );

        const card =
          documento.createElement("div");

        card.className =
          "resumen-trabajador-card";

        card.innerHTML =
          crearResumenTrabajadorHtml({
            trabajador,
            cantidadNovedades:
              novedades.length,
            tieneEvidencia,
          });

        container.appendChild(card);
      },
    );

    asignarTextoResumen(
      "resumen-total-trabajadores",
      trabajadores.length,
    );

    asignarTextoResumen(
      "resumen-trabajadores-novedad",
      trabajadoresConNovedades,
    );

    asignarTextoResumen(
      "resumen-trabajadores-sin-novedad",
      trabajadores.length -
        trabajadoresConNovedades,
    );

    asignarTextoResumen(
      "resumen-total-novedades",
      totalNovedades,
    );
  }

  function construir() {
    construirResumenGeneral();
    construirResumenTrabajadores();
  }

  return {
    construir,
    construirResumenGeneral,
    construirResumenTrabajadores,
  };
}