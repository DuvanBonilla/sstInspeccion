import {
  crearBloqueEvidencias,
  inicializarBloqueEvidencias,
  leerArchivosEvidencia,
} from "/js/shared.js";

/**
 * Crea el administrador de extintores de la inspección SST.
 *
 * Gestiona la creación dinámica de tarjetas, las condiciones evaluadas,
 * las evidencias fotográficas y la lectura de la información registrada
 * para cada extintor.
 *
 * @param {Object} dependencias - Configuración requerida por el administrador.
 * @param {Array<Array<string>>} dependencias.condiciones
 * Lista de condiciones que deben evaluarse.
 * @param {Function} dependencias.crearOpciones
 * Función que genera las opciones disponibles para cada calificación.
 * @param {string} dependencias.tipoOptionsHtml
 * Opciones HTML disponibles para seleccionar el tipo de extintor.
 * @returns {{
 *   agregar: Function,
 *   leer: Function
 * }} Operaciones públicas del administrador de extintores.
 */

export function createExtintoresManager({
  condiciones,
  crearOpciones,
  tipoOptionsHtml,
}) {
  let extintorCounter = 0;

  function renderCondiciones(extintorIndex, container) {
    const body = container.querySelector("[data-role='tabla-condiciones']");
    body.innerHTML = condiciones
      .map(
        ([clave, etiqueta]) => `
        <tr>
          <td class="left">${etiqueta}</td>
          <td>
            <select name="cond-${extintorIndex}-${clave}">
              ${crearOpciones()}
            </select>
          </td>
        </tr>
      `,
      )
      .join("");
  }

  function crearExtintorCard(index) {
    return `
      <article class="extintor-card" data-extintor-index="${index}">
        <div class="extintor-card-header">
          <h3 class="extintor-card-title">Extintor ${index + 1}</h3>
          <button type="button" class="remove-btn" data-action="remove-extintor">Eliminar</button>
        </div>

        <div class="grid">
          <div class="field"><label>No extintor</label><input name="numero" type="text" placeholder="EXT-001" /></div>
          <div class="field"><label>Ubicación / Área</label><input name="ubicacion" type="text" /></div>
          <div class="field">
            <label>Tipo</label>
            <select name="tipo">
              ${tipoOptionsHtml}
            </select>
          </div>
          <div class="field">
            <label>Capacidad</label>
            <input name="capacidad" type="text" list="capacidades-extintor-${index}" placeholder="Seleccione o escriba" />
            <datalist id="capacidades-extintor-${index}">
              <option value="1 kg / 2.5 lb"></option>
              <option value="2 kg / 5 lb"></option>
              <option value="4.5 kg / 10 lb"></option>
              <option value="9 kg / 20 lb"></option>
              <option value="11.3 kg / 25 lb"></option>
              <option value="50 kg / 150 lb (Satelital)"></option>
            </datalist>
          </div>
          <div class="field"><label>Próxima recarga (Mes/Año)</label><input name="proximaRecarga" type="month" /></div>
          <div class="field" style="grid-column: 1 / -1;"><label class="opcional">Observaciones</label><input name="observaciones" type="text" /></div>
          <div class="field" style="grid-column: 1 / -1;">
            <label>Evidencias</label>
            ${crearBloqueEvidencias("evidencia")}
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
                <th class="left">Condición del extintor</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody data-role="tabla-condiciones"></tbody>
          </table>
        </div>
      </article>
    `;
  }

  // El botón "Eliminar" solo tiene sentido si hay más de una tarjeta: con una
  // sola, para vaciar la sección se usa el botón "Omitir" (en inspeccion-sst.js).
  function actualizarBotonesEliminar() {
    const container = document.getElementById("extintores-container");
    const cards = container.querySelectorAll("[data-extintor-index]");
    cards.forEach((card) => {
      card
        .querySelector('[data-action="remove-extintor"]')
        ?.classList.toggle("hidden", cards.length <= 1);
    });
  }

  /**
   * Agrega una nueva tarjeta de extintor al formulario.
   *
   * Genera un identificador interno, renderiza las condiciones que deben
   * evaluarse, inicializa el bloque de evidencias y configura la acción
   * utilizada para eliminar la tarjeta.
   *
   * @returns {void}
   */
  function agregar() {
    const container = document.getElementById("extintores-container");
    const index = extintorCounter++;
    container.insertAdjacentHTML("beforeend", crearExtintorCard(index));
    const card = container.querySelector(`[data-extintor-index="${index}"]`);
    renderCondiciones(index, card);
    inicializarBloqueEvidencias(card, "evidencia");
    card
      .querySelector('[data-action="remove-extintor"]')
      ?.addEventListener("click", () => {
        card.remove();
        actualizarBotonesEliminar();
      });
    actualizarBotonesEliminar();
  }

  /**
   * Obtiene las calificaciones registradas para las condiciones de un extintor.
   *
   * Relaciona cada condición configurada en el módulo con el valor seleccionado
   * por el usuario dentro de la tarjeta correspondiente.
   *
   * @param {HTMLElement} container - Tarjeta del extintor que contiene las condiciones.
   * @returns {Object<string, string>} Condiciones evaluadas y sus calificaciones.
   */
  function leerCondiciones(container) {
    const salida = {};
    for (const [clave] of condiciones) {
      salida[clave] = container.querySelector(
        `[name^="cond-"][name$="-${clave}"]`,
      ).value;
    }
    return salida;
  }

  /**
   * Obtiene la información de todos los extintores registrados.
   *
   * Lee los datos generales, la fecha de próxima recarga, las observaciones,
   * los nombres de las evidencias y las condiciones evaluadas de cada tarjeta.
   *
   * @returns {Array<{
   *   numero: string,
   *   ubicacion: string,
   *   tipo: string,
   *   capacidad: string,
   *   mesRecarga: string,
   *   anioRecarga: string,
   *   observaciones: string,
   *   evidenciaArchivo: string,
   *   condiciones: Object<string, string>
   * }>} Extintores registrados en la inspección.
   */

  function leer() {
    return Array.from(document.querySelectorAll("[data-extintor-index]")).map(
      (card) => {
        const proximaRecarga = card.querySelector(
          '[name="proximaRecarga"]',
        ).value;
        const [anioRecarga = "", mesRecarga = ""] = proximaRecarga
          ? proximaRecarga.split("-")
          : [];
        return {
          numero: card.querySelector('[name="numero"]').value,
          ubicacion: card.querySelector('[name="ubicacion"]').value,
          tipo: card.querySelector('[name="tipo"]').value,
          capacidad: card.querySelector('[name="capacidad"]').value,
          mesRecarga,
          anioRecarga,
          observaciones: card.querySelector('[name="observaciones"]').value,
          evidenciaArchivo: leerArchivosEvidencia(card, "evidencia")
            .map((f) => f.name)
            .join(", "),
          condiciones: leerCondiciones(card),
        };
      },
    );
  }

  return { agregar, leer };
}
