import { optimizarImagen } from "./imageOptimizer.js";

const ELEMENTOS_EPP_PREDETERMINADOS = [
  "Botas de seguridad",
  "Dotación",
  "Casco",
  "Tafilete",
  "Barbuquejo",
];

const ELEMENTOS_EPP_OTROS = [
  "Guantes patio",
  "Guantes fríos",
  "Guantes de vaqueta",
  "Gafas claras",
  "Gafas oscuras",
  "Guantes de lavado",
];

const ELEMENTOS_EPP = [
  ...ELEMENTOS_EPP_PREDETERMINADOS,
  ...ELEMENTOS_EPP_OTROS,
];

function obtenerElementosPredeterminados() {
  return [...ELEMENTOS_EPP_PREDETERMINADOS];
}

function crearOpcionCatalogoEpp(elemento, categoria) {
  const idSeguro = elemento
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return `
    <label class="epp-catalogo-opcion">
      <input
        type="checkbox"
        class="epp-catalogo-check"
        data-elemento="${elemento}"
        data-categoria="${categoria}"
        data-elemento-id="${idSeguro}"
      >
      <span>${elemento}</span>
    </label>
  `;
}

function crearPanelCatalogoEpp() {
  return `
    <div class="epp-catalogo-panel" hidden>

      <div class="epp-catalogo-grupo">
        <div class="epp-catalogo-titulo">
          Elementos predeterminados
        </div>

        <div class="epp-catalogo-lista">
          ${ELEMENTOS_EPP_PREDETERMINADOS.map((elemento) =>
            crearOpcionCatalogoEpp(elemento, "predeterminado"),
          ).join("")}
        </div>
      </div>

      <div class="epp-catalogo-grupo">
        <div class="epp-catalogo-titulo">
          Otros EPP
        </div>

        <div class="epp-catalogo-lista">
          ${ELEMENTOS_EPP_OTROS.map((elemento) =>
            crearOpcionCatalogoEpp(elemento, "otro"),
          ).join("")}
        </div>
      </div>

      <div class="epp-catalogo-acciones">
        <button
          type="button"
          class="add-btn btn-agregar-epp-seleccionados"
        >
          Agregar seleccionados
        </button>
      </div>

    </div>
  `;
}

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

  function init() {
    generarButton?.addEventListener("click", generarDesdeInput);

    agregarButton?.addEventListener("click", agregarTrabajador);

    container?.addEventListener("input", limpiarErrorCampo);

    container?.addEventListener("change", limpiarErrorCampo);

    container?.addEventListener("change", manejarCambioEvidencia);

    container?.addEventListener("click", manejarAccionesTrabajador);

    container?.addEventListener("change", manejarCambioCalificacionEpp);
  }

  function limpiarErrorCampo(event) {
    const elemento = event.target;

    if (elemento.matches("input, select, textarea")) {
      elemento.classList.remove("campo-error");
    }

    if (elemento.matches('[data-role="nombre"]')) {
      actualizarNombreResumen(elemento);
    }
  }

  function actualizarNombreResumen(input) {
    const tarjeta = input.closest(".trabajador-card");

    if (!tarjeta) {
      return;
    }

    const resumen = tarjeta.querySelector('[data-role="nombreResumen"]');

    if (!resumen) {
      return;
    }

    const nombre = input.value.trim();

    resumen.textContent = nombre || "Sin diligenciar";
  }

  async function manejarCambioEvidencia(event) {
    const input = event.target;

    if (!input.matches('[data-role="evidencia"]')) {
      return;
    }

    const tarjeta = input.closest(".trabajador-card");

    if (!tarjeta) {
      return;
    }

    const trabajadorId = Number(tarjeta.dataset.trabajadorId);

    const estado = tarjeta.querySelector('[data-role="evidenciaEstado"]');

    const archivo = input.files?.[0];

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

  // =======================================================
  // MANEJAR ACCIONES DEL TRABAJADOR
  // =======================================================

  function manejarAccionesTrabajador(event) {
    // -------------------------------------------------------
    // ABRIR / CERRAR CATÁLOGO EPP
    // -------------------------------------------------------

    const botonCatalogo = event.target.closest(".btn-toggle-catalogo-epp");

    if (botonCatalogo) {
      event.stopPropagation();

      const tarjeta = botonCatalogo.closest(".trabajador-card");

      if (!tarjeta) {
        return;
      }

      alternarCatalogoEpp(tarjeta, botonCatalogo);

      return;
    }

    // -------------------------------------------------------
    // AGREGAR EPP SELECCIONADOS
    // -------------------------------------------------------

    const botonAgregarEpp = event.target.closest(
      ".btn-agregar-epp-seleccionados",
    );

    if (botonAgregarEpp) {
      event.stopPropagation();

      const tarjeta = botonAgregarEpp.closest(".trabajador-card");

      if (!tarjeta) {
        return;
      }

      agregarElementosSeleccionados(tarjeta);

      return;
    }

    // -------------------------------------------------------
    // ELIMINAR ELEMENTO EPP
    // -------------------------------------------------------

    const botonEliminarEpp = event.target.closest(
      '[data-action="eliminar-epp"]',
    );

    if (botonEliminarEpp) {
      event.stopPropagation();

      const tarjeta = botonEliminarEpp.closest(".trabajador-card");

      const fila = botonEliminarEpp.closest("tr[data-elemento]");

      if (!tarjeta || !fila) {
        return;
      }

      eliminarElementoEpp(tarjeta, fila);

      return;
    }
    // -------------------------------------------------------
    // ELIMINAR TRABAJADOR
    // -------------------------------------------------------

    const botonEliminar = event.target.closest(
      '[data-action="eliminar-trabajador"]',
    );

    if (botonEliminar) {
      event.stopPropagation();

      const tarjeta = botonEliminar.closest(".trabajador-card");

      if (!tarjeta) {
        return;
      }

      eliminarTrabajador(tarjeta);

      return;
    }

    // -------------------------------------------------------
    // ABRIR / MINIMIZAR TRABAJADOR
    // -------------------------------------------------------

    const header = event.target.closest('[data-action="toggle-trabajador"]');

    if (!header) {
      return;
    }

    const tarjeta = header.closest(".trabajador-card");

    if (!tarjeta) {
      return;
    }

    if (tarjeta.classList.contains("trabajador-collapsed")) {
      abrirTrabajador(tarjeta);

      return;
    }

    tarjeta.classList.add("trabajador-collapsed");

    const icono = tarjeta.querySelector('[data-role="toggleIcon"]');

    if (icono) {
      icono.textContent = "▶";
    }
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

    const primerTrabajador = container.querySelector(".trabajador-card");

    abrirTrabajador(primerTrabajador);
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

    abrirTrabajador(trabajador);
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
  // ABRIR TRABAJADOR
  // =======================================================

  function abrirTrabajador(tarjeta) {
    if (!tarjeta) {
      return;
    }

    const tarjetas = container.querySelectorAll(".trabajador-card");

    tarjetas.forEach((item) => {
      const icono = item.querySelector('[data-role="toggleIcon"]');

      if (item === tarjeta) {
        item.classList.remove("trabajador-collapsed");

        if (icono) {
          icono.textContent = "▼";
        }
      } else {
        item.classList.add("trabajador-collapsed");

        if (icono) {
          icono.textContent = "▶";
        }
      }
    });
  }
  // =======================================================
  // CREAR TRABAJADOR
  // =======================================================

  function crearTrabajador(trabajadorId) {
    const card = document.createElement("article");

    card.className = "trabajador-card";
    card.dataset.trabajadorId = trabajadorId;

    card.innerHTML = `

    <!-- =====================================================
         CABECERA DEL TRABAJADOR
         Siempre permanece visible
         ===================================================== -->

    <div
      class="trabajador-card-header"
      data-action="toggle-trabajador"
    >

      <div class="trabajador-header-info">

        <span
          class="trabajador-toggle-icon"
          data-role="toggleIcon"
        >
          ▶
        </span>

        <div>

          <span
            class="trabajador-numero"
            data-role="numeroTrabajador"
          >
            Trabajador
          </span>

          <h3
            class="trabajador-nombre-resumen"
            data-role="nombreResumen"
          >
            Sin diligenciar
          </h3>

        </div>

      </div>


      <button
        type="button"
        class="btn-eliminar-trabajador"
        data-action="eliminar-trabajador"
        title="Eliminar trabajador"
      >
        Eliminar
      </button>

    </div>


    <!-- =====================================================
         CUERPO DEL TRABAJADOR
         TODO queda oculto cuando se minimiza
         ===================================================== -->

    <div class="trabajador-card-body">


      <!-- ===================================================
           DATOS DEL TRABAJADOR
           =================================================== -->

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


      <!-- ===================================================
           ELEMENTOS DE PROTECCIÓN PERSONAL
           =================================================== -->

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

                <th class="epp-col-accion">
                  Acción
                </th>

              </tr>

            </thead>

            <tbody>

              ${obtenerElementosPredeterminados()
                .map((elemento, elementoIndex) =>
                  crearFilaEpp(elemento, elementoIndex),
                )
                .join("")}

            </tbody>

          </table>

        </div>


        <!-- =================================================
             GESTIÓN DE ELEMENTOS EPP
             ================================================= -->

        <div class="epp-gestion">

          <button
            type="button"
            class="add-btn btn-toggle-catalogo-epp"
          >
            + Agregar elementos EPP
          </button>

          ${crearPanelCatalogoEpp()}

        </div>

      </div>


      <!-- ===================================================
           OBSERVACIONES GENERALES DEL TRABAJADOR
           =================================================== -->

      <div class="trabajador-observaciones">

        <div class="field">

          <label>
            Observaciones
          </label>

          <textarea
            rows="2"
            data-role="observaciones"
            placeholder="Registre observaciones adicionales."
          ></textarea>

        </div>

      </div>


      <!-- ===================================================
           CONSTANCIA DEL OPERARIO
           =================================================== -->

      <div class="trabajador-evidencia">


        <!-- INFORMACIÓN -->

        <div class="evidencia-info">

          <div class="trabajador-subtitulo">
            Constancia del operario
          </div>

          <p>
            Registre una evidencia fotográfica como constancia
            de que el trabajador fue informado de la inspección.
          </p>

        </div>


        <!-- CONTROL DE EVIDENCIA -->

        <div class="evidencia-control">

          <label class="btn-evidencia">

            <svg
              class="icon-evidencia"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >

              <path
                d="M12 16V4"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              />

              <path
                d="M7 9l5-5 5 5"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />

              <path
                d="M5 20h14"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              />

            </svg>

            <span>
              Seleccionar evidencia
            </span>

            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              data-role="evidencia"
            />

          </label>


          <div
            class="evidencia-estado"
            data-role="evidenciaEstado"
          >
            Sin evidencia
          </div>

        </div>

      </div>


    </div>
  `;

    card.classList.add("trabajador-collapsed");

    return card;
  }

  // =======================================================
  // FILA EPP
  // =======================================================

  function crearFilaEpp(elemento, elementoIndex) {
    return `
    <tr
      data-epp-index="${elementoIndex}"
      data-elemento="${elemento}"
      class="epp-fila"
    >

      <td class="epp-nombre">
        ${elemento}
      </td>

      <td>
        ${crearSelectCalificacion("condicion")}
      </td>

      <td>
        ${crearSelectCalificacion("uso")}
      </td>

      <td class="epp-accion">
        <button
          type="button"
          class="btn-eliminar-epp"
          data-action="eliminar-epp"
          title="Eliminar elemento EPP"
          aria-label="Eliminar ${elemento}"
        >
          <svg
            class="icon-trash-epp"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              d="M3 6h18"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />

            <path
              d="M8 6V4h8v2"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />

            <path
              d="M19 6l-1 14H6L5 6"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />

            <path
              d="M10 11v5M14 11v5"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
        </button>
      </td>

    </tr>

    <tr
      class="epp-plan-row"
      data-plan-elemento="${elemento}"
      hidden
    >
      <td colspan="4">

        <div class="epp-plan-container">

          <div class="field epp-plan-field">
            <label>
              Plan de acción
              <span class="required">*</span>
            </label>

            <textarea
              data-role="epp-plan-accion"
              rows="2"
              placeholder="Describa la acción correctiva para ${elemento}."
            ></textarea>
          </div>

          <div class="field epp-fecha-field">
            <label>
              Fecha límite
              <span class="required">*</span>
            </label>

            <input
              type="date"
              data-role="epp-fecha-plan"
            >
          </div>

        </div>

      </td>
    </tr>
  `;
  }

  function requierePlanAccion(condicion, uso) {
    if (!condicion || !uso) {
      return false;
    }

    return condicion === "R" || condicion === "M" || uso === "R" || uso === "M";
  }

  function manejarCambioCalificacionEpp(event) {
    const select = event.target.closest(".epp-calificacion");

    if (!select) {
      return;
    }

    const fila = select.closest("tr[data-elemento]");

    if (!fila) {
      return;
    }

    actualizarPlanElemento(fila);
  }

  function actualizarPlanElemento(fila) {
    if (!fila) {
      return;
    }

    const condicion = fila.querySelector('[data-role="condicion"]')?.value;

    const uso = fila.querySelector('[data-role="uso"]')?.value;

    const filaPlan = fila.nextElementSibling;

    if (!filaPlan || !filaPlan.classList.contains("epp-plan-row")) {
      return;
    }

    const plan = filaPlan.querySelector('[data-role="epp-plan-accion"]');

    const fecha = filaPlan.querySelector('[data-role="epp-fecha-plan"]');

    const fechaInspeccion =
      document.querySelector('[name="fecha"]')?.value || "";

    // -------------------------------------------------------
    // ESTABLECER FECHA MÍNIMA DEL PLAN
    // -------------------------------------------------------

    if (fecha) {
      if (fechaInspeccion) {
        fecha.min = fechaInspeccion;
      } else {
        fecha.removeAttribute("min");
      }
    }

    // -------------------------------------------------------
    // DETERMINAR SI REQUIERE PLAN
    // -------------------------------------------------------

    const mostrar = requierePlanAccion(condicion, uso);

    filaPlan.hidden = !mostrar;

    // -------------------------------------------------------
    // SI YA NO REQUIERE PLAN, LIMPIAR LOS DATOS
    // -------------------------------------------------------

    if (!mostrar) {
      if (plan) {
        plan.value = "";
        plan.classList.remove("campo-error");
      }

      if (fecha) {
        fecha.value = "";
        fecha.classList.remove("campo-error");
      }
    }
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

  function obtenerElementosActuales(card) {
    return Array.from(
      card.querySelectorAll(".epp-table tbody tr[data-elemento]"),
    ).map((fila) => fila.dataset.elemento);
  }

  function sincronizarCatalogoEpp(card) {
    const elementosActuales = new Set(obtenerElementosActuales(card));

    const checks = card.querySelectorAll(".epp-catalogo-check");

    checks.forEach((check) => {
      const yaAgregado = elementosActuales.has(check.dataset.elemento);

      check.checked = false;
      check.disabled = yaAgregado;

      const opcion = check.closest(".epp-catalogo-opcion");

      if (opcion) {
        opcion.classList.toggle("epp-catalogo-opcion-agregada", yaAgregado);
      }
    });
  }

  function alternarCatalogoEpp(card, boton) {
    const panel = card.querySelector(".epp-catalogo-panel");

    if (!panel) {
      return;
    }

    const abrir = panel.hidden;

    if (abrir) {
      sincronizarCatalogoEpp(card);
    }

    panel.hidden = !abrir;

    boton.textContent = abrir
      ? "− Ocultar elementos EPP"
      : "+ Agregar elementos EPP";
  }

  function agregarElementosSeleccionados(card) {
    const seleccionados = Array.from(
      card.querySelectorAll(".epp-catalogo-check:checked:not(:disabled)"),
    );

    if (seleccionados.length === 0) {
      return;
    }

    const tbody = card.querySelector(".epp-table tbody");

    if (!tbody) {
      return;
    }

    const elementosActuales = new Set(obtenerElementosActuales(card));

    seleccionados.forEach((check) => {
      const elemento = check.dataset.elemento;

      if (!elemento || elementosActuales.has(elemento)) {
        return;
      }

      const nuevoIndex = tbody.querySelectorAll("tr[data-elemento]").length;

      tbody.insertAdjacentHTML("beforeend", crearFilaEpp(elemento, nuevoIndex));

      elementosActuales.add(elemento);
    });

    sincronizarCatalogoEpp(card);

    const panel = card.querySelector(".epp-catalogo-panel");

    const boton = card.querySelector(".btn-toggle-catalogo-epp");

    if (panel) {
      panel.hidden = true;
    }

    if (boton) {
      boton.textContent = "+ Agregar elementos EPP";
    }
  }

  function eliminarElementoEpp(card, fila) {
    if (!card || !fila) {
      return;
    }

    const tbody = card.querySelector(".epp-table tbody");

    if (!tbody) {
      return;
    }

    const filas = tbody.querySelectorAll("tr[data-elemento]");

    if (filas.length <= 1) {
      mostrarEstado("Cada trabajador debe tener al menos un elemento EPP.");

      return;
    }

    // -------------------------------------------------------
    // BUSCAR FILA DEL PLAN ASOCIADA AL ELEMENTO
    // -------------------------------------------------------

    const filaPlan = fila.nextElementSibling;

    const tieneFilaPlan = filaPlan?.classList.contains("epp-plan-row");

    // -------------------------------------------------------
    // ELIMINAR PLAN DEL ELEMENTO
    // -------------------------------------------------------

    if (tieneFilaPlan) {
      filaPlan.remove();
    }

    // -------------------------------------------------------
    // ELIMINAR ELEMENTO EPP
    // -------------------------------------------------------

    fila.remove();

    // -------------------------------------------------------
    // ACTUALIZAR CATÁLOGO
    // -------------------------------------------------------

    sincronizarCatalogoEpp(card);
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

  // =======================================================
  // VALIDAR TRABAJADORES
  // =======================================================

  function validar() {
    const tarjetas = container.querySelectorAll(".trabajador-card");

    // =====================================================
    // FECHA DE LA INSPECCIÓN
    // =====================================================

    const inputFechaInspeccion =
      document.querySelector('[data-role="fecha-inspeccion"]') ||
      document.querySelector("#fecha-inspeccion") ||
      document.querySelector("#fechaInspeccion") ||
      document.querySelector('[name="fecha"]');

    const fechaInspeccion = inputFechaInspeccion?.value || "";

    // -----------------------------------------------------
    // DEBE EXISTIR AL MENOS UN TRABAJADOR
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
    // RECORRER TRABAJADORES
    // -----------------------------------------------------

    for (
      let trabajadorIndex = 0;
      trabajadorIndex < tarjetas.length;
      trabajadorIndex++
    ) {
      const tarjeta = tarjetas[trabajadorIndex];

      const numeroTrabajador = trabajadorIndex + 1;

      const trabajadorId = Number(tarjeta.dataset.trabajadorId);

      // ===================================================
      // DATOS DEL TRABAJADOR
      // ===================================================

      const nombre = tarjeta.querySelector('[data-role="nombre"]');

      const codigo = tarjeta.querySelector('[data-role="codigo"]');

      const cargo = tarjeta.querySelector('[data-role="cargo"]');

      if (!nombre?.value.trim()) {
        abrirTrabajador(tarjeta);

        return marcarError(
          nombre,
          `Trabajador ${numeroTrabajador}: ingrese el nombre y apellido.`,
        );
      }

      if (!codigo?.value.trim()) {
        abrirTrabajador(tarjeta);

        return marcarError(
          codigo,
          `Trabajador ${numeroTrabajador}: ingrese el código.`,
        );
      }

      if (!cargo?.value.trim()) {
        abrirTrabajador(tarjeta);

        return marcarError(
          cargo,
          `Trabajador ${numeroTrabajador}: ingrese la labor o cargo.`,
        );
      }

      // ===================================================
      // ELEMENTOS EPP
      // ===================================================

      const filasEpp = tarjeta.querySelectorAll("tr[data-elemento]");

      // ---------------------------------------------------
      // DEBE EXISTIR AL MENOS UN ELEMENTO EPP
      // ---------------------------------------------------

      if (filasEpp.length === 0) {
        abrirTrabajador(tarjeta);

        mostrarEstado(
          `Trabajador ${numeroTrabajador}: debe tener al menos un elemento EPP.`,
        );

        return {
          valido: false,
          mensaje: `Trabajador ${numeroTrabajador}: debe tener al menos un elemento EPP.`,
        };
      }

      // ===================================================
      // RECORRER ELEMENTOS EPP
      // ===================================================

      for (
        let elementoIndex = 0;
        elementoIndex < filasEpp.length;
        elementoIndex++
      ) {
        const fila = filasEpp[elementoIndex];

        const nombreElemento =
          fila.dataset.elemento ||
          fila.querySelector(".epp-nombre")?.textContent?.trim() ||
          `Elemento ${elementoIndex + 1}`;

        const condicion = fila.querySelector('[data-role="condicion"]');

        const uso = fila.querySelector('[data-role="uso"]');

        // -------------------------------------------------
        // CONDICIÓN OBLIGATORIA
        // -------------------------------------------------

        if (!condicion?.value) {
          abrirTrabajador(tarjeta);

          return marcarError(
            condicion,
            `Trabajador ${numeroTrabajador}: seleccione la condición de "${nombreElemento}".`,
          );
        }

        // -------------------------------------------------
        // USO OBLIGATORIO
        // -------------------------------------------------

        if (!uso?.value) {
          abrirTrabajador(tarjeta);

          return marcarError(
            uso,
            `Trabajador ${numeroTrabajador}: seleccione el uso de "${nombreElemento}".`,
          );
        }

        // =================================================
        // PLAN DE ACCIÓN POR ELEMENTO
        // =================================================

        const requierePlan = requierePlanAccion(condicion.value, uso.value);

        if (requierePlan) {
          const filaPlan = fila.nextElementSibling;

          const planAccion = filaPlan?.querySelector(
            '[data-role="epp-plan-accion"]',
          );

          const fechaPlanAccion = filaPlan?.querySelector(
            '[data-role="epp-fecha-plan"]',
          );

          // -----------------------------------------------
          // PLAN DE ACCIÓN OBLIGATORIO
          // -----------------------------------------------

          if (!planAccion?.value.trim()) {
            abrirTrabajador(tarjeta);

            return marcarError(
              planAccion,
              `Trabajador ${numeroTrabajador}: registre el plan de acción para "${nombreElemento}".`,
            );
          }

          // -----------------------------------------------
          // FECHA LÍMITE OBLIGATORIA
          // -----------------------------------------------

          if (!fechaPlanAccion?.value) {
            abrirTrabajador(tarjeta);

            return marcarError(
              fechaPlanAccion,
              `Trabajador ${numeroTrabajador}: registre la fecha límite del plan de acción para "${nombreElemento}".`,
            );
          }

          // -----------------------------------------------
          // FECHA DEL PLAN NO PUEDE SER ANTERIOR
          // A LA FECHA DE LA INSPECCIÓN
          // -----------------------------------------------

          if (fechaInspeccion && fechaPlanAccion.value < fechaInspeccion) {
            abrirTrabajador(tarjeta);

            return marcarError(
              fechaPlanAccion,
              `Trabajador ${numeroTrabajador}: la fecha límite del plan de acción para "${nombreElemento}" no puede ser anterior a la fecha de la inspección.`,
            );
          }
        }
      }

      // ===================================================
      // EVIDENCIA FOTOGRÁFICA
      // ===================================================

      const inputEvidencia = tarjeta.querySelector('[data-role="evidencia"]');

      // La validación se realiza contra el Map de archivos
      // optimizados, no contra input.files.
      //
      // Esto garantiza que la fotografía fue procesada
      // correctamente antes de continuar.

      if (!evidencias.has(trabajadorId)) {
        abrirTrabajador(tarjeta);

        return marcarError(
          inputEvidencia,
          `Trabajador ${numeroTrabajador}: registre la evidencia fotográfica de constancia del operario.`,
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

    const trabajadores = Array.from(tarjetas).map(
      (tarjeta, trabajadorIndex) => {
        // =================================================
        // ELEMENTOS EPP
        // =================================================

        const filasEpp = tarjeta.querySelectorAll("tr[data-elemento]");

        const elementos = Array.from(filasEpp).map((fila, elementoIndex) => {
          // ---------------------------------------------
          // DATOS DEL ELEMENTO EPP
          // ---------------------------------------------

          const elemento =
            fila.dataset.elemento ||
            fila.querySelector(".epp-nombre")?.textContent?.trim() ||
            "";

          const condicion =
            fila.querySelector('[data-role="condicion"]')?.value || "";

          const uso = fila.querySelector('[data-role="uso"]')?.value || "";

          // ---------------------------------------------
          // FILA DEL PLAN ASOCIADA AL ELEMENTO
          // ---------------------------------------------

          const filaPlan = fila.nextElementSibling;

          const esFilaPlan = filaPlan?.classList.contains("epp-plan-row");

          // ---------------------------------------------
          // PLAN DE ACCIÓN DEL ELEMENTO
          // ---------------------------------------------

          const planAccion = esFilaPlan
            ? filaPlan
                .querySelector('[data-role="epp-plan-accion"]')
                ?.value.trim() || ""
            : "";

          // ---------------------------------------------
          // FECHA DEL PLAN DEL ELEMENTO
          // ---------------------------------------------

          const fechaPlanAccion = esFilaPlan
            ? filaPlan.querySelector('[data-role="epp-fecha-plan"]')?.value ||
              ""
            : "";

          // ---------------------------------------------
          // RETORNAR ELEMENTO
          // ---------------------------------------------

          return {
            indice: elementoIndex,
            elemento,
            condicion,
            uso,
            planAccion,
            fechaPlanAccion,
          };
        });

        // =================================================
        // RETORNAR TRABAJADOR
        // =================================================

        return {
          trabajadorId: Number(tarjeta.dataset.trabajadorId),

          indice: trabajadorIndex,

          nombre:
            tarjeta.querySelector('[data-role="nombre"]')?.value.trim() || "",

          codigo:
            tarjeta.querySelector('[data-role="codigo"]')?.value.trim() || "",

          cargo:
            tarjeta.querySelector('[data-role="cargo"]')?.value.trim() || "",

          elementos,

          observaciones:
            tarjeta
              .querySelector('[data-role="observaciones"]')
              ?.value.trim() || "",
        };
      },
    );

    // =====================================================
    // LOG TEMPORAL DE PRUEBA
    // =====================================================

    console.log("📋 Trabajadores EPP:", trabajadores);

    console.log(
      "📋 Trabajadores EPP JSON:",
      JSON.stringify(trabajadores, null, 2),
    );

    // =====================================================
    // RETORNAR TRABAJADORES
    // =====================================================

    return trabajadores;
  }

  // =======================================================
  // OBTENER EVIDENCIAS
  // =======================================================

  function obtenerEvidencias() {
    const tarjetas = container.querySelectorAll(".trabajador-card");

    return Array.from(tarjetas)
      .map((tarjeta, indice) => {
        const trabajadorId = Number(tarjeta.dataset.trabajadorId);

        const archivo = evidencias.get(trabajadorId);

        if (!archivo) {
          return null;
        }

        return {
          trabajadorId,

          indice,

          archivo,
        };
      })
      .filter(Boolean);
  }

  // =======================================================
  // API PÚBLICA
  // =======================================================

  return {
    init,

    generar,

    validar,

    leer,

    obtenerEvidencias,

    getCantidad() {
      return cantidadActual;
    },
  };
}
