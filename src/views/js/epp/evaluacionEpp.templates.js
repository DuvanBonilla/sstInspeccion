/**
 * Construye el selector utilizado para calificar la condición
 * o el uso de un elemento EPP.
 *
 * @param {string} tipo Rol del selector dentro de la evaluación.
 * @param {string[]} valoresCalificacion Calificaciones disponibles.
 * @returns {string} HTML del selector.
 */
export function crearSelectCalificacion(
  tipo,
  valoresCalificacion,
) {
  const valores = Array.isArray(valoresCalificacion)
    ? valoresCalificacion
    : [];

  return `
      <select
        class="epp-calificacion"
        data-role="${tipo}"
      >

        <option
          value=""
          selected
          disabled
        >
          —
        </option>

        ${valores
          .map(
            (valor) => `
              <option value="${valor}">
                ${valor}
              </option>
            `,
          )
          .join("")}

      </select>
    `;
}

/**
 * Construye las filas de evaluación y plan de acción
 * correspondientes a un elemento EPP.
 *
 * @param {Object} datosElemento Información del elemento.
 * @param {string|number} [datosElemento.elementoEppId] Identificador.
 * @param {string} [datosElemento.elemento] Nombre del elemento.
 * @param {number} elementoIndex Posición del elemento.
 * @param {string[]} valoresCalificacion Calificaciones disponibles.
 * @returns {string} HTML de las filas.
 */
export function crearFilaEpp(
  datosElemento,
  elementoIndex,
  valoresCalificacion,
) {
  const elementoEppId = datosElemento?.elementoEppId || "";
  const elemento = datosElemento?.elemento || "";

  return `
    <tr
      data-epp-index="${elementoIndex}"
      data-elemento-epp-id="${elementoEppId}"
      data-elemento="${elemento}"
      class="epp-fila"
    >

      <td class="epp-nombre">
        ${elemento}
      </td>

      <td>
        ${crearSelectCalificacion(
          "condicion",
          valoresCalificacion,
        )}
      </td>

      <td>
        ${crearSelectCalificacion(
          "uso",
          valoresCalificacion,
        )}
      </td>

      <td class="epp-accion">
        <button
          type="button"
          class="btn-eliminar-epp"
          data-action="eliminar-epp"
          title="Eliminar elemento EPP"
          aria-label="Eliminar ${elemento}"
        >
          <svg
            class="icon-trash-epp"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              d="M3 6h18"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />

            <path
              d="M8 6V4h8v2"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />

            <path
              d="M19 6l-1 14H6L5 6"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />

            <path
              d="M10 11v5M14 11v5"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
        </button>
      </td>

    </tr>

    <tr
      class="epp-plan-row"
      data-elemento-epp-id="${elementoEppId}"
      data-plan-elemento="${elemento}"
      hidden
    >
      <td colspan="4">

        <div class="epp-plan-container">

          <div class="field epp-plan-field">
            <label>
              Plan de acción
              <span class="required">*</span>
            </label>

            <textarea
              data-role="epp-plan-accion"
              rows="2"
              placeholder="Describa la acción correctiva para ${elemento}."
            ></textarea>
          </div>

          <div class="field epp-fecha-field">
            <label>
              Fecha límite
              <span class="required">*</span>
            </label>

            <input
              type="date"
              data-role="epp-fecha-plan"
            >
          </div>

        </div>

      </td>
    </tr>
  `;
}