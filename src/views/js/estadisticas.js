/*
  estadisticas.js — Dashboard de estadísticas de inspecciones.
*/
(function () {
  const form = document.getElementById("filtros-form");
  const inputBusqueda = form.elements.q;
  const selectEstado = form.elements.estado;
  const selectSede = form.elements.sedeOperacion;

  const btnPrev = document.getElementById("btn-prev");
  const btnNext = document.getElementById("btn-next");
  const tablaBody = document.getElementById("tabla-body");
  const tablaMeta = document.getElementById("tabla-meta");
  const pageInfo = document.getElementById("page-info");
  const columnasOrdenables = document.querySelectorAll("th[data-sort]");

  const reinicioModal = document.getElementById("reinicio-modal");
  const reinicioForm = document.getElementById("reinicio-form");
  const reinicioDigitos = Array.from(
    document.querySelectorAll(".reinicio-codigo-digito"),
  );
  const reinicioError = document.getElementById("reinicio-error");
  const btnReinicioCancelar = document.getElementById("reinicio-cancelar");

  const reinicioConfirmacion = document.getElementById("reinicio-confirmacion");
  const reinicioPasoSolicitud = document.getElementById(
    "reinicio-paso-solicitud",
  );
  const reinicioPasoCodigo = document.getElementById("reinicio-paso-codigo");
  const btnReinicioConfirmar = document.getElementById("reinicio-confirmar");
  const btnReinicioSolicitarCodigo = document.getElementById(
    "reinicio-solicitar-codigo",
  );

  let temporizadorReinicio = null;

  let codigoReinicioSolicitado = false;

  let botonReinicioSeleccionado = null;

  const kpis = {
    total: document.getElementById("kpi-total"),
    pendientes: document.getElementById("kpi-pendientes"),
    aprobadas: document.getElementById("kpi-aprobadas"),
    enviadas: document.getElementById("kpi-enviadas"),
    mes: document.getElementById("kpi-mes"),
  };

  const sedesLista = document.getElementById("sedes-lista");

  const state = {
    page: 1,
    pageSize: 10,
    totalPages: 1,
    total: 0,

    sortBy: null,
    sortOrder: "asc",
  };

  /**
   * Obtiene los filtros activos del dashboard de inspecciones SST.
   *
   * Lee el rango de fechas, la sede, el estado y el término de búsqueda,
   * normalizando los valores antes de utilizarlos en las consultas.
   *
   * @returns {{
   *   fechaDesde: string,
   *   fechaHasta: string,
   *   sedeOperacion: string,
   *   estado: string,
   *   q: string
   * }} Filtros seleccionados por el usuario.
   */

  function leerFiltros() {
    const fd = new FormData(form);

    const filtros = {
      fechaDesde: String(fd.get("fechaDesde") || "").trim(),
      fechaHasta: String(fd.get("fechaHasta") || "").trim(),
      sedeOperacion: String(fd.get("sedeOperacion") || "").trim(),
      estado: String(fd.get("estado") || "").trim(),
      q: String(fd.get("q") || "").trim(),
    };

    return filtros;
  }

  function crearQuery(params) {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== "" && v != null) sp.set(k, String(v));
    });
    return sp.toString();
  }

  function formatearFecha(isoDate) {
    if (!isoDate) return "-";
    const d = new Date(isoDate);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("es-CO", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }

  /**
   * Actualiza los indicadores principales del dashboard SST.
   *
   * Presenta las cantidades totales, pendientes, aprobadas, enviadas,
   * registradas durante el mes y la distribución de inspecciones por sede.
   *
   * @param {Object} resumen - Resumen estadístico obtenido desde el backend.
   * @returns {void}
   */

  function setKpis(resumen) {
    kpis.total.textContent = resumen.total || 0;
    kpis.pendientes.textContent = resumen.pendientes || 0;
    kpis.aprobadas.textContent = resumen.aprobadas || 0;
    kpis.enviadas.textContent = resumen.enviadas || 0;
    kpis.mes.textContent = resumen.esteMes || 0;

    const sedes = Array.isArray(resumen.porSede) ? resumen.porSede : [];
    sedesLista.innerHTML = sedes.length
      ? sedes
          .map((s) => `<span class="sede-chip">${s.sede}: ${s.cantidad}</span>`)
          .join("")
      : '<span class="sede-chip">Sin datos para estos filtros</span>';
  }

  function renderEstado(estado) {
    const safe = estado || "sin_estado";

    const nombres = {
      pendiente_aprobacion: "Pendiente aprobación",
      enviada: "Enviada",
      aprobada: "Aprobada",
    };

    return `
    <span
      class="estado-dot estado-${safe}"
      title="${nombres[safe] || safe}">
    </span>
  `;
  }

  /**
   * Renderiza las inspecciones SST en la tabla del dashboard.
   *
   * Por cada inspección presenta sus datos generales, estado, cantidad total
   * de elementos inspeccionados y las acciones para recuperar los enlaces de
   * aprobación o consultar el informe.
   *
   * @param {Array<Object>} items - Inspecciones SST que deben mostrarse.
   * @returns {void}
   */

  function renderTabla(items) {
    if (!Array.isArray(items) || items.length === 0) {
      tablaBody.innerHTML =
        '<tr><td colspan="9">No hay inspecciones para los filtros seleccionados.</td></tr>';
      return;
    }

    tablaBody.innerHTML = items
      .map((it) => {
        const totalItems =
          Number(it.extintores || 0) +
          Number(it.camillas || 0) +
          Number(it.senalizaciones || 0) +
          Number(it.equipos || 0) +
          Number(it.botiquines || 0);

        const recuperarBtn = `
<button
    type="button"
    class="btn-recuperar accion-btn accion-btn-links"
    data-inspeccion-id="${it.inspeccion_id}"
    data-num-inspeccion="${it.inspecciones_id}"
    ${it.estado === "pendiente_aprobacion" ? "" : "disabled"}>

<svg xmlns="http://www.w3.org/2000/svg"
     fill="none"
     viewBox="0 0 24 24"
     stroke-width="2"
     stroke="currentColor">
  <path stroke-linecap="round"
        stroke-linejoin="round"
        d="M8.25 7.5H6.375A2.625 2.625 0 003.75 10.125v7.5A2.625 2.625 0 006.375 20.25h7.5a2.625 2.625 0 002.625-2.625V15.75M15.75 3.75H20.25m0 0v4.5m0-4.5L10.5 13.5"/>
</svg>

    
</button>
`;

        const verPdfBtn = `
<button
    type="button"
    class="btn-ver-pdf accion-btn accion-btn-pdf"
    data-inspeccion-id="${it.inspeccion_id}">

    <svg xmlns="http://www.w3.org/2000/svg"
         fill="none"
         viewBox="0 0 24 24"
         stroke-width="2"
         stroke="currentColor">

        <path stroke-linecap="round"
              stroke-linejoin="round"
              d="M19.5 14.25v4.125A2.625 2.625 0 0116.875 21H7.125A2.625 2.625 0 014.5 18.375V5.625A2.625 2.625 0 017.125 3h6.19a2.25 2.25 0 011.591.659l3.935 3.935A2.25 2.25 0 0119.5 9.185V14.25z"/>

        <path stroke-linecap="round"
              stroke-linejoin="round"
              d="M9 15h6M9 11h6"/>
    </svg>

    

</button>
`;

        const reiniciarAprobacionesBtn = `
  <button
    type="button"
    class="btn-reiniciar-aprobaciones accion-btn"
    data-inspeccion-id="${it.inspeccion_id}"
    title="Reiniciar aprobaciones"
    aria-label="Reiniciar aprobaciones de Jefe de Área y COPASST"
    ${it.estado === "pendiente_aprobacion" ? "" : "disabled"}>

    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke-width="2"
      stroke="currentColor">

      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.992 0 3.181 3.183a8.25 8.25 0 0013.803-3.7M4.929 4.929A8.25 8.25 0 0118.77 8.12l3.181-3.182m0 0v4.992" />
    </svg>
  </button>
`;
        return `
          <tr>
            <td>${it.inspecciones_id ?? "-"}</td>
            <td>${it.inspeccion_id || "-"}</td>
            <td>${formatearFecha(it.created_at)}</td>
            <td>${it.sede_operacion || "-"}</td>
            <td>${it.area_trabajo || "-"}</td>
            <td>${it.responsable_inspeccion || "-"}</td>
            <td>${renderEstado(it.estado)}</td>
            <td>${totalItems}</td>
            <td>
              <div class="acciones-botones">
                ${recuperarBtn}
                ${verPdfBtn}
                ${reiniciarAprobacionesBtn}
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
  }

  function updatePaginacion() {
    pageInfo.textContent = `Página ${state.page} de ${state.totalPages}`;
    btnPrev.disabled = state.page <= 1;
    btnNext.disabled = state.page >= state.totalPages;
    tablaMeta.textContent = `${state.total} inspecciones encontradas`;
  }

  /**
   * Consulta y presenta el resumen estadístico de las inspecciones SST.
   *
   * Envía los filtros activos al endpoint de estadísticas y utiliza la
   * respuesta para actualizar los indicadores del dashboard.
   *
   * @async
   * @param {Object} filtros - Filtros aplicados a la consulta.
   * @returns {Promise<void>}
   * @throws {Error} Si el resumen no puede obtenerse desde el backend.
   */

  async function cargarResumen(filtros) {
    const query = crearQuery(filtros);

    const resp = await fetch(`/api/estadisticas/resumen?${query}`);

    const data = await resp.json();

    if (!resp.ok || !data.ok) {
      throw new Error("No fue posible cargar el resumen");
    }

    setKpis(data.resumen || {});
  }

  /**
   * Consulta las inspecciones SST y actualiza la tabla del dashboard.
   *
   * Incorpora los filtros, la página actual y el ordenamiento seleccionado.
   * Después de recibir la respuesta, actualiza la tabla y el estado de
   * paginación.
   *
   * @async
   * @param {Object} filtros - Filtros activos del dashboard.
   * @returns {Promise<void>}
   * @throws {Error} Si las inspecciones no pueden obtenerse desde el backend.
   */

  async function cargarTabla(filtros) {
    const query = crearQuery({
      ...filtros,
      page: state.page,
      pageSize: state.pageSize,
      sortBy: state.sortBy,
      sortOrder: state.sortOrder,
    });

    const resp = await fetch(`/api/estadisticas/inspecciones?${query}`);

    const data = await resp.json();

    if (!resp.ok) {
      throw new Error("No fue posible cargar la tabla");
    }

    state.total = Number(data.total || 0);
    state.totalPages = Number(data.totalPages || 1);

    renderTabla(data.items || []);

    updatePaginacion();
  }

  /**
   * Actualiza el resumen y la tabla principal de inspecciones SST.
   *
   * Obtiene los filtros activos y ejecuta simultáneamente las consultas del
   * resumen estadístico y del listado paginado de inspecciones.
   *
   * @async
   * @returns {Promise<void>}
   */

  async function cargarTodo() {
    try {
      const filtros = leerFiltros();

      await Promise.all([cargarResumen(filtros), cargarTabla(filtros)]);
    } catch {
      tablaBody.innerHTML =
        '<tr><td colspan="9">Error cargando estadísticas. Intenta de nuevo.</td></tr>';

      tablaMeta.textContent = "";
    }
  }

  async function actualizarFiltros() {
    state.page = 1;

    await cargarTodo();
  }

  inputBusqueda.addEventListener("input", () => {
    actualizarFiltros();
  });

  selectEstado.addEventListener("change", () => {
    actualizarFiltros();
  });

  selectSede.addEventListener("change", () => {
    actualizarFiltros();
  });

  columnasOrdenables.forEach((columna) => {
    columna.addEventListener("click", () => {
      const campo = columna.dataset.sort;

      if (state.sortBy === campo) {
        state.sortOrder = state.sortOrder === "asc" ? "desc" : "asc";
      } else {
        state.sortBy = campo;
        state.sortOrder = "asc";
      }

      // Actualizar las flechas
      columnasOrdenables.forEach((c) => {
        c.classList.remove("asc", "desc");

        if (c.dataset.sort === state.sortBy) {
          c.classList.add(state.sortOrder);
        }
      });

      state.page = 1;

      cargarTabla();
    });
  });

  btnPrev.addEventListener("click", () => {
    if (state.page <= 1) return;
    state.page -= 1;
    cargarTabla();
  });

  btnNext.addEventListener("click", () => {
    if (state.page >= state.totalPages) return;
    state.page += 1;
    cargarTabla();
  });

  tablaBody.addEventListener("click", (e) => {
    const btnRecuperar = e.target.closest(".btn-recuperar");

    if (btnRecuperar) {
      recuperarLinks(btnRecuperar);

      return;
    }

    const btnPdf = e.target.closest(".btn-ver-pdf");

    if (btnPdf) {
      verPdf(btnPdf);

      return;
    }

    const btnReiniciar = e.target.closest(".btn-reiniciar-aprobaciones");

    if (btnReiniciar) {
      abrirModalReinicio(btnReiniciar);
    }
  });

  function abrirModalReinicio(boton) {
    botonReinicioSeleccionado = boton;
    codigoReinicioSolicitado = false;

    reinicioForm.reset();

    reinicioPasoSolicitud.classList.remove("hidden");
    reinicioPasoCodigo.classList.add("hidden");

    btnReinicioSolicitarCodigo.disabled = true;

    reinicioError.textContent = "";
    reinicioError.classList.add("hidden");

    reinicioModal.classList.remove("hidden");
    reinicioConfirmacion.focus();
  }

  function cerrarModalReinicio() {
    reinicioModal.classList.add("hidden");
    clearInterval(temporizadorReinicio);

    reinicioForm.reset();

    codigoReinicioSolicitado = false;
    botonReinicioSeleccionado = null;

    reinicioPasoSolicitud.classList.remove("hidden");
    reinicioPasoCodigo.classList.add("hidden");

    btnReinicioSolicitarCodigo.disabled = true;

    reinicioError.textContent = "";
    reinicioError.classList.add("hidden");
  }

  btnReinicioCancelar.addEventListener("click", cerrarModalReinicio);

  reinicioConfirmacion.addEventListener("change", () => {
    btnReinicioSolicitarCodigo.disabled = !reinicioConfirmacion.checked;
  });

  reinicioDigitos.forEach((input, indice) => {
    input.addEventListener("input", () => {
      input.value = input.value.replace(/\D/g, "").slice(-1);

      if (input.value && reinicioDigitos[indice + 1]) {
        reinicioDigitos[indice + 1].focus();
      }
    });

    input.addEventListener("keydown", (event) => {
      if (
        event.key === "Backspace" &&
        !input.value &&
        reinicioDigitos[indice - 1]
      ) {
        reinicioDigitos[indice - 1].focus();
      }
    });

    input.addEventListener("paste", (event) => {
      const digitos = event.clipboardData
        .getData("text")
        .replace(/\D/g, "")
        .slice(0, 6);

      if (!digitos) return;

      event.preventDefault();

      digitos.split("").forEach((digito, posicion) => {
        if (reinicioDigitos[posicion]) {
          reinicioDigitos[posicion].value = digito;
        }
      });

      reinicioDigitos[Math.min(digitos.length, 6) - 1].focus();
    });
  });

  function iniciarContadorReinicio(venceEn) {
    clearInterval(temporizadorReinicio);

    const contador = document.getElementById("reinicio-contador");

    function actualizar() {
      const restante = new Date(venceEn).getTime() - Date.now();

      if (restante <= 0) {
        clearInterval(temporizadorReinicio);
        contador.textContent = "El código expiró. Solicita uno nuevo.";
        return;
      }

      const minutos = Math.floor(restante / 60000);
      const segundos = Math.floor((restante % 60000) / 1000);

      contador.textContent = `El código expira en ${minutos}:${String(segundos).padStart(2, "0")}.`;
    }

    actualizar();
    temporizadorReinicio = setInterval(actualizar, 1000);
  }

  btnReinicioSolicitarCodigo.addEventListener("click", async () => {
    if (!botonReinicioSeleccionado || !reinicioConfirmacion.checked) {
      return;
    }

    btnReinicioSolicitarCodigo.disabled = true;
    reinicioError.textContent = "";
    reinicioError.classList.add("hidden");

    try {
      const inspeccionId = botonReinicioSeleccionado.dataset.inspeccionId;

      const respuesta = await fetch(
        `/api/inspecciones/${encodeURIComponent(
          inspeccionId,
        )}/reinicio-aprobaciones/solicitar-codigo`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        },
      );

      const data = await respuesta.json();

      if (!respuesta.ok || !data.ok) {
        throw new Error(data.mensaje || "No fue posible solicitar el código.");
      }
      iniciarContadorReinicio(data.venceEn);

      codigoReinicioSolicitado = true;
      reinicioPasoSolicitud.classList.add("hidden");
      reinicioPasoCodigo.classList.remove("hidden");
      reinicioDigitos[0].focus();
    } catch (error) {
      console.error("Error solicitando código de reinicio:", error);

      reinicioError.textContent =
        error.message || "No fue posible solicitar el código.";

      reinicioError.classList.remove("hidden");
      btnReinicioSolicitarCodigo.disabled = !reinicioConfirmacion.checked;
    }
  });

  reinicioForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!botonReinicioSeleccionado || !codigoReinicioSolicitado) {
      return;
    }

    const codigo = reinicioDigitos.map((input) => input.value).join("");

    if (!/^\d{6}$/.test(codigo)) {
      reinicioError.textContent =
        "Ingresa el código de autorización de seis dígitos.";
      reinicioError.classList.remove("hidden");
      reinicioDigitos[0].focus();
      return;
    }

    btnReinicioConfirmar.disabled = true;
    reinicioError.textContent = "";
    reinicioError.classList.add("hidden");

    try {
      const inspeccionId = botonReinicioSeleccionado.dataset.inspeccionId;

      const respuesta = await fetch(
        `/api/inspecciones/${encodeURIComponent(
          inspeccionId,
        )}/reinicio-aprobaciones/confirmar`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ codigo }),
        },
      );

      const data = await respuesta.json();

      if (!respuesta.ok || !data.ok) {
        throw new Error(
          data.mensaje || "No fue posible confirmar el reinicio.",
        );
      }

      cerrarModalReinicio();
      window.alert(data.mensaje);
      await cargarTodo();
    } catch (error) {
      console.error("Error confirmando reinicio de aprobaciones:", error);

      reinicioError.textContent =
        error.message || "No fue posible confirmar el reinicio.";

      reinicioError.classList.remove("hidden");
    } finally {
      btnReinicioConfirmar.disabled = false;
    }
  });

  /**
   * Recupera los enlaces de aprobación de una inspección SST.
   *
   * Obtiene el identificador desde el botón seleccionado, consulta los enlaces
   * en el backend y los presenta mediante el modal de recuperación.
   *
   * @async
   * @param {HTMLButtonElement} btnRecuperar - Botón asociado con la inspección.
   * @returns {Promise<void>}
   */

  async function recuperarLinks(btnRecuperar) {
    const inspeccionId = btnRecuperar.dataset.inspeccionId;

    //mostrarModal("cargando");

    try {
      const resp = await fetch(`/api/inspecciones/${inspeccionId}/links`);

      const data = await resp.json();

      mostrarModal(
        "exito",
        inspeccionId,
        data.numInspeccion,
        data.links,
        "recuperar",
      );
    } catch (err) {
      console.error(err);

      mostrarModal("error");
    }
  }

  /**
   * Abre la vista previa del informe de una inspección SST.
   *
   * Recupera el token de previsualización desde el backend y construye el
   * endpoint utilizado para abrir el informe en una nueva pestaña.
   *
   * @async
   * @param {HTMLButtonElement} btnPdf - Botón asociado con la inspección.
   * @returns {Promise<void>}
   */

  async function verPdf(btnPdf) {
    const inspeccionId = btnPdf.dataset.inspeccionId;

    try {
      const resp = await fetch(`/api/inspecciones/${inspeccionId}/links`);
      const data = await resp.json();

      if (!resp.ok || !data.ok) {
        throw new Error("No fue posible recuperar el enlace de la inspección.");
      }

      if (!data.previewToken) {
        throw new Error("No existe el token para generar el PDF.");
      }

      const previewUrl = `/api/aprobaciones/${data.previewToken}/preview`;

      window.open(previewUrl, "_blank", "noopener");
    } catch (err) {
      console.error(err);

      mostrarModal("error");
    }
  }

  const calendario = flatpickr("#rangoFechas", {
    mode: "range",

    locale: "es",

    dateFormat: "Y-m-d",

    allowInput: false,

    onChange(selectedDates) {
      if (selectedDates.length !== 2) {
        return;
      }

      const desde = flatpickr.formatDate(selectedDates[0], "Y-m-d");

      const hasta = flatpickr.formatDate(selectedDates[1], "Y-m-d");

      const inputDesde = document.getElementById("fechaDesde");
      const inputHasta = document.getElementById("fechaHasta");

      inputDesde.value = desde;
      inputHasta.value = hasta;

      actualizarResumen(desde, hasta);

      setTimeout(() => {
        actualizarFiltros();
      }, 50);
    },
  });

  function actualizarResumen(desde, hasta) {
    document.getElementById("textoDesde").textContent = desde;
    document.getElementById("textoHasta").textContent = hasta;

    document.getElementById("rangoResumen").classList.remove("oculto");
  }

  document.getElementById("limpiarRango").addEventListener("click", () => {
    calendario.clear();

    document.getElementById("fechaDesde").value = "";
    document.getElementById("fechaHasta").value = "";

    document.getElementById("textoDesde").textContent = "";
    document.getElementById("textoHasta").textContent = "";

    document.getElementById("rangoResumen").classList.add("oculto");

    actualizarFiltros();
  });

  const btnActualizarExcelSst = document.getElementById(
    "btn-actualizar-excel-sst",
  );

  if (btnActualizarExcelSst) {
    /**
     * Solicita la actualización manual del seguimiento SST en OneDrive.
     *
     * Bloquea temporalmente el botón, ejecuta la actualización mediante el
     * backend y comunica al usuario si el archivo Excel fue actualizado o si
     * ocurrió un error durante el proceso.
     *
     * @async
     * @returns {Promise<void>}
     */
    btnActualizarExcelSst.addEventListener("click", async () => {
      const contenidoOriginal = btnActualizarExcelSst.innerHTML;

      try {
        btnActualizarExcelSst.disabled = true;

        btnActualizarExcelSst.innerHTML = "<span>Actualizando...</span>";

        const response = await fetch("/api/excel/sst/actualizar-onedrive", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });

        const data = await response.json();

        if (!response.ok || !data.ok) {
          const error = new Error(
            data.mensaje || "No fue posible actualizar el Excel SST.",
          );

          error.codigo = data.codigo || "";

          throw error;
        }

        alert("El Excel SST fue actualizado correctamente en OneDrive.");
      } catch (error) {
        console.error("[Excel SST] Error actualizando:", error);

        alert(error.message || "No fue posible actualizar el Excel SST.");
      } finally {
        btnActualizarExcelSst.disabled = false;
        btnActualizarExcelSst.innerHTML = contenidoOriginal;
      }
    });
  }

  cargarTodo();
})();
