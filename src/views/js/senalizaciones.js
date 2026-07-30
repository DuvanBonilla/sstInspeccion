/*
  senalizaciones.js — Manager de tarjetas de señalización en el formulario (Paso 4).

  Qué hace:
  - Genera dinámicamente una tarjeta por cada señalización agregada, con campos:
    tipo, ubicación, observaciones, imagen de evidencia y tabla con:
    cantidad (numérico), estado (B/R/M/NC/NA) y aseo (B/R/M/NC/NA).
  - Permite agregar varias señalizaciones y eliminar cualquiera (incluida la
    única/primera tarjeta): la sección puede quedar vacía si la sede lo permite
    (ver esSedeUrabana() en inspeccion-sst.js y validarInspeccion en el backend).
  - Devuelve un array de objetos con todos los valores del DOM (leer()).

  Cómo interactúa:
  - Es instanciado por inspeccion-sst.js, que le pasa:
      crearOpciones()           → genera los <option> B/R/M/NC/NA (de shared.js)
      actualizarPreviewArchivo() → maneja la vista previa de imagen (de shared.js)
  - Los datos de leer() son incluidos en el payload enviado al servidor.
*/
import { crearBloqueEvidencias, inicializarBloqueEvidencias, leerArchivosEvidencia } from "/js/shared.js";

export function createSenalizacionesManager({ crearOpciones }) {
  let senalizacionCounter = 0;

  function renderCondicionSenalizacion(container) {
    const body = container.querySelector("[data-role='tabla-condiciones-senalizacion']");
    body.innerHTML = `
      <tr>
        <td class="left">Cantidad</td>
        <td><input name="senalizacionCantidad" type="text" inputmode="numeric" pattern="[0-9]*" /></td>
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
  }

  function crearSenalizacionCard(index) {
    return `
      <article class="extintor-card" data-senalizacion-index="${index}">
        <div class="extintor-card-header">
          <h3 class="extintor-card-title">Señalización ${index + 1}</h3>
          <button type="button" class="remove-btn" data-action="remove-senalizacion">Eliminar</button>
        </div>

        <div class="grid">
          <div class="field"><label>Tipo de señalización</label><input name="senalizacionTipo" type="text" /></div>
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
      card.querySelector('[data-action="remove-senalizacion"]')?.classList.toggle("hidden", cards.length <= 1);
    });
  }

  function agregar() {
    const container = document.getElementById("senalizaciones-container");
    const index = senalizacionCounter++;
    container.insertAdjacentHTML("beforeend", crearSenalizacionCard(index));
    const card = container.querySelector(`[data-senalizacion-index="${index}"]`);
    renderCondicionSenalizacion(card);
    inicializarBloqueEvidencias(card, "senalizacion-evidencia");
    card.querySelector('[data-action="remove-senalizacion"]')?.addEventListener("click", () => {
      card.remove();
      actualizarBotonesEliminar();
    });
    actualizarBotonesEliminar();
  }

  function leer() {
    return Array.from(document.querySelectorAll("[data-senalizacion-index]")).map((card) => ({
      tipo: card.querySelector('[name="senalizacionTipo"]').value,
      ubicacion: card.querySelector('[name="senalizacionUbicacion"]').value,
      cantidad: card.querySelector('[name="senalizacionCantidad"]').value,
      estado: card.querySelector('[name="senalizacionEstado"]').value,
      aseo: card.querySelector('[name="senalizacionAseo"]').value,
      observaciones: card.querySelector('[name="senalizacionObservaciones"]').value,
      evidenciaArchivo: leerArchivosEvidencia(card, "senalizacion-evidencia").map((f) => f.name).join(", ")
    }));
  }

  return { agregar, leer };
}
