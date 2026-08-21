/*
  estadisticas-epp.js
  Dashboard de estadísticas de inspecciones EPP.
*/

(function () {
  // =====================================================
  // ELEMENTOS DEL DOM
  // =====================================================

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

  // =====================================================
  // KPIS
  // =====================================================

  const kpis = {
    total: document.getElementById("kpi-total"),
    pendientes: document.getElementById("kpi-pendientes"),
    aprobadas: document.getElementById("kpi-aprobadas"),
    enviadas: document.getElementById("kpi-enviadas"),
    mes: document.getElementById("kpi-mes"),
  };

  const sedesLista = document.getElementById("sedes-lista");

  // =====================================================
  // ESTADO DE LA TABLA
  // =====================================================

  const state = {
    page: 1,
    pageSize: 10,
    totalPages: 1,
    total: 0,

    sortBy: null,
    sortOrder: "asc",
  };

  // =====================================================
  // FILTROS
  // =====================================================

  function leerFiltros() {
    const fd = new FormData(form);

    return {
      fechaDesde: String(fd.get("fechaDesde") || "").trim(),

      fechaHasta: String(fd.get("fechaHasta") || "").trim(),

      sedeOperacion: String(fd.get("sedeOperacion") || "").trim(),

      estado: String(fd.get("estado") || "").trim(),

      q: String(fd.get("q") || "").trim(),
    };
  }

  // =====================================================
  // QUERY STRING
  // =====================================================

  function crearQuery(params) {
    const sp = new URLSearchParams();

    Object.entries(params).forEach(([k, v]) => {
      if (v !== "" && v != null) {
        sp.set(k, String(v));
      }
    });

    return sp.toString();
  }

  // =====================================================
  // FORMATEAR FECHA
  // =====================================================

  function formatearFecha(isoDate) {
    if (!isoDate) return "-";

    const d = new Date(isoDate);

    if (Number.isNaN(d.getTime())) {
      return "-";
    }

    return d.toLocaleDateString("es-CO", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }

  // =====================================================
  // KPIS
  // =====================================================

  function setKpis(resumen) {
    kpis.total.textContent = resumen.total || 0;

    kpis.pendientes.textContent = resumen.pendientes || 0;

    kpis.aprobadas.textContent = resumen.aprobadas || 0;

    kpis.enviadas.textContent = resumen.enviadas || 0;

    kpis.mes.textContent = resumen.esteMes || 0;

    const sedes = Array.isArray(resumen.porSede) ? resumen.porSede : [];

    sedesLista.innerHTML = sedes.length
      ? sedes
          .map(
            (s) =>
              `<span class="sede-chip">
                  ${s.sede}: ${s.cantidad}
                </span>`,
          )
          .join("")
      : '<span class="sede-chip">Sin datos para estos filtros</span>';
  }

  // =====================================================
  // ESTADO
  // =====================================================

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

  // =====================================================
  // TABLA EPP
  // =====================================================

  function renderTabla(items) {
    if (!Array.isArray(items) || items.length === 0) {
      tablaBody.innerHTML =
        '<tr><td colspan="9">No hay inspecciones EPP para los filtros seleccionados.</td></tr>';

      return;
    }

    tablaBody.innerHTML = items
      .map((it) => {
        // =============================================
        // CANTIDAD DE TRABAJADORES EPP
        // =============================================

        const totalTrabajadores = Number(it.trabajadores || 0);

        // =============================================
        // BOTÓN RECUPERAR LINKS
        // =============================================

        const recuperarBtn = `
            <button
              type="button"
              class="btn-recuperar accion-btn accion-btn-links"
              data-inspeccion-id="${it.inspeccion_id}"
              data-num-inspeccion="${it.inspecciones_id}"
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
                  d="M8.25 7.5H6.375A2.625 2.625 0 003.75 10.125v7.5A2.625 2.625 0 006.375 20.25h7.5a2.625 2.625 0 002.625-2.625V15.75M15.75 3.75H20.25m0 0v4.5m0-4.5L10.5 13.5"/>

              </svg>

            </button>
          `;

        // =============================================
        // BOTÓN VER PDF
        // =============================================

        const verPdfBtn = `
            <button
              type="button"
              class="btn-ver-pdf accion-btn accion-btn-pdf"
              data-inspeccion-id="${it.inspeccion_id}">

              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="2"
                stroke="currentColor">

                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M19.5 14.25v4.125A2.625 2.625 0 0116.875 21H7.125A2.625 2.625 0 014.5 18.375V5.625A2.625 2.625 0 017.125 3h6.19a2.25 2.25 0 011.591.659l3.935 3.935A2.25 2.25 0 0119.5 9.185V14.25z"/>

                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M9 15h6M9 11h6"/>

              </svg>

            </button>
          `;

        // =============================================
        // FILA
        // =============================================

        return `
            <tr>

              <td>
                ${it.inspecciones_id ?? "-"}
              </td>

              <td>
                ${it.inspeccion_id || "-"}
              </td>

              <td>
                ${formatearFecha(it.created_at)}
              </td>

              <td>
                ${it.sede_operacion || "-"}
              </td>

              <td>
                ${it.area_trabajo || "-"}
              </td>

              <td>
                ${it.responsable_inspeccion || "-"}
              </td>

              <td>
                ${renderEstado(it.estado)}
              </td>

              <td>
                ${totalTrabajadores}
              </td>

              <td>

                <div class="acciones-botones">

                  ${recuperarBtn}

                  ${verPdfBtn}

                </div>

              </td>

            </tr>
          `;
      })
      .join("");
  }

  // =====================================================
  // PAGINACIÓN
  // =====================================================

  function updatePaginacion() {
    pageInfo.textContent = `Página ${state.page} de ${state.totalPages}`;

    btnPrev.disabled = state.page <= 1;

    btnNext.disabled = state.page >= state.totalPages;

    tablaMeta.textContent = `${state.total} inspecciones encontradas`;
  }

  // =====================================================
  // CARGAR RESUMEN EPP
  // =====================================================

  async function cargarResumen(filtros) {
    const query = crearQuery(filtros);

    const resp = await fetch(`/api/estadisticas-epp/resumen?${query}`);

    const data = await resp.json();

    if (!resp.ok) {
      throw new Error("No fue posible cargar el resumen EPP");
    }

    // El endpoint EPP devuelve directamente el resumen.
    setKpis(data);
  }

  // =====================================================
  // CARGAR TABLA EPP
  // =====================================================

  async function cargarTabla(filtros) {
    const query = crearQuery({
      ...filtros,

      page: state.page,

      pageSize: state.pageSize,

      sortBy: state.sortBy,

      sortOrder: state.sortOrder,
    });

    const resp = await fetch(`/api/estadisticas-epp/inspecciones?${query}`);

    const data = await resp.json();

    if (!resp.ok) {
      throw new Error("No fue posible cargar la tabla EPP");
    }

    state.total = Number(data.total || 0);

    state.totalPages = Number(data.totalPages || 1);

    renderTabla(data.items || []);

    updatePaginacion();
  }

  // =====================================================
  // CARGAR TODO
  // =====================================================

  async function cargarTodo() {
    try {
      const filtros = leerFiltros();

      await Promise.all([cargarResumen(filtros), cargarTabla(filtros)]);
    } catch (err) {
      console.error("Error cargando estadísticas EPP:", err);

      tablaBody.innerHTML =
        '<tr><td colspan="9">Error cargando estadísticas EPP. Intenta de nuevo.</td></tr>';

      tablaMeta.textContent = "";
    }
  }

  // =====================================================
  // ACTUALIZAR FILTROS
  // =====================================================

  async function actualizarFiltros() {
    state.page = 1;

    await cargarTodo();
  }

  // =====================================================
  // EVENTOS DE FILTROS
  // =====================================================

  inputBusqueda.addEventListener("input", () => {
    actualizarFiltros();
  });

  selectEstado.addEventListener("change", () => {
    actualizarFiltros();
  });

  selectSede.addEventListener("change", () => {
    actualizarFiltros();
  });

  // =====================================================
  // ORDENAMIENTO
  // =====================================================

  columnasOrdenables.forEach((columna) => {
    columna.addEventListener("click", () => {
      const campo = columna.dataset.sort;

      if (state.sortBy === campo) {
        state.sortOrder = state.sortOrder === "asc" ? "desc" : "asc";
      } else {
        state.sortBy = campo;

        state.sortOrder = "asc";
      }

      // Actualizar flechas
      columnasOrdenables.forEach((c) => {
        c.classList.remove("asc", "desc");

        if (c.dataset.sort === state.sortBy) {
          c.classList.add(state.sortOrder);
        }
      });

      state.page = 1;

      // Mantener filtros activos al ordenar
      cargarTabla(leerFiltros());
    });
  });

  // =====================================================
  // PAGINACIÓN
  // =====================================================

  btnPrev.addEventListener("click", () => {
    if (state.page <= 1) {
      return;
    }

    state.page -= 1;

    cargarTabla(leerFiltros());
  });

  btnNext.addEventListener("click", () => {
    if (state.page >= state.totalPages) {
      return;
    }

    state.page += 1;

    cargarTabla(leerFiltros());
  });

  // =====================================================
  // ACCIONES DE LA TABLA
  // =====================================================

  tablaBody.addEventListener("click", (e) => {
    const btnRecuperar = e.target.closest(".btn-recuperar");

    if (btnRecuperar) {
      recuperarLinks(btnRecuperar);

      return;
    }

    const btnPdf = e.target.closest(".btn-ver-pdf");

    if (btnPdf) {
      verPdf(btnPdf);
    }
  });

  // =====================================================
  // RECUPERAR LINKS
  // =====================================================

  async function recuperarLinks(btnRecuperar) {
    const inspeccionId = btnRecuperar.dataset.inspeccionId;

    try {
      const resp = await fetch(`/api/inspecciones/${inspeccionId}/links`);

      const data = await resp.json();

      if (!resp.ok || !data.ok) {
        throw new Error("No fue posible recuperar los enlaces de aprobación.");
      }

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

  // =====================================================
  // VER PDF
  // =====================================================

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

  // =====================================================
  // RANGO DE FECHAS
  // =====================================================

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

  /* =========================================================
   EXPORTAR EXCEL - SEGUIMIENTO EPP
========================================================= */

  const btnExportarExcelEpp = document.getElementById("btn-exportar-excel-epp");

  if (btnExportarExcelEpp) {
    btnExportarExcelEpp.addEventListener("click", async () => {
      const textoOriginal = btnExportarExcelEpp.innerHTML;

      try {
        /* -----------------------------------------------------
         ESTADO DE CARGA
      ----------------------------------------------------- */

        btnExportarExcelEpp.disabled = true;
        btnExportarExcelEpp.innerHTML = `
        <span>Generando Excel...</span>
      `;

        /* -----------------------------------------------------
         SOLICITAR EXCEL AL BACKEND
      ----------------------------------------------------- */

        const response = await fetch("/api/excel/epp");

        if (!response.ok) {
          throw new Error(`Error al generar el Excel (${response.status})`);
        }

        /* -----------------------------------------------------
         CONVERTIR RESPUESTA A ARCHIVO
      ----------------------------------------------------- */

        const blob = await response.blob();

        const url = URL.createObjectURL(blob);

        /* -----------------------------------------------------
         CREAR DESCARGA
      ----------------------------------------------------- */

        const enlace = document.createElement("a");

        enlace.href = url;
        enlace.download = `Seguimiento_EPP_${obtenerFechaArchivo()}.xlsx`;

        document.body.appendChild(enlace);

        enlace.click();

        /* -----------------------------------------------------
         LIMPIEZA
      ----------------------------------------------------- */

        enlace.remove();

        URL.revokeObjectURL(url);
      } catch (error) {
        console.error("Error descargando Excel EPP:", error);

        alert("No fue posible generar el archivo Excel de seguimiento EPP.");
      } finally {
        /* -----------------------------------------------------
         RESTAURAR BOTÓN
      ----------------------------------------------------- */

        btnExportarExcelEpp.disabled = false;
        btnExportarExcelEpp.innerHTML = textoOriginal;
      }
    });
  }

  /* =========================================================
   FECHA PARA NOMBRE DEL ARCHIVO
========================================================= */

  function obtenerFechaArchivo() {
    const ahora = new Date();

    const anio = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, "0");
    const dia = String(ahora.getDate()).padStart(2, "0");

    return `${anio}-${mes}-${dia}`;
  }

  // =====================================================
  // RESUMEN VISUAL DEL RANGO
  // =====================================================

  function actualizarResumen(desde, hasta) {
    document.getElementById("textoDesde").textContent = desde;

    document.getElementById("textoHasta").textContent = hasta;

    document.getElementById("rangoResumen").classList.remove("oculto");
  }

  // =====================================================
  // LIMPIAR RANGO
  // =====================================================

  document.getElementById("limpiarRango").addEventListener("click", () => {
    calendario.clear();

    document.getElementById("fechaDesde").value = "";

    document.getElementById("fechaHasta").value = "";

    document.getElementById("textoDesde").textContent = "";

    document.getElementById("textoHasta").textContent = "";

    document.getElementById("rangoResumen").classList.add("oculto");

    actualizarFiltros();
  });

  // =====================================================
  // CARGA INICIAL
  // =====================================================

  cargarTodo();
})();
