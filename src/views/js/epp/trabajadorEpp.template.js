/**
 * Construye el contenido HTML de una tarjeta de trabajador EPP.
 *
 * La plantilla recibe las filas de evaluación y el panel del catálogo
 * ya generados para no asumir responsabilidades de otros componentes.
 *
 * @param {Object} opciones Contenido que debe incorporarse.
 * @param {string} [opciones.filasEppHtml=""] Filas iniciales de evaluación.
 * @param {string} [opciones.panelCatalogoHtml=""] Panel del catálogo EPP.
 * @returns {string} Contenido HTML de la tarjeta.
 */
export function crearContenidoTrabajador({
  filasEppHtml = "",
  panelCatalogoHtml = "",
} = {}) {
  return `
  
      <!-- =====================================================
           CABECERA DEL TRABAJADOR
           Siempre permanece visible
           ===================================================== -->
  
      <div
        class="trabajador-card-header"
        data-action="toggle-trabajador"
      >
  
        <div class="trabajador-header-info">
  
          <span
            class="trabajador-toggle-icon"
            data-role="toggleIcon"
          >
            ▶
          </span>
  
          <div>
  
            <span
              class="trabajador-numero"
              data-role="numeroTrabajador"
            >
              Trabajador
            </span>
  
            <h3
              class="trabajador-nombre-resumen"
              data-role="nombreResumen"
            >
              Sin diligenciar
            </h3>
  
          </div>
  
        </div>
  
  
        <button
          type="button"
          class="btn-eliminar-trabajador"
          data-action="eliminar-trabajador"
          title="Eliminar trabajador"
        >
          Eliminar
        </button>
  
      </div>
  
  
      <!-- =====================================================
           CUERPO DEL TRABAJADOR
           TODO queda oculto cuando se minimiza
           ===================================================== -->
  
      <div class="trabajador-card-body">
  
  
        <!-- ===================================================
             DATOS DEL TRABAJADOR
             =================================================== -->
  
                       <div class="conventions">
              <span class="conventions-label">Convenciones:</span>
              <span class="convention-chip"
                ><span class="convention-code">B</span> Bueno</span
              >
              <span class="convention-chip"
                ><span class="convention-code">R</span> Regular</span
              >
              <span class="convention-chip"
                ><span class="convention-code">M</span> Malo</span
              >
              <span class="convention-chip"
                ><span class="convention-code">NA</span> No Aplica</span
              >
            </div>
  
        <div class="trabajador-datos">
  
          <div class="field">
  
            <label>
              Nombre y apellido
            </label>
  
  <input
    type="text"
    data-role="nombre"
    maxlength="100"
    autocomplete="off"
    placeholder="Nombre y apellido"
  />
  
          </div>
  
  
          <div class="field">
  
            <label>
              Código
            </label>
  
  <input
    type="text"
    data-role="codigo"
    inputmode="numeric"
    maxlength="6"
    autocomplete="off"
    placeholder="000001"
  />
  
          </div>
  
  
          <div class="field">
  
            <label>
              Labor / Cargo
            </label>
  
            <input
              type="text"
              data-role="cargo"
              autocomplete="off"
            />
  
          </div>
  
        </div>
  
  
        <!-- ===================================================
             ELEMENTOS DE PROTECCIÓN PERSONAL
             =================================================== -->
  
        <div class="trabajador-epp">
  
          <div class="trabajador-subtitulo">
            Elementos de Protección Personal
          </div>
  
          <div class="epp-table-wrap">
  
            <table class="epp-table">
  
              <thead>
  
                <tr>
  
                  <th>
                    Elemento EPP
                  </th>
  
                  <th>
                    Condición
                  </th>
  
                  <th>
                    Uso
                  </th>
  
                  <th class="epp-col-accion">
                    Acción
                  </th>
  
                </tr>
  
              </thead>
  
              <tbody>
  
${filasEppHtml}
  
              </tbody>
  
            </table>
  
          </div>
  
  
          <!-- =================================================
               GESTIÓN DE ELEMENTOS EPP
               ================================================= -->
  
          <div class="epp-gestion">
  
            <button
              type="button"
              class="add-btn btn-toggle-catalogo-epp"
            >
              + Agregar elementos EPP
            </button>
  
                ${panelCatalogoHtml}

          </div>
  
        </div>
  
  
        <!-- ===================================================
             OBSERVACIONES GENERALES DEL TRABAJADOR
             =================================================== -->
  
        <div class="trabajador-observaciones">
  
          <div class="field">
  
            <label>
              Observaciones
            </label>
  
            <textarea
              rows="2"
              data-role="observaciones"
              placeholder="Registre observaciones adicionales."
            ></textarea>
  
          </div>
  
        </div>
  
  
        <!-- ===================================================
             CONSTANCIA DEL OPERARIO
             =================================================== -->
  
        <div class="trabajador-evidencia">
  
  
          <!-- INFORMACIÓN -->
  
          <div class="evidencia-info">
  
            <div class="trabajador-subtitulo">
              Constancia del operario
            </div>
  
            <p>
              Registre una evidencia fotográfica como constancia
              de que el trabajador fue informado de la inspección.
            </p>
  
          </div>
  
  
          <!-- CONTROL DE EVIDENCIA -->
  
          <div class="evidencia-control">
  
            <label class="btn-evidencia">
  
              <svg
                class="icon-evidencia"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
  
                <path
                  d="M12 16V4"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                />
  
                <path
                  d="M7 9l5-5 5 5"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
  
                <path
                  d="M5 20h14"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                />
  
              </svg>
  
              <span>
                Seleccionar evidencia
              </span>
  
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                data-role="evidencia"
              />
  
            </label>
  
  
            <div
              class="evidencia-estado"
              data-role="evidenciaEstado"
            >
              Sin evidencia
            </div>
  
          </div>
  
        </div>
  
  
      </div>
   `;
}

