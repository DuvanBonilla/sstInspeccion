/*
  camillas.js — Manager de tarjetas de camilla en el formulario (Paso 3).

  Qué hace:
  - Genera dinámicamente una tarjeta por cada camilla agregada, con campos:
    número, ubicación, afectación a la productividad (SI/NO), observaciones,
    imagen de evidencia y tabla de 7 condiciones (señalización, acceso, soporte,
    instalación a pared, correas, limpieza, inmovilizador).
  - Permite agregar varias camillas y eliminar cualquiera (incluida la única/
    primera tarjeta): la sección puede quedar vacía si la sede lo permite
    (ver esSedeUrabana() en inspeccion-sst.js y validarInspeccion en el backend).
  - Muestra vista previa de la imagen al seleccionarla.
  - Devuelve un array de objetos con todos los valores del DOM (leer()).

  Cómo interactúa:
  - Es instanciado por inspeccion-sst.js, que le pasa:
      condicionesCamilla        → lista de ítems de la tabla (de shared.js)
      crearOpciones()           → genera los <option> B/R/M/NC/NA (de shared.js)
      actualizarPreviewArchivo() → maneja la vista previa de imagen (de shared.js)
  - Los datos de leer() son incluidos en el payload enviado al servidor.
*/
import { crearBloqueEvidencias, inicializarBloqueEvidencias, leerArchivosEvidencia } from "/js/shared.js";

export function createCamillasManager({ condicionesCamilla, crearOpciones }) {
  let camillaCounter = 0;

  function renderCondicionesCamilla(camillaIndex, container) {
    const body = container.querySelector("[data-role='tabla-condiciones-camilla']");
    body.innerHTML = condicionesCamilla
      .map(([clave, etiqueta]) => `
        <tr>
          <td class="left">${etiqueta}</td>
          <td>
            <select name="camilla-cond-${camillaIndex}-${clave}">
              ${crearOpciones()}
            </select>
          </td>
        </tr>
      `)
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
      card.querySelector('[data-action="remove-camilla"]')?.classList.toggle("hidden", cards.length <= 1);
    });
  }

  function agregar() {
    const container = document.getElementById("camillas-container");
    const index = camillaCounter++;
    container.insertAdjacentHTML("beforeend", crearCamillaCard(index));
    const card = container.querySelector(`[data-camilla-index="${index}"]`);
    renderCondicionesCamilla(index, card);
    inicializarBloqueEvidencias(card, "camilla-evidencia");
    card.querySelector('[data-action="remove-camilla"]')?.addEventListener("click", () => {
      card.remove();
      actualizarBotonesEliminar();
    });
    actualizarBotonesEliminar();
  }

  function leerCondicionesCamilla(container) {
    const salida = {};
    for (const [clave] of condicionesCamilla) {
      salida[clave] = container.querySelector(`[name^="camilla-cond-"][name$="-${clave}"]`).value;
    }
    return salida;
  }

  function leer() {
    return Array.from(document.querySelectorAll("[data-camilla-index]")).map((card) => ({
      numero: card.querySelector('[name="camillaNumero"]').value,
      ubicacion: card.querySelector('[name="camillaUbicacion"]').value,
      observaciones: card.querySelector('[name="camillaObservaciones"]').value,
      afectacionProductividad: card.querySelector('[name="camillaAfectacion"]').value,
      evidenciaArchivo: leerArchivosEvidencia(card, "camilla-evidencia").map((f) => f.name).join(", "),
      condiciones: leerCondicionesCamilla(card)
    }));
  }

  return { agregar, leer };
}
