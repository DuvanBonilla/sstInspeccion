/**
 * Construye el panel utilizado para buscar y seleccionar
 * elementos del catálogo EPP.
 *
 * @returns {string} HTML del panel.
 */
export function crearPanelCatalogoEpp() {
  return `
    <div class="epp-catalogo-panel" hidden>

      <div class="epp-combobox">

        <div class="epp-buscador-wrapper">

          <svg
            class="epp-buscador-icono"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              cx="11"
              cy="11"
              r="7"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            ></circle>

            <path
              d="M16 16l5 5"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            ></path>
          </svg>

          <input
            type="text"
            class="epp-catalogo-buscador"
            name="epp-catalogo-buscador"
            placeholder="Buscar elemento EPP..."
            autocomplete="off"
            aria-label="Buscar elemento EPP"
          >

        </div>

        <div
          class="epp-catalogo-resultados"
          hidden
        ></div>

        <div class="epp-catalogo-acciones" hidden>

          <span class="epp-catalogo-contador">
            0 elementos seleccionados
          </span>

          <button
            type="button"
            class="epp-catalogo-agregar-seleccionados"
            disabled
          >
            Agregar seleccionados (0)
          </button>

        </div>

      </div>

    </div>
  `;
}

/**
 * Construye el mensaje mostrado cuando la búsqueda
 * no devuelve elementos disponibles.
 *
 * @returns {string} HTML del mensaje.
 */
export function crearMensajeCatalogoSinResultados() {
  return `
      <div class="epp-combobox-sin-resultados">
        No se encontraron elementos EPP disponibles.
      </div>
    `;
}

/**
 * Construye las opciones encontradas en el catálogo EPP.
 *
 * @param {Array} elementos Elementos que deben mostrarse.
 * @param {Set<string>} seleccionados Identificadores seleccionados.
 * @returns {string} HTML de las opciones.
 */
export function crearOpcionesCatalogoEpp(
  elementos,
  seleccionados,
) {
  return elementos
    .map(
      (elemento) => `
      <label
        class="epp-combobox-opcion"
        data-elemento-epp-id="${elemento.id}"
      >
        <input
          type="checkbox"
          class="epp-catalogo-checkbox"
          data-elemento-epp-id="${elemento.id}"
          data-elemento="${elemento.nombre}"
          ${
            seleccionados.has(String(elemento.id))
              ? "checked"
              : ""
          }
        >

        <span class="epp-combobox-opcion-nombre">
          ${elemento.nombre}
        </span>

        <span class="epp-combobox-opcion-info">
          ${elemento.categoria || "EPP"}
        </span>
      </label>
    `,
    )
    .join("");
}