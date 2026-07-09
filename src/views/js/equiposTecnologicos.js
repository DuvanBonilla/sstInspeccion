/*
  equiposTecnologicos.js — Manager de equipos tecnológicos en el formulario (Paso 6).

  Qué hace:
  - A diferencia de los otros managers, NO permite agregar ni eliminar tarjetas:
    los 4 equipos (sensor de humo, sensor de movimiento, cámaras, alarma)
    son fijos y se renderizan todos de una vez con render().
  - Cada tarjeta tiene: ubicación, afectación al servicio (SI/NO), observaciones,
    imagen de evidencia y tabla con cantidad, estado y mantenimiento (B/R/M/NC/NA).
  - Devuelve un array de 4 objetos con los valores del DOM (leer()).

  Cómo interactúa:
  - Es instanciado por inspeccion-sst.js, que le pasa:
      equiposTecnologicos       → lista de 4 equipos fijos (de shared.js)
      crearOpciones()           → genera los <option> B/R/M/NC/NA (de shared.js)
      crearOpcionesAfectacion() → genera los <option> SI/NO (de shared.js)
      actualizarPreviewArchivo() → maneja la vista previa de imagen (de shared.js)
  - Los datos de leer() son incluidos en el payload enviado al servidor.
*/
import { crearBloqueEvidencias, inicializarBloqueEvidencias, leerArchivosEvidencia } from "/js/shared.js";

export function createEquiposTecnologicosManager({ equiposTecnologicos, crearOpciones, crearOpcionesAfectacion }) {
  function renderCondicionesEquipoTecnologico(container) {
    const body = container.querySelector("[data-role='tabla-condiciones-equipo-tecnologico']");
    body.innerHTML = `
      <tr>
        <td class="left">Cantidad</td>
        <td><input name="equipoTecCantidad" type="text" inputmode="numeric" pattern="[0-9]*" /></td>
      </tr>
      <tr>
        <td class="left">Estado</td>
        <td>
          <select name="equipoTecEstado">
            ${crearOpciones()}
          </select>
        </td>
      </tr>
      <tr>
        <td class="left">Mantenimiento</td>
        <td>
          <select name="equipoTecMantenimiento">
            ${crearOpciones()}
          </select>
        </td>
      </tr>
    `;
  }

  function crearEquipoTecnologicoCard(index, etiqueta) {
    return `
      <article class="extintor-card" data-equipo-tecnologico-index="${index}">
        <div class="extintor-card-header">
          <h3 class="extintor-card-title">${etiqueta}</h3>
        </div>

        <div class="grid">
          <div class="field"><label>Ubicación</label><input name="equipoTec-${index}-ubicacion" type="text" /></div>
          <div class="field">
            <label>Afectación al servicio</label>
            <select name="equipoTec-${index}-afectacion">
              ${crearOpcionesAfectacion()}
            </select>
          </div>
          <div class="field" style="grid-column: 1 / -1;"><label class="opcional">Observaciones</label><input name="equipoTec-${index}-observaciones" type="text" /></div>
          <div class="field" style="grid-column: 1 / -1;">
            <label>Evidencia equipo tecnológico</label>
            ${crearBloqueEvidencias("equipo-tecnologico-evidencia")}
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
                <th class="left">Condición</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody data-role="tabla-condiciones-equipo-tecnologico"></tbody>
          </table>
        </div>
      </article>
    `;
  }

  function render(container) {
    container.innerHTML = equiposTecnologicos
      .map(([, etiqueta], index) => crearEquipoTecnologicoCard(index, etiqueta))
      .join("");

    equiposTecnologicos.forEach(([, etiqueta], index) => {
      const card = container.querySelector(`[data-equipo-tecnologico-index="${index}"]`);
      renderCondicionesEquipoTecnologico(card);
      inicializarBloqueEvidencias(card, "equipo-tecnologico-evidencia");
    });
  }

  function leer() {
    return equiposTecnologicos.map(([, etiqueta], index) => {
      const card = document.querySelector(`[data-equipo-tecnologico-index="${index}"]`);

      return {
        no: index + 1,
        tipo: etiqueta,
        ubicacion: card.querySelector(`[name="equipoTec-${index}-ubicacion"]`).value,
        cantidad: card.querySelector('[name="equipoTecCantidad"]').value,
        estado: card.querySelector('[name="equipoTecEstado"]').value,
        mantenimiento: card.querySelector('[name="equipoTecMantenimiento"]').value,
        observaciones: card.querySelector(`[name="equipoTec-${index}-observaciones"]`).value,
        afectacionServicio: card.querySelector(`[name="equipoTec-${index}-afectacion"]`).value,
        evidenciaArchivo: leerArchivosEvidencia(card, "equipo-tecnologico-evidencia").map((f) => f.name).join(", ")
      };
    });
  }

  return { render, leer };
}
