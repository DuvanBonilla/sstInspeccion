
import { optimizarImagen } from "./imageOptimizer.js";

const ELEMENTOS_EPP = [
  "Dotación",
  "Botas de seguridad",
  "Casco",
  "Tafilete",
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
    // ELIMINAR
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
    // ABRIR / MINIMIZAR
    // -------------------------------------------------------

    const header = event.target.closest('[data-action="toggle-trabajador"]');

    if (!header) {
      return;
    }

    const tarjeta = header.closest(".trabajador-card");

    if (!tarjeta) {
      return;
    }

    // Si está cerrada, abrirla y cerrar las demás.
    if (tarjeta.classList.contains("trabajador-collapsed")) {
      abrirTrabajador(tarjeta);

      return;
    }

    // Si ya está abierta permitimos minimizarla.
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
       Esta sección se oculta al minimizar
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


    <!-- ===================================================
         PLAN DE ACCIÓN Y OBSERVACIONES
         =================================================== -->

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


    <!-- ===================================================
         CONSTANCIA DEL OPERARIO
         =================================================== -->

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

  // =======================================================
  // VALIDAR TRABAJADORES
  // =======================================================

  function validar() {
    const tarjetas = container.querySelectorAll(".trabajador-card");

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

        // -------------------------------------------------
        // DETECTAR NOVEDAD
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
        abrirTrabajador(tarjeta);

        return marcarError(
          planAccion,
          `Trabajador ${numeroTrabajador}: debe registrar un plan de acción porque existen elementos calificados como Malo o Regular.`,
        );
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
