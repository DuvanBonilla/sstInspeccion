/*
  extintores.js — Manager de tarjetas de extintor en el formulario (Paso 2).

  Qué hace:
  - Genera dinámicamente una tarjeta (article) por cada extintor agregado,
    con campos: número, ubicación, tipo, capacidad, mes/año de próxima recarga,
    observaciones, imagen de evidencia y tabla de 19 condiciones (B/R/M/NC/NA).
  - Permite agregar múltiples extintores y eliminar cualquiera excepto el primero.
  - Muestra una vista previa de la imagen de evidencia al seleccionarla.
  - Lee todos los valores del DOM y los devuelve como array de objetos (leer()).

  Cómo interactúa:
  - Es instanciado por inspeccion-sst.js, que le pasa las dependencias:
      condiciones       → lista de ítems de la tabla (de shared.js)
      crearOpciones()   → genera los <option> B/R/M/NC/NA (de shared.js)
      tipoOptionsHtml   → HTML de opciones del select "Tipo" (de shared.js)
      actualizarPreviewArchivo() → maneja la vista previa de imagen (de shared.js)
  - Los datos leídos por leer() son recogidos por inspeccion-sst.js
    para armar el payload JSON que se envía al servidor.
*/
import { crearBloqueEvidencias, inicializarBloqueEvidencias, leerArchivosEvidencia } from "/js/shared.js";

export function createExtintoresManager({ condiciones, crearOpciones, tipoOptionsHtml }) {
  let extintorCounter = 0;

  function renderCondiciones(extintorIndex, container) {
    const body = container.querySelector("[data-role='tabla-condiciones']");
    body.innerHTML = condiciones
      .map(([clave, etiqueta]) => `
        <tr>
          <td class="left">${etiqueta}</td>
          <td>
            <select name="cond-${extintorIndex}-${clave}">
              ${crearOpciones()}
            </select>
          </td>
        </tr>
      `)
      .join("");
  }

  function crearExtintorCard(index) {
    return `
      <article class="extintor-card" data-extintor-index="${index}">
        <div class="extintor-card-header">
          <h3 class="extintor-card-title">Extintor ${index + 1}</h3>
          ${index === 0 ? "" : `<button type="button" class="remove-btn" data-action="remove-extintor">Eliminar</button>`}
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

  function agregar() {
    const container = document.getElementById("extintores-container");
    const index = extintorCounter++;
    container.insertAdjacentHTML("beforeend", crearExtintorCard(index));
    const card = container.querySelector(`[data-extintor-index="${index}"]`);
    renderCondiciones(index, card);
    inicializarBloqueEvidencias(card, "evidencia");
    card.querySelector('[data-action="remove-extintor"]')?.addEventListener("click", () => card.remove());
  }

  function leerCondiciones(container) {
    const salida = {};
    for (const [clave] of condiciones) {
      salida[clave] = container.querySelector(`[name^="cond-"][name$="-${clave}"]`).value;
    }
    return salida;
  }

  function leer() {
    return Array.from(document.querySelectorAll("[data-extintor-index]")).map((card) => {
      const proximaRecarga = card.querySelector('[name="proximaRecarga"]').value;
      const [anioRecarga = "", mesRecarga = ""] = proximaRecarga ? proximaRecarga.split("-") : [];
      return {
        numero: card.querySelector('[name="numero"]').value,
        ubicacion: card.querySelector('[name="ubicacion"]').value,
        tipo: card.querySelector('[name="tipo"]').value,
        capacidad: card.querySelector('[name="capacidad"]').value,
        mesRecarga,
        anioRecarga,
        observaciones: card.querySelector('[name="observaciones"]').value,
        evidenciaArchivo: leerArchivosEvidencia(card, "evidencia").map((f) => f.name).join(", "),
        condiciones: leerCondiciones(card)
      };
    });
  }

  return { agregar, leer };
}
