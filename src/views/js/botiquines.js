import {
  crearBloqueEvidencias,
  inicializarBloqueEvidencias,
  leerArchivosEvidencia,
} from "/js/shared.js";

/**
 * Crea el administrador de botiquines de la inspección SST.
 *
 * Gestiona la creación de botiquines, la evaluación de sus insumos,
 * la aplicación de reglas de intervención, las evidencias y la lectura
 * de la información registrada.
 *
 * @param {Object} dependencias - Configuración requerida por el administrador.
 * @param {Array<Array<*>>} dependencias.itemsBotiquin
 * Lista de insumos, cantidades ideales y configuración de vencimiento.
 * @param {Function} dependencias.crearOpciones
 * Función que genera las opciones disponibles para las calificaciones.
 * @returns {{
 *   agregar: Function,
 *   leer: Function
 * }} Operaciones públicas del administrador de botiquines.
 */

export function createBotiquinesManager({ itemsBotiquin, crearOpciones }) {
  let botiquinCounter = 0;

  function crearBotiquinCard(index) {
    const filasItems = itemsBotiquin
      .map(
        ([, etiqueta, cantIdeal, tieneVencimiento], itemIndex) => `
      <tr>
        <td class="center">${itemIndex + 1}</td>
        <td class="left">${etiqueta}</td>
        <td><input name="botiquin-${index}-item-${itemIndex}-cantidadIdeal" type="text" inputmode="numeric" pattern="[0-9]*" value="${cantIdeal}" readonly /></td>
        <td><input name="botiquin-${index}-item-${itemIndex}-cantidadReal" type="text" inputmode="numeric" pattern="[0-9]*" /></td>
        <td>
          <select name="botiquin-${index}-item-${itemIndex}-integridad">
            ${crearOpciones()}
          </select>
        </td>
        <td>
          <div class="fecha-venc-wrap">
            <input name="botiquin-${index}-item-${itemIndex}-fechaVencimiento" type="date" ${!tieneVencimiento ? 'disabled class="campo-deshabilitado"' : ""} />
            <label class="toggle-na-label" title="Marcar si no aplica fecha de vencimiento">
              <input type="checkbox" class="toggle-vencimiento" ${!tieneVencimiento ? "checked" : ""} />
              <span>N/A</span>
            </label>
          </div>
        </td>
        <td>
          <select name="botiquin-${index}-item-${itemIndex}-planIntervencion">
            <option value="">Seleccione</option>
            <option value="Reposición">Reposición</option>
            <option value="Mantenimiento">Mantenimiento</option>
            <option value="Ninguna">Ninguna</option>
          </select>
        </td>
        <td><input name="botiquin-${index}-item-${itemIndex}-fechaIntervencion" type="date" data-campo-condicional /></td>
        <td>
          <select name="botiquin-${index}-item-${itemIndex}-cumplimiento" data-campo-condicional>
            <option value="">Seleccione</option>
            <option value="Sí">Sí</option>
            <option value="No">No</option>
          </select>
        </td>
        <td>
          <select name="botiquin-${index}-item-${itemIndex}-afectacion" data-campo-condicional>
            <option value="">Seleccione</option>
            <option value="Sí">Sí</option>
            <option value="No">No</option>
          </select>
        </td>
      </tr>
    `,
      )
      .join("");

    return `
      <article class="extintor-card" data-botiquin-index="${index}">
        <div class="extintor-card-header">
          <h3 class="extintor-card-title">Botiquín ${index + 1}</h3>
          <button type="button" class="remove-btn" data-action="remove-botiquin">Eliminar</button>
        </div>

        <div class="grid">
          <div class="field"><label>N. de botiquín</label><input name="botiquin-${index}-numero" type="text" /></div>
          <div class="field"><label>Ubicación botiquín</label><input name="botiquin-${index}-ubicacion" type="text" /></div>
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
          <table class="botiquin-table">
            <thead>
              <tr>
                <th class="col-no">No.</th>
                <th class="left col-item">Ítem</th>
                <th class="col-num">Ideal</th>
                <th class="col-num">Real</th>
                <th class="col-sel">Integridad</th>
                <th class="col-date">Vencimiento</th>
                <th class="col-sel">Plan</th>
                <th class="col-date">F. Intervención</th>
                <th class="col-sel">Cumplim.</th>
                <th class="col-sel">Afectación</th>
              </tr>
            </thead>
            <tbody>
              ${filasItems}
            </tbody>
          </table>
        </div>

        <div class="grid" style="margin-top: 12px;">
          <div class="field" style="grid-column: 1 / -1;">
            <label class="opcional">Observación general del botiquín</label>
            <input name="botiquin-${index}-observacionGeneral" type="text" />
          </div>
          <div class="field" style="grid-column: 1 / -1;">
            <label>Evidencia general del botiquín</label>
            ${crearBloqueEvidencias("botiquin-evidencia")}
          </div>
        </div>
      </article>
    `;
  }

  /**
   * Actualiza los campos condicionales de acuerdo con el plan de intervención.
   *
   * Cuando el plan seleccionado es `Ninguna`, deshabilita y limpia la fecha
   * de intervención, el cumplimiento y la afectación al servicio de la fila.
   *
   * @param {HTMLTableRowElement} tr - Fila correspondiente al insumo evaluado.
   * @returns {void}
   */

  function aplicarLogicaPlan(tr) {
    const plan = tr.querySelector('[name$="-planIntervencion"]');
    if (!plan) return;

    const bloquear = plan.value === "Ninguna";

    tr.querySelectorAll("[data-campo-condicional]").forEach((el) => {
      el.disabled = bloquear;
      el.classList.toggle("campo-deshabilitado", bloquear);

      if (bloquear) {
        el.value = el.tagName === "SELECT" ? "No" : "";
      }
    });
  }

  /**
   * Evalúa si un insumo del botiquín requiere intervención.
   *
   * Compara la cantidad real con la cantidad ideal y analiza la integridad
   * del empaque. Cuando el insumo cumple las condiciones, establece que no
   * requiere intervención y deshabilita los campos relacionados.
   *
   * @param {HTMLTableRowElement} tr - Fila correspondiente al insumo evaluado.
   * @returns {void}
   */

  function aplicarLogicaFila(tr) {
    const ideal =
      Number(tr.querySelector('[name$="-cantidadIdeal"]').value) || 0;

    const realInput = tr.querySelector('[name$="-cantidadReal"]');

    const integridadSelect = tr.querySelector('[name$="-integridad"]');

    const realVal = realInput?.value ?? "";
    const integridad = integridadSelect?.value ?? "";

    if (realVal === "") return;

    const cantidadCumple = Number(realVal) >= ideal;

    const integridadCierraFila =
      integridad === "B" || integridad === "NA" || integridad === "NC";

    const cumple = cantidadCumple && integridadCierraFila;

    // F. Intervención, Cumplimiento, Afectación
    tr.querySelectorAll("[data-campo-condicional]").forEach((el) => {
      el.disabled = cumple;

      if (cumple) {
        el.value = el.tagName === "SELECT" ? "No" : "";
      }

      el.classList.toggle("campo-deshabilitado", cumple);
    });

    // Plan de intervención
    const plan = tr.querySelector('[name$="-planIntervencion"]');

    if (plan) {
      if (cumple) {
        plan.value = "Ninguna";
        plan.disabled = true;
        plan.classList.add("campo-deshabilitado");
      } else {
        plan.disabled = false;
        plan.classList.remove("campo-deshabilitado");

        if (plan.value === "Ninguna") {
          plan.value = "";
        }
      }
    }
  }
  // El botón "Eliminar" solo tiene sentido si hay más de una tarjeta: con una
  // sola, para vaciar la sección se usa el botón "Omitir" (en inspeccion-sst.js).
  function actualizarBotonesEliminar() {
    const container = document.getElementById("botiquines-container");
    const cards = container.querySelectorAll("[data-botiquin-index]");
    cards.forEach((card) => {
      card
        .querySelector('[data-action="remove-botiquin"]')
        ?.classList.toggle("hidden", cards.length <= 1);
    });
  }

  /**
   * Agrega un nuevo botiquín al formulario.
   *
   * Genera la tarjeta con sus insumos, configura las reglas dinámicas para
   * cantidades, integridad, vencimiento y planes de intervención, inicializa
   * las evidencias y registra la acción para eliminar el botiquín.
   *
   * @returns {void}
   */

  function agregar() {
    const container = document.getElementById("botiquines-container");
    const index = botiquinCounter++;
    container.insertAdjacentHTML("beforeend", crearBotiquinCard(index));
    const card = container.querySelector(`[data-botiquin-index="${index}"]`);

    card.querySelectorAll("tbody tr").forEach((tr) => {
      // Reevaluar la fila cuando cambia la cantidad real
      tr.querySelector('[name$="-cantidadReal"]')?.addEventListener(
        "input",
        () => aplicarLogicaFila(tr),
      );

      // Reevaluar la fila cuando cambia la integridad
      tr.querySelector('[name$="-integridad"]')?.addEventListener(
        "change",
        () => aplicarLogicaFila(tr),
      );

      // Reevaluar las columnas posteriores cuando cambia el plan
      tr.querySelector('[name$="-planIntervencion"]')?.addEventListener(
        "change",
        () => aplicarLogicaPlan(tr),
      );

      const toggleNA = tr.querySelector(".toggle-vencimiento");
      const fechaInput = tr.querySelector('[name$="-fechaVencimiento"]');

      if (toggleNA && fechaInput) {
        toggleNA.addEventListener("change", () => {
          fechaInput.disabled = toggleNA.checked;
          fechaInput.classList.toggle("campo-deshabilitado", toggleNA.checked);

          if (toggleNA.checked) {
            fechaInput.value = "";
          }
        });
      }
    });

    inicializarBloqueEvidencias(card, "botiquin-evidencia");
    card
      .querySelector('[data-action="remove-botiquin"]')
      ?.addEventListener("click", () => {
        card.remove();
        actualizarBotonesEliminar();
      });
    actualizarBotonesEliminar();
  }

  /**
   * Obtiene la información de todos los botiquines registrados.
   *
   * Lee los datos generales y las evidencias de cada botiquín, junto con
   * las cantidades, integridad, vencimiento, intervención, cumplimiento
   * y afectación al servicio de cada uno de sus insumos.
   *
   * @returns {Array<{
   *   numero: string,
   *   ubicacion: string,
   *   observacionGeneral: string,
   *   evidenciaGeneralArchivo: string,
   *   items: Array<{
   *     no: number,
   *     item: string,
   *     cantidadIdeal: string,
   *     cantidadReal: string,
   *     integridadEmpaque: string,
   *     fechaVencimiento: string,
   *     planIntervencion: string,
   *     fechaIntervencion: string,
   *     cumplimiento: string,
   *     afectacionServicio: string,
   *     observaciones: string,
   *     evidenciaArchivo: string
   *   }>
   * }>} Botiquines e insumos registrados en la inspección.
   */

  function leer() {
    return Array.from(document.querySelectorAll("[data-botiquin-index]")).map(
      (card, botiquinIndex) => ({
        numero: card.querySelector(`[name="botiquin-${botiquinIndex}-numero"]`)
          .value,
        ubicacion: card.querySelector(
          `[name="botiquin-${botiquinIndex}-ubicacion"]`,
        ).value,
        observacionGeneral:
          card.querySelector(
            `[name="botiquin-${botiquinIndex}-observacionGeneral"]`,
          )?.value || "",
        evidenciaGeneralArchivo: leerArchivosEvidencia(
          card,
          "botiquin-evidencia",
        )
          .map((f) => f.name)
          .join(", "),
        items: itemsBotiquin.map(([, etiqueta], itemIndex) => ({
          no: itemIndex + 1,
          item: etiqueta,
          cantidadIdeal: card.querySelector(
            `[name="botiquin-${botiquinIndex}-item-${itemIndex}-cantidadIdeal"]`,
          ).value,
          cantidadReal: card.querySelector(
            `[name="botiquin-${botiquinIndex}-item-${itemIndex}-cantidadReal"]`,
          ).value,
          integridadEmpaque: card.querySelector(
            `[name="botiquin-${botiquinIndex}-item-${itemIndex}-integridad"]`,
          ).value,
          fechaVencimiento: card.querySelector(
            `[name="botiquin-${botiquinIndex}-item-${itemIndex}-fechaVencimiento"]`,
          ).value,
          planIntervencion: card.querySelector(
            `[name="botiquin-${botiquinIndex}-item-${itemIndex}-planIntervencion"]`,
          ).value,
          fechaIntervencion: card.querySelector(
            `[name="botiquin-${botiquinIndex}-item-${itemIndex}-fechaIntervencion"]`,
          ).value,
          cumplimiento: card.querySelector(
            `[name="botiquin-${botiquinIndex}-item-${itemIndex}-cumplimiento"]`,
          ).value,
          afectacionServicio: card.querySelector(
            `[name="botiquin-${botiquinIndex}-item-${itemIndex}-afectacion"]`,
          ).value,
          observaciones:
            card.querySelector(
              `[name="botiquin-${botiquinIndex}-observacionGeneral"]`,
            )?.value || "",
          evidenciaArchivo: leerArchivosEvidencia(card, "botiquin-evidencia")
            .map((f) => f.name)
            .join(", "),
        })),
      }),
    );
  }

  return { agregar, leer };
}
