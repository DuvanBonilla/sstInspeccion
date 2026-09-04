import {
  crearBloqueEvidencias,
  inicializarBloqueEvidencias,
  leerArchivosEvidencia,
} from "/js/shared.js";

/**
 * Crea el administrador de camillas de la inspección SST.
 *
 * Gestiona la creación dinámica de tarjetas, las condiciones evaluadas,
 * las evidencias fotográficas y la lectura de los datos registrados para
 * cada camilla.
 *
 * @param {Object} dependencias - Configuración requerida por el administrador.
 * @param {Array<Array<string>>} dependencias.condicionesCamilla
 * Lista de condiciones que deben evaluarse en cada camilla.
 * @param {Function} dependencias.crearOpciones
 * Función que genera las opciones disponibles para cada calificación.
 * @returns {{
 *   agregar: Function,
 *   leer: Function
 * }} Operaciones públicas del administrador de camillas.
 */

export function createCamillasManager({ condicionesCamilla, crearOpciones }) {
  let camillaCounter = 0;

  function renderCondicionesCamilla(camillaIndex, container) {
    const body = container.querySelector(
      "[data-role='tabla-condiciones-camilla']",
    );
    body.innerHTML = condicionesCamilla
      .map(
        ([clave, etiqueta]) => `
        <tr>
          <td class="left">${etiqueta}</td>
          <td>
            <select name="camilla-cond-${camillaIndex}-${clave}">
              ${crearOpciones()}
            </select>
          </td>
        </tr>
      `,
      )
      .join("");
  }

  function crearCamillaCard(index) {
    return `
      <article class="extintor-card" data-camilla-index="${index}">
        <div class="extintor-card-header">
          <h3 class="extintor-card-title">Camilla ${index + 1}</h3>
          <button type="button" class="remove-btn" data-action="remove-camilla">Eliminar</button>
        </div>

        <div class="grid">
          <div class="field"><label>N. de camilla</label><input name="camillaNumero" type="text" /></div>
          <div class="field"><label>Ubicación camilla</label><input name="camillaUbicacion" type="text" /></div>
          <div class="field">
            <label>Existe afectación en la productividad</label>
            <select name="camillaAfectacion">
              <option value="">Seleccione</option>
              <option value="SI">SI</option>
              <option value="NO">NO</option>
            </select>
          </div>
          <div class="field" style="grid-column: 1 / -1;"><label class="opcional">Observaciones camilla</label><input name="camillaObservaciones" type="text" /></div>
          <div class="field" style="grid-column: 1 / -1;">
            <label>Evidencia camilla</label>
            ${crearBloqueEvidencias("camilla-evidencia")}
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
                <th class="left">Condición de camilla</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody data-role="tabla-condiciones-camilla"></tbody>
          </table>
        </div>
      </article>
    `;
  }

  // El botón "Eliminar" solo tiene sentido si hay más de una tarjeta: con una
  // sola, para vaciar la sección se usa el botón "Omitir" (en inspeccion-sst.js).
  function actualizarBotonesEliminar() {
    const container = document.getElementById("camillas-container");
    const cards = container.querySelectorAll("[data-camilla-index]");
    cards.forEach((card) => {
      card
        .querySelector('[data-action="remove-camilla"]')
        ?.classList.toggle("hidden", cards.length <= 1);
    });
  }
  /**
   * Agrega una nueva tarjeta de camilla al formulario.
   *
   * Genera un identificador interno, renderiza las condiciones que deben
   * evaluarse, inicializa el bloque de evidencias y configura la acción
   * utilizada para eliminar la tarjeta.
   *
   * @returns {void}
   */

  function agregar() {
    const container = document.getElementById("camillas-container");
    const index = camillaCounter++;
    container.insertAdjacentHTML("beforeend", crearCamillaCard(index));
    const card = container.querySelector(`[data-camilla-index="${index}"]`);
    renderCondicionesCamilla(index, card);
    inicializarBloqueEvidencias(card, "camilla-evidencia");
    card
      .querySelector('[data-action="remove-camilla"]')
      ?.addEventListener("click", () => {
        card.remove();
        actualizarBotonesEliminar();
      });
    actualizarBotonesEliminar();
  }

  /**
   * Obtiene las calificaciones registradas para las condiciones de una camilla.
   *
   * Relaciona cada condición configurada en el módulo con el valor seleccionado
   * dentro de la tarjeta correspondiente.
   *
   * @param {HTMLElement} container - Tarjeta que contiene la evaluación de la camilla.
   * @returns {Object<string, string>} Condiciones evaluadas y sus calificaciones.
   */

  function leerCondicionesCamilla(container) {
    const salida = {};
    for (const [clave] of condicionesCamilla) {
      salida[clave] = container.querySelector(
        `[name^="camilla-cond-"][name$="-${clave}"]`,
      ).value;
    }
    return salida;
  }

  /**
   * Obtiene la información de todas las camillas registradas.
   *
   * Lee el número, ubicación, observaciones, afectación a la productividad,
   * nombres de las evidencias y condiciones evaluadas de cada tarjeta.
   *
   * @returns {Array<{
   *   numero: string,
   *   ubicacion: string,
   *   observaciones: string,
   *   afectacionProductividad: string,
   *   evidenciaArchivo: string,
   *   condiciones: Object<string, string>
   * }>} Camillas registradas en la inspección.
   */
  function leer() {
    return Array.from(document.querySelectorAll("[data-camilla-index]")).map(
      (card) => ({
        numero: card.querySelector('[name="camillaNumero"]').value,
        ubicacion: card.querySelector('[name="camillaUbicacion"]').value,
        observaciones: card.querySelector('[name="camillaObservaciones"]')
          .value,
        afectacionProductividad: card.querySelector(
          '[name="camillaAfectacion"]',
        ).value,
        evidenciaArchivo: leerArchivosEvidencia(card, "camilla-evidencia")
          .map((f) => f.name)
          .join(", "),
        condiciones: leerCondicionesCamilla(card),
      }),
    );
  }

  return { agregar, leer };
}
