/*
  botiquines.js — Manager de tarjetas de botiquín en el formulario (Paso 5).

  Qué hace:
  - Genera dinámicamente una tarjeta por cada botiquín, que incluye:
    número, ubicación, una tabla con los 28 insumos estándar (itemsBotiquin de shared.js)
    donde cada fila tiene: cantidad ideal (solo lectura), cantidad real, integridad
    del empaque, fecha de vencimiento, plan de intervención, fecha de intervención,
    cumplimiento y afectación al servicio.
  - También registra observación general y evidencia fotográfica del botiquín completo.
  - Permite agregar varios botiquines y eliminar cualquiera excepto el primero.
  - Devuelve un array de objetos anidados (botiquín → items[]) con leer().

  Cómo interactúa:
  - Es instanciado por inspeccion-sst.js, que le pasa:
      itemsBotiquin             → lista de 28 insumos con nombre y cantidad ideal (de shared.js)
      crearOpciones()           → genera los <option> B/R/M/NC/NA (de shared.js)
      actualizarPreviewArchivo() → maneja la vista previa de imagen (de shared.js)
  - Los datos de leer() son incluidos en el payload enviado al servidor.
*/
import { crearBloqueEvidencias, inicializarBloqueEvidencias, leerArchivosEvidencia } from "/js/shared.js";

export function createBotiquinesManager({ itemsBotiquin, crearOpciones }) {
  let botiquinCounter = 0;

  function crearBotiquinCard(index) {
    const filasItems = itemsBotiquin.map(([, etiqueta, cantIdeal, tieneVencimiento], itemIndex) => `
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
            <input name="botiquin-${index}-item-${itemIndex}-fechaVencimiento" type="date" ${!tieneVencimiento ? 'disabled class="campo-deshabilitado"' : ''} />
            <label class="toggle-na-label" title="Marcar si no aplica fecha de vencimiento">
              <input type="checkbox" class="toggle-vencimiento" ${!tieneVencimiento ? 'checked' : ''} />
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
    `).join("");

    return `
      <article class="extintor-card" data-botiquin-index="${index}">
        <div class="extintor-card-header">
          <h3 class="extintor-card-title">Botiquín ${index + 1}</h3>
          ${index === 0 ? "" : `<button type="button" class="remove-btn" data-action="remove-botiquin">Eliminar</button>`}
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

  function aplicarLogicaFila(tr) {
    const ideal = Number(tr.querySelector('[name$="-cantidadIdeal"]').value) || 0;
    const realVal = tr.querySelector('[name$="-cantidadReal"]').value;
    if (realVal === "") return;
    const cumple = Number(realVal) >= ideal;

    // F. Intervención, Cumplimiento, Afectación
    tr.querySelectorAll("[data-campo-condicional]").forEach(el => {
      el.disabled = cumple;
      if (cumple) el.value = el.tagName === "SELECT" ? "No" : "";
      el.classList.toggle("campo-deshabilitado", cumple);
    });

    // Plan de intervención: auto "Ninguna" si cumple, libre si no cumple
    const plan = tr.querySelector('[name$="-planIntervencion"]');
    if (plan) {
      if (cumple) {
        plan.value = "Ninguna";
        plan.disabled = true;
        plan.classList.add("campo-deshabilitado");
      } else {
        plan.disabled = false;
        plan.classList.remove("campo-deshabilitado");
        if (plan.value === "Ninguna") plan.value = "";
      }
    }
  }

  function agregar() {
    const container = document.getElementById("botiquines-container");
    const index = botiquinCounter++;
    container.insertAdjacentHTML("beforeend", crearBotiquinCard(index));
    const card = container.querySelector(`[data-botiquin-index="${index}"]`);

    card.querySelectorAll("tbody tr").forEach(tr => {
      tr.querySelector('[name$="-cantidadReal"]')?.addEventListener("input", () => aplicarLogicaFila(tr));

      const toggleNA = tr.querySelector(".toggle-vencimiento");
      const fechaInput = tr.querySelector('[name$="-fechaVencimiento"]');
      if (toggleNA && fechaInput) {
        toggleNA.addEventListener("change", () => {
          fechaInput.disabled = toggleNA.checked;
          fechaInput.classList.toggle("campo-deshabilitado", toggleNA.checked);
          if (toggleNA.checked) fechaInput.value = "";
        });
      }
    });

    inicializarBloqueEvidencias(card, "botiquin-evidencia");
    card.querySelector('[data-action="remove-botiquin"]')?.addEventListener("click", () => card.remove());
  }

  function leer() {
    return Array.from(document.querySelectorAll("[data-botiquin-index]")).map((card, botiquinIndex) => ({
      numero: card.querySelector(`[name="botiquin-${botiquinIndex}-numero"]`).value,
      ubicacion: card.querySelector(`[name="botiquin-${botiquinIndex}-ubicacion"]`).value,
      observacionGeneral: card.querySelector(`[name="botiquin-${botiquinIndex}-observacionGeneral"]`)?.value || "",
      evidenciaGeneralArchivo: leerArchivosEvidencia(card, "botiquin-evidencia").map((f) => f.name).join(", "),
      items: itemsBotiquin.map(([, etiqueta], itemIndex) => ({
        no: itemIndex + 1,
        item: etiqueta,
        cantidadIdeal: card.querySelector(`[name="botiquin-${botiquinIndex}-item-${itemIndex}-cantidadIdeal"]`).value,
        cantidadReal: card.querySelector(`[name="botiquin-${botiquinIndex}-item-${itemIndex}-cantidadReal"]`).value,
        integridadEmpaque: card.querySelector(`[name="botiquin-${botiquinIndex}-item-${itemIndex}-integridad"]`).value,
        fechaVencimiento: card.querySelector(`[name="botiquin-${botiquinIndex}-item-${itemIndex}-fechaVencimiento"]`).value,
        planIntervencion: card.querySelector(`[name="botiquin-${botiquinIndex}-item-${itemIndex}-planIntervencion"]`).value,
        fechaIntervencion: card.querySelector(`[name="botiquin-${botiquinIndex}-item-${itemIndex}-fechaIntervencion"]`).value,
        cumplimiento: card.querySelector(`[name="botiquin-${botiquinIndex}-item-${itemIndex}-cumplimiento"]`).value,
        afectacionServicio: card.querySelector(`[name="botiquin-${botiquinIndex}-item-${itemIndex}-afectacion"]`).value,
        observaciones: card.querySelector(`[name="botiquin-${botiquinIndex}-observacionGeneral"]`)?.value || "",
        evidenciaArchivo: leerArchivosEvidencia(card, "botiquin-evidencia").map((f) => f.name).join(", ")
      }))
    }));
  }

  return { agregar, leer };
}
