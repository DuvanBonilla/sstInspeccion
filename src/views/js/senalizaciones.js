import {
  crearBloqueEvidencias,
  inicializarBloqueEvidencias,
  leerArchivosEvidencia,
} from "/js/shared.js";

/**
 * Crea el administrador de señalizaciones de la inspección SST.
 *
 * Gestiona la creación dinámica de tarjetas, la evaluación del estado y
 * aseo, las evidencias fotográficas y la lectura de los datos registrados
 * para cada señalización.
 *
 * @param {Object} dependencias - Configuración requerida por el administrador.
 * @param {Function} dependencias.crearOpciones
 * Función que genera las opciones disponibles para las calificaciones.
 * @returns {{
 *   agregar: Function,
 *   leer: Function
 * }} Operaciones públicas del administrador de señalizaciones.
 */

export function createSenalizacionesManager({ crearOpciones }) {
  let senalizacionCounter = 0;

  function renderCondicionSenalizacion(container) {
    const body = container.querySelector(
      "[data-role='tabla-condiciones-senalizacion']",
    );

    body.innerHTML = `
    <tr>
      <td class="left">Cantidad</td>
      <td>
        <input
          name="senalizacionCantidad"
          type="number"
          min="1"
          max="1000"
          step="1"
          inputmode="numeric"
          required
        />
      </td>
    </tr>

    <tr>
      <td class="left">Estado</td>
      <td>
        <select name="senalizacionEstado">
          ${crearOpciones()}
        </select>
      </td>
    </tr>

    <tr>
      <td class="left">Aseo</td>
      <td>
        <select name="senalizacionAseo">
          ${crearOpciones()}
        </select>
      </td>
    </tr>
  `;

    const inputCantidad = body.querySelector('[name="senalizacionCantidad"]');

    inputCantidad.addEventListener("keydown", (event) => {
      const teclasPermitidas = [
        "Backspace",
        "Delete",
        "Tab",
        "ArrowLeft",
        "ArrowRight",
        "Home",
        "End",
      ];

      const esAtajo =
        (event.ctrlKey || event.metaKey) &&
        ["a", "c", "v", "x"].includes(event.key.toLowerCase());

      if (teclasPermitidas.includes(event.key) || esAtajo) {
        return;
      }

      if (!/^\d$/.test(event.key)) {
        event.preventDefault();
      }
    });

    inputCantidad.addEventListener("input", () => {
      const valorLimpio = inputCantidad.value
        .replace(/\D/g, "")
        .replace(/^0+/, "");

      if (!valorLimpio) {
        inputCantidad.value = "";
        return;
      }

      const cantidad = Number(valorLimpio);

      // Evita que el valor sea superior a 1000.
      inputCantidad.value = cantidad > 1000 ? "1000" : String(cantidad);
    });

    inputCantidad.addEventListener("paste", (event) => {
      const textoPegado = event.clipboardData.getData("text").trim();

      const cantidad = Number(textoPegado);

      if (!/^[1-9]\d*$/.test(textoPegado) || cantidad > 1000) {
        event.preventDefault();
      }
    });
  }

  function crearSenalizacionCard(index) {
    return `
      <article class="extintor-card" data-senalizacion-index="${index}">
        <div class="extintor-card-header">
          <h3 class="extintor-card-title">Señalización ${index + 1}</h3>
          <button type="button" class="remove-btn" data-action="remove-senalizacion">Eliminar</button>
        </div>

        <div class="grid">
          <div class="field">
            <label for="senalizacionTipo">Tipo de señalización</label>

            <select
              id="senalizacionTipo"
              name="senalizacionTipo"
            >
              <option value="">Seleccione</option>
              <option value="Prohibición">Prohibición</option>
              <option value="Advertencia">Advertencia</option>
              <option value="Obligatorio">Obligatorio</option>
              <option value="Emergencia">Emergencia</option>
            </select>
          </div>
          <div class="field"><label>Ubicación</label><input name="senalizacionUbicacion" type="text" /></div>
          <div class="field" style="grid-column: 1 / -1;"><label class="opcional">Observaciones</label><input name="senalizacionObservaciones" type="text" /></div>
          <div class="field" style="grid-column: 1 / -1;">
            <label>Evidencia señalización</label>
            ${crearBloqueEvidencias("senalizacion-evidencia")}
          </div>
        </div>

        <div class="conventions">
          <span class="conventions-label">Convenciones:</span>
          <span class="convention-chip"><span class="convention-code">B</span> Bueno</span>
          <span class="convention-chip"><span class="convention-code">R</span> Regular</span>
          <span class="convention-chip"><span class="convention-code">M</span> Malo</span>
          <span class="convention-chip"><span class="convention-code">NC</span> No Contiene</span>
          <span class="convention-chip"><span class="convention-code">NA</span> No Aplica</span>
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th class="left">Condición señalización</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody data-role="tabla-condiciones-senalizacion"></tbody>
          </table>
        </div>
      </article>
    `;
  }

  // El botón "Eliminar" solo tiene sentido si hay más de una tarjeta: con una
  // sola, para vaciar la sección se usa el botón "Omitir" (en inspeccion-sst.js).
  function actualizarBotonesEliminar() {
    const container = document.getElementById("senalizaciones-container");
    const cards = container.querySelectorAll("[data-senalizacion-index]");
    cards.forEach((card) => {
      card
        .querySelector('[data-action="remove-senalizacion"]')
        ?.classList.toggle("hidden", cards.length <= 1);
    });
  }

  /**
   * Agrega una nueva tarjeta de señalización al formulario.
   *
   * Genera un identificador interno, renderiza los campos de evaluación,
   * inicializa el bloque de evidencias y configura la acción utilizada
   * para eliminar la tarjeta.
   *
   * @returns {void}
   */

  function agregar() {
    const container = document.getElementById("senalizaciones-container");
    const index = senalizacionCounter++;
    container.insertAdjacentHTML("beforeend", crearSenalizacionCard(index));
    const card = container.querySelector(
      `[data-senalizacion-index="${index}"]`,
    );
    renderCondicionSenalizacion(card);
    inicializarBloqueEvidencias(card, "senalizacion-evidencia");
    card
      .querySelector('[data-action="remove-senalizacion"]')
      ?.addEventListener("click", () => {
        card.remove();
        actualizarBotonesEliminar();
      });
    actualizarBotonesEliminar();
  }

  /**
   * Obtiene la información de todas las señalizaciones registradas.
   *
   * Lee el tipo, ubicación, cantidad, estado, aseo, observaciones y nombres
   * de las evidencias asociadas con cada tarjeta.
   *
   * @returns {Array<{
   *   tipo: string,
   *   ubicacion: string,
   *   cantidad: string,
   *   estado: string,
   *   aseo: string,
   *   observaciones: string,
   *   evidenciaArchivo: string
   * }>} Señalizaciones registradas en la inspección.
   */

  function leer() {
    return Array.from(
      document.querySelectorAll("[data-senalizacion-index]"),
    ).map((card) => ({
      tipo: card.querySelector('[name="senalizacionTipo"]').value,
      ubicacion: card.querySelector('[name="senalizacionUbicacion"]').value,
      cantidad: card.querySelector('[name="senalizacionCantidad"]').value,
      estado: card.querySelector('[name="senalizacionEstado"]').value,
      aseo: card.querySelector('[name="senalizacionAseo"]').value,
      observaciones: card.querySelector('[name="senalizacionObservaciones"]')
        .value,
      evidenciaArchivo: leerArchivosEvidencia(card, "senalizacion-evidencia")
        .map((f) => f.name)
        .join(", "),
    }));
  }

  return { agregar, leer };
}
