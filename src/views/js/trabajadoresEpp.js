/**
 * trabajadoresEpp.js
 *
 * Gestiona dinámicamente los trabajadores incluidos
 * dentro de una inspección EPP.
 */

import { optimizarImagen } from "./imageOptimizer.js";

const ELEMENTOS_EPP = [
  "Dotación",
  "Botas de seguridad",
  "Casco",
  "Teflete",
  "Guantes patio",
  "Guantes fríos",
  "Guantes de vaqueta",
  "Gafas claras",
  "Gafas oscuras",
  "Barbuquejo",
  "Guantes de lavado",
];

const VALORES_CALIFICACION = ["M", "R", "B", "NA"];

export function createTrabajadoresEppManager({
  container,
  cantidadInput,
  generarButton,
  estadoElement,
  agregarButton,
  accionesElement,
}) {
  let cantidadActual = 0;

  let siguienteTrabajadorId = 1;

  const evidencias = new Map();

  // =======================================================
  // INICIALIZACIÓN
  // =======================================================

  function init() {
    generarButton?.addEventListener("click", generarDesdeInput);

    agregarButton?.addEventListener("click", agregarTrabajador);

    container?.addEventListener("input", limpiarErrorCampo);

    container?.addEventListener("change", limpiarErrorCampo);

    container?.addEventListener("change", manejarCambioEvidencia);

    container?.addEventListener("click", manejarAccionesTrabajador);
  }

  function limpiarErrorCampo(event) {
    const elemento = event.target;

    if (elemento.matches("input, select, textarea")) {
      elemento.classList.remove("campo-error");
    }
  }

  // =======================================================
  // MANEJAR EVIDENCIA DEL TRABAJADOR
  // =======================================================

  async function manejarCambioEvidencia(event) {
    const input = event.target;

    // Solo procesar cambios provenientes del input
    // de evidencia fotográfica.
    if (!input.matches('[data-role="evidencia"]')) {
      return;
    }

    // Obtener la tarjeta del trabajador al que
    // pertenece esta evidencia.
    const tarjeta = input.closest(".trabajador-card");

    if (!tarjeta) {
      return;
    }

    // Obtener el índice del trabajador.
    const trabajadorId = Number(tarjeta.dataset.trabajadorId);

    // Elemento visual donde mostramos el estado
    // de la evidencia.
    const estado = tarjeta.querySelector('[data-role="evidenciaEstado"]');

    // Obtener el archivo seleccionado.
    const archivo = input.files?.[0];

    // -------------------------------------------------------
    // SI EL USUARIO QUITA / CANCELA LA EVIDENCIA
    // -------------------------------------------------------

    if (!archivo) {
      evidencias.delete(trabajadorId);

      if (estado) {
        estado.textContent = "Sin evidencia";
      }

      return;
    }

    // -------------------------------------------------------
    // INICIAR OPTIMIZACIÓN
    // -------------------------------------------------------

    input.disabled = true;

    if (estado) {
      estado.textContent = "Optimizando imagen...";
    }

    try {
      // -----------------------------------------------------
      // REUTILIZAR EL OPTIMIZADOR EXISTENTE
      // -----------------------------------------------------

      const archivoOptimizado = await optimizarImagen(archivo);

      // -----------------------------------------------------
      // GUARDAR EVIDENCIA OPTIMIZADA
      // -----------------------------------------------------

      evidencias.set(trabajadorId, archivoOptimizado);

      // -----------------------------------------------------
      // ACTUALIZAR ESTADO VISUAL
      // -----------------------------------------------------

      if (estado) {
        estado.textContent = `Evidencia lista · ${formatearPeso(
          archivoOptimizado.size,
        )}`;
      }

      // -----------------------------------------------------
      // LOG TEMPORAL PARA PRUEBAS
      // -----------------------------------------------------

      const numeroVisual =
        Array.from(container.querySelectorAll(".trabajador-card")).indexOf(
          tarjeta,
        ) + 1;

      console.log(`Evidencia trabajador ${numeroVisual}:`, {
        trabajadorId,
        original: archivo.size,
        optimizado: archivoOptimizado.size,
        archivo: archivoOptimizado,
      });
    } catch (error) {
      console.error("Error procesando evidencia EPP:", error);

      // Si falla la optimización, eliminamos cualquier
      // evidencia que pudiera estar asociada anteriormente.
      evidencias.delete(trabajadorId);

      // Limpiar input.
      input.value = "";

      if (estado) {
        estado.textContent = "No fue posible procesar la imagen.";
      }
    } finally {
      // Volver a habilitar el input.
      input.disabled = false;
    }
  }

  // =======================================================
  // FORMATEAR PESO DE ARCHIVO
  // =======================================================

  function formatearPeso(bytes) {
    if (!Number.isFinite(bytes)) {
      return "";
    }

    // Mostrar KB cuando el archivo sea menor de 1 MB.
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(0)} KB`;
    }

    // Mostrar MB para archivos mayores.
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  }

  function manejarAccionesTrabajador(event) {
    const botonEliminar = event.target.closest(
      '[data-action="eliminar-trabajador"]',
    );

    if (!botonEliminar) {
      return;
    }

    const tarjeta = botonEliminar.closest(".trabajador-card");

    if (!tarjeta) {
      return;
    }

    eliminarTrabajador(tarjeta);
  }

  // =======================================================
  // GENERAR DESDE INPUT
  // =======================================================

  function generarDesdeInput() {
    const cantidad = Number.parseInt(cantidadInput?.value, 10);

    if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 100) {
      mostrarEstado("Ingrese una cantidad válida entre 1 y 100 trabajadores.");

      cantidadInput?.focus();

      return;
    }

    generar(cantidad);
  }

  // =======================================================
  // GENERAR TRABAJADORES
  // =======================================================

  // =======================================================
  // GENERAR TRABAJADORES
  // =======================================================

  function generar(cantidad) {
    // Limpiar trabajadores de una generación anterior
    container.innerHTML = "";

    // Limpiar evidencias anteriores
    evidencias.clear();

    // Reiniciar cantidad
    cantidadActual = 0;

    // Reiniciar identificador interno
    siguienteTrabajadorId = 1;

    // -------------------------------------------------------
    // GENERAR TRABAJADORES
    // -------------------------------------------------------

    for (let indice = 0; indice < cantidad; indice++) {
      agregarTrabajador();
    }

    // -------------------------------------------------------
    // ACTUALIZAR NUMERACIÓN
    // -------------------------------------------------------

    actualizarNumeracion();

    // -------------------------------------------------------
    // MOSTRAR ESTADO
    // -------------------------------------------------------

    mostrarEstado(
      `${cantidad} ${
        cantidad === 1 ? "trabajador generado" : "trabajadores generados"
      }.`,
    );

    // -------------------------------------------------------
    // MOSTRAR BOTÓN AGREGAR TRABAJADOR
    // -------------------------------------------------------

    accionesElement?.classList.remove("hidden");
  }

  function agregarTrabajador() {
    if (cantidadActual >= 100) {
      mostrarEstado("La inspección permite un máximo de 100 trabajadores.");

      return;
    }

    const trabajadorId = siguienteTrabajadorId++;

    const trabajador = crearTrabajador(trabajadorId);

    container.appendChild(trabajador);

    cantidadActual++;

    actualizarNumeracion();
  }

  function eliminarTrabajador(tarjeta) {
    const tarjetas = container.querySelectorAll(".trabajador-card");

    if (tarjetas.length <= 1) {
      mostrarEstado("La inspección debe conservar al menos un trabajador.");

      return;
    }

    const trabajadorId = Number(tarjeta.dataset.trabajadorId);

    // Eliminar su evidencia optimizada.
    evidencias.delete(trabajadorId);

    // Eliminar únicamente esta tarjeta.
    tarjeta.remove();

    cantidadActual--;

    actualizarNumeracion();

    mostrarEstado(
      `${cantidadActual} ${
        cantidadActual === 1
          ? "trabajador registrado"
          : "trabajadores registrados"
      }.`,
    );
  }

  function actualizarNumeracion() {
    const tarjetas = container.querySelectorAll(".trabajador-card");

    tarjetas.forEach((tarjeta, indice) => {
      const numero = tarjeta.querySelector('[data-role="numeroTrabajador"]');

      if (numero) {
        numero.textContent = `Trabajador ${indice + 1}`;
      }
    });

    cantidadActual = tarjetas.length;
  }
  // =======================================================
  // CREAR TRABAJADOR
  // =======================================================

  function crearTrabajador(trabajadorId) {
    const card = document.createElement("article");

    card.className = "trabajador-card";

    card.dataset.trabajadorId = trabajadorId;

    card.innerHTML = `
      <div class="trabajador-card-header">
      <button
  type="button"
  class="btn-eliminar-trabajador"
  data-action="eliminar-trabajador"
  title="Eliminar trabajador"
>
  Eliminar
</button>

        <div>
<span
  class="trabajador-numero"
  data-role="numeroTrabajador"
>
  Trabajador
</span>

          <h3>
            Información del trabajador
          </h3>
        </div>

      </div>


      <div class="trabajador-datos">

        <div class="field">

          <label>
            Nombre y apellido
          </label>

          <input
            type="text"
            data-role="nombre"
            autocomplete="off"
          />

        </div>


        <div class="field">

          <label>
            Código
          </label>

          <input
            type="text"
            data-role="codigo"
            autocomplete="off"
          />

        </div>


        <div class="field">

          <label>
            Labor / Cargo
          </label>

          <input
            type="text"
            data-role="cargo"
            autocomplete="off"
          />

        </div>

      </div>


      <div class="trabajador-epp">

        <div class="trabajador-subtitulo">
          Elementos de Protección Personal
        </div>

        <div class="epp-table-wrap">

          <table class="epp-table">

            <thead>

              <tr>
                <th>
                  Elemento EPP
                </th>

                <th>
                  Condición
                </th>

                <th>
                  Uso
                </th>
              </tr>

            </thead>

            <tbody>

              ${ELEMENTOS_EPP.map((elemento, elementoIndex) =>
                crearFilaEpp(elemento, elementoIndex),
              ).join("")}

            </tbody>

          </table>

        </div>

      </div>


      <div class="trabajador-adicional">

        <div class="field">

          <label>
            Plan de acción
          </label>

          <textarea
            rows="3"
            data-role="planAccion"
            placeholder="Describa la acción a realizar si aplica."
          ></textarea>

        </div>


        <div class="field">

          <label>
            Observaciones
          </label>

          <textarea
            rows="3"
            data-role="observaciones"
            placeholder="Registre observaciones adicionales."
          ></textarea>

        </div>

      </div>


<div class="trabajador-evidencia">

  <div class="trabajador-subtitulo">
    Constancia del operario
  </div>

  <p>
    Registre una evidencia fotográfica como constancia
    de que el trabajador fue informado de la inspección.
  </p>

  <div class="evidencia-control">

    <input
      type="file"
      accept="image/jpeg,image/png,image/webp"
      capture="environment"
      data-role="evidencia"
    />

    <div
      class="evidencia-estado"
      data-role="evidenciaEstado"
    >
      Sin evidencia
    </div>

  </div>

</div>
    `;

    return card;
  }

  // =======================================================
  // FILA EPP
  // =======================================================

  function crearFilaEpp(elemento, elementoIndex) {
    return `
      <tr data-epp-index="${elementoIndex}">

        <td class="epp-nombre">
          ${elemento}
        </td>

        <td>
          ${crearSelectCalificacion("condicion")}
        </td>

        <td>
          ${crearSelectCalificacion("uso")}
        </td>

      </tr>
    `;
  }

  // =======================================================
  // SELECT M / R / B / NA
  // =======================================================

  function crearSelectCalificacion(tipo) {
    return `
      <select
        class="epp-calificacion"
        data-role="${tipo}"
      >

        <option
          value=""
          selected
          disabled
        >
          —
        </option>

        ${VALORES_CALIFICACION.map(
          (valor) => `
              <option value="${valor}">
                ${valor}
              </option>
            `,
        ).join("")}

      </select>
    `;
  }

  // =======================================================
  // ESTADO
  // =======================================================

  function mostrarEstado(mensaje) {
    if (!estadoElement) {
      return;
    }

    estadoElement.textContent = mensaje;

    estadoElement.classList.remove("hidden");
  }

  // =======================================================
  // VALIDAR TRABAJADORES
  // =======================================================

  function validar() {
    const tarjetas = container.querySelectorAll(".trabajador-card");

    // -----------------------------------------------------
    // Debe existir al menos un trabajador
    // -----------------------------------------------------

    if (tarjetas.length === 0) {
      mostrarEstado("Debe generar al menos un trabajador antes de continuar.");

      cantidadInput?.focus();

      return {
        valido: false,
        mensaje: "Debe generar al menos un trabajador.",
      };
    }

    // -----------------------------------------------------
    // Recorrer trabajadores
    // -----------------------------------------------------

    for (let trabajadorId = 0; trabajadorId < tarjetas.length; trabajadorId++) {
      const tarjeta = tarjetas[trabajadorId];

      const numeroTrabajador = trabajadorId + 1;

      // ===================================================
      // DATOS DEL TRABAJADOR
      // ===================================================

      const nombre = tarjeta.querySelector('[data-role="nombre"]');

      const codigo = tarjeta.querySelector('[data-role="codigo"]');

      const cargo = tarjeta.querySelector('[data-role="cargo"]');

      if (!nombre?.value.trim()) {
        return marcarError(
          nombre,
          `Trabajador ${numeroTrabajador}: ingrese el nombre y apellido.`,
        );
      }

      if (!codigo?.value.trim()) {
        return marcarError(
          codigo,
          `Trabajador ${numeroTrabajador}: ingrese el código.`,
        );
      }

      if (!cargo?.value.trim()) {
        return marcarError(
          cargo,
          `Trabajador ${numeroTrabajador}: ingrese la labor o cargo.`,
        );
      }

      // ===================================================
      // ELEMENTOS EPP
      // ===================================================

      const filasEpp = tarjeta.querySelectorAll("[data-epp-index]");

      let requierePlanAccion = false;

      for (
        let elementoIndex = 0;
        elementoIndex < filasEpp.length;
        elementoIndex++
      ) {
        const fila = filasEpp[elementoIndex];

        const nombreElemento =
          fila.querySelector(".epp-nombre")?.textContent?.trim() ||
          `Elemento ${elementoIndex + 1}`;

        const condicion = fila.querySelector('[data-role="condicion"]');

        const uso = fila.querySelector('[data-role="uso"]');

        // -------------------------------------------------
        // Condición obligatoria
        // -------------------------------------------------

        if (!condicion?.value) {
          return marcarError(
            condicion,
            `Trabajador ${numeroTrabajador}: seleccione la condición de "${nombreElemento}".`,
          );
        }

        // -------------------------------------------------
        // Uso obligatorio
        // -------------------------------------------------

        if (!uso?.value) {
          return marcarError(
            uso,
            `Trabajador ${numeroTrabajador}: seleccione el uso de "${nombreElemento}".`,
          );
        }

        // -------------------------------------------------
        // Detectar novedad
        // -------------------------------------------------

        if (
          condicion.value === "M" ||
          condicion.value === "R" ||
          uso.value === "M" ||
          uso.value === "R"
        ) {
          requierePlanAccion = true;
        }
      }

      // ===================================================
      // PLAN DE ACCIÓN
      // ===================================================

      const planAccion = tarjeta.querySelector('[data-role="planAccion"]');

      if (requierePlanAccion && !planAccion?.value.trim()) {
        return marcarError(
          planAccion,
          `Trabajador ${numeroTrabajador}: debe registrar un plan de acción porque existen elementos calificados como Malo o Regular.`,
        );
      }
    }

    // -----------------------------------------------------
    // TODO CORRECTO
    // -----------------------------------------------------

    ocultarEstado();

    return {
      valido: true,
      mensaje: "",
    };
  }

  // =======================================================
  // MARCAR ERROR
  // =======================================================

  function marcarError(elemento, mensaje) {
    mostrarEstado(mensaje);

    if (elemento) {
      elemento.classList.add("campo-error");

      elemento.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      setTimeout(() => {
        elemento.focus();
      }, 300);
    }

    return {
      valido: false,
      mensaje,
    };
  }

  // =======================================================
  // OCULTAR ESTADO
  // =======================================================

  function ocultarEstado() {
    if (!estadoElement) {
      return;
    }

    estadoElement.textContent = "";

    estadoElement.classList.add("hidden");
  }

  // =======================================================
  // LEER TRABAJADORES
  // =======================================================

  function leer() {
    const tarjetas = container.querySelectorAll(".trabajador-card");

    return Array.from(tarjetas).map((tarjeta, trabajadorId) => {
      // =================================================
      // ELEMENTOS EPP
      // =================================================

      const elementos = Array.from(
        tarjeta.querySelectorAll("[data-epp-index]"),
      ).map((fila, elementoIndex) => {
        return {
          indice: elementoIndex,

          elemento:
            fila.querySelector(".epp-nombre")?.textContent?.trim() || "",

          condicion: fila.querySelector('[data-role="condicion"]')?.value || "",

          uso: fila.querySelector('[data-role="uso"]')?.value || "",
        };
      });

      // =================================================
      // TRABAJADOR
      // =================================================

      return {
        trabajadorId: Number(tarjeta.dataset.trabajadorId),

        indice: trabajadorId,

        nombre:
          tarjeta.querySelector('[data-role="nombre"]')?.value.trim() || "",

        codigo:
          tarjeta.querySelector('[data-role="codigo"]')?.value.trim() || "",

        cargo: tarjeta.querySelector('[data-role="cargo"]')?.value.trim() || "",

        elementos,

        planAccion:
          tarjeta.querySelector('[data-role="planAccion"]')?.value.trim() || "",

        observaciones:
          tarjeta.querySelector('[data-role="observaciones"]')?.value.trim() ||
          "",
      };
    });
  }

  // =======================================================
  // API PÚBLICA
  // =======================================================

  return {
    init,

    generar,

    validar,

    leer,

    getCantidad() {
      return cantidadActual;
    },
  };
}
