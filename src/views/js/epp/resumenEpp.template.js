/**
 * Escapa un valor antes de incorporarlo a una plantilla HTML.
 *
 * @param {unknown} valor Valor que será representado.
 * @returns {string} Texto seguro para HTML.
 */
export function escaparHtml(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/**
 * Crea la plantilla de resumen de un trabajador.
 *
 * @param {Object} parametros Datos utilizados por la plantilla.
 * @param {Object} parametros.trabajador Trabajador representado.
 * @param {number} parametros.cantidadNovedades Cantidad de novedades.
 * @param {boolean} parametros.tieneEvidencia Estado de la evidencia.
 * @returns {string} Contenido HTML de la tarjeta.
 */
export function crearResumenTrabajadorHtml({
  trabajador,
  cantidadNovedades,
  tieneEvidencia,
}) {
  return `
    <div class="resumen-trabajador-header">

      <div>

        <strong>
          Trabajador ${trabajador.indice + 1}
        </strong>

        <span class="resumen-trabajador-nombre">
          ${escaparHtml(trabajador.nombre)}
        </span>

      </div>

      <span class="resumen-estado">
        Completo
      </span>

    </div>


    <div class="resumen-trabajador-grid">

      <div>
        <span class="resumen-label">
          Código
        </span>

        <strong>
          ${escaparHtml(trabajador.codigo)}
        </strong>
      </div>


      <div>
        <span class="resumen-label">
          Labor / Cargo
        </span>

        <strong>
          ${escaparHtml(trabajador.cargo)}
        </strong>
      </div>


      <div>
        <span class="resumen-label">
          EPP evaluados
        </span>

        <strong>
          ${trabajador.elementos.length}
        </strong>
      </div>


      <div>
        <span class="resumen-label">
          Novedades
        </span>

        <strong>
          ${cantidadNovedades}
        </strong>
      </div>


      <div>
        <span class="resumen-label">
          Plan de acción
        </span>

        <strong>
          ${trabajador.planAccion
            ? "Registrado"
            : "No requerido"}
        </strong>
      </div>


      <div>
        <span class="resumen-label">
          Evidencia
        </span>

        <strong>
          ${tieneEvidencia
            ? "Registrada"
            : "Sin evidencia"}
        </strong>
      </div>

    </div>
  `;
}