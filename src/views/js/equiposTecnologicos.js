import {
  crearBloqueEvidencias,
  inicializarBloqueEvidencias,
  leerArchivosEvidencia,
} from "/js/shared.js";

/**
 * Crea el administrador de equipos tecnológicos de la inspección SST.
 *
 * Gestiona la representación de los equipos configurados y la lectura de
 * sus ubicaciones, cantidades, estados, mantenimientos, afectaciones,
 * observaciones y evidencias.
 *
 * @param {Object} dependencias - Configuración requerida por el administrador.
 * @param {Array<Array<string>>} dependencias.equiposTecnologicos
 * Lista de equipos tecnológicos que deben inspeccionarse.
 * @param {Function} dependencias.crearOpciones
 * Función que genera las opciones de calificación.
 * @param {Function} dependencias.crearOpcionesAfectacion
 * Función que genera las opciones de afectación al servicio.
 * @returns {{
 *   render: Function,
 *   leer: Function
 * }} Operaciones públicas del administrador de equipos tecnológicos.
 */

export function createEquiposTecnologicosManager({
  equiposTecnologicos,
  crearOpciones,
  crearOpcionesAfectacion,
}) {
  function renderCondicionesEquipoTecnologico(container) {
    const body = container.querySelector(
      "[data-role='tabla-condiciones-equipo-tecnologico']",
    );
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

  /**
   * Renderiza los equipos tecnológicos configurados para la inspección.
   *
   * Genera una tarjeta por cada equipo, incorpora sus campos de evaluación
   * e inicializa el bloque destinado a las evidencias fotográficas.
   *
   * @param {HTMLElement} container - Contenedor donde deben mostrarse los equipos.
   * @returns {void}
   */

  function render(container) {
    container.innerHTML = equiposTecnologicos
      .map(([, etiqueta], index) => crearEquipoTecnologicoCard(index, etiqueta))
      .join("");

    equiposTecnologicos.forEach(([, etiqueta], index) => {
      const card = container.querySelector(
        `[data-equipo-tecnologico-index="${index}"]`,
      );
      renderCondicionesEquipoTecnologico(card);
      inicializarBloqueEvidencias(card, "equipo-tecnologico-evidencia");
    });
  }

  /**
   * Obtiene la información registrada para los equipos tecnológicos.
   *
   * Lee el tipo, ubicación, cantidad, estado, mantenimiento, observaciones,
   * afectación al servicio y nombres de las evidencias de cada equipo.
   *
   * @returns {Array<{
   *   no: number,
   *   tipo: string,
   *   ubicacion: string,
   *   cantidad: string,
   *   estado: string,
   *   mantenimiento: string,
   *   observaciones: string,
   *   afectacionServicio: string,
   *   evidenciaArchivo: string
   * }>} Equipos tecnológicos evaluados en la inspección.
   */

  function leer() {
    return equiposTecnologicos.map(([, etiqueta], index) => {
      const card = document.querySelector(
        `[data-equipo-tecnologico-index="${index}"]`,
      );

      return {
        no: index + 1,
        tipo: etiqueta,
        ubicacion: card.querySelector(`[name="equipoTec-${index}-ubicacion"]`)
          .value,
        cantidad: card.querySelector('[name="equipoTecCantidad"]').value,
        estado: card.querySelector('[name="equipoTecEstado"]').value,
        mantenimiento: card.querySelector('[name="equipoTecMantenimiento"]')
          .value,
        observaciones: card.querySelector(
          `[name="equipoTec-${index}-observaciones"]`,
        ).value,
        afectacionServicio: card.querySelector(
          `[name="equipoTec-${index}-afectacion"]`,
        ).value,
        evidenciaArchivo: leerArchivosEvidencia(
          card,
          "equipo-tecnologico-evidencia",
        )
          .map((f) => f.name)
          .join(", "),
      };
    });
  }

  return { render, leer };
}
