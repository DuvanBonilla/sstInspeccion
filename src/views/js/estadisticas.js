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



  const kpis = {
    total: document.getElementById("kpi-total"),
    pendientes: document.getElementById("kpi-pendientes"),
    aprobadas: document.getElementById("kpi-aprobadas"),
    enviadas: document.getElementById("kpi-enviadas"),
    mes: document.getElementById("kpi-mes")
  };

  const sedesLista = document.getElementById("sedes-lista");

  const state = {
    page: 1,
    pageSize: 10,
    totalPages: 1,
    total: 0,

    sortBy: null,
    sortOrder: "asc"
  };

  function leerFiltros() {
    const fd = new FormData(form);

    const filtros = {
      fechaDesde: String(fd.get("fechaDesde") || "").trim(),
      fechaHasta: String(fd.get("fechaHasta") || "").trim(),
      sedeOperacion: String(fd.get("sedeOperacion") || "").trim(),
      estado: String(fd.get("estado") || "").trim(),
      q: String(fd.get("q") || "").trim()
    };

    console.log("FILTROS ACTUALES:", filtros);

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
      day: "2-digit"
    });
  }

  function setKpis(resumen) {
    kpis.total.textContent = resumen.total || 0;
    kpis.pendientes.textContent = resumen.pendientes || 0;
    kpis.aprobadas.textContent = resumen.aprobadas || 0;
    kpis.enviadas.textContent = resumen.enviadas || 0;
    kpis.mes.textContent = resumen.esteMes || 0;

    const sedes = Array.isArray(resumen.porSede) ? resumen.porSede : [];
    sedesLista.innerHTML = sedes.length
      ? sedes.map((s) => `<span class="sede-chip">${s.sede}: ${s.cantidad}</span>`).join("")
      : '<span class="sede-chip">Sin datos para estos filtros</span>';
  }

  function renderEstado(estado) {

    const safe = estado || "sin_estado";

    const nombres = {
      pendiente_aprobacion: "Pendiente aprobación",
      enviada: "Enviada",
      aprobada: "Aprobada"
    };

    return `
    <span
      class="estado-dot estado-${safe}"
      title="${nombres[safe] || safe}">
    </span>
  `;

  }


  function renderTabla(items) {
    if (!Array.isArray(items) || items.length === 0) {
      tablaBody.innerHTML = '<tr><td colspan="9">No hay inspecciones para los filtros seleccionados.</td></tr>';
      return;
    }

    tablaBody.innerHTML = items.map((it) => {
      console.log(it.estado);
      const totalItems = Number(it.extintores || 0) + Number(it.camillas || 0) + Number(it.senalizaciones || 0) + Number(it.equipos || 0) + Number(it.botiquines || 0);

      const recuperarBtn = `
<button
    type="button"
    class="btn-recuperar accion-btn accion-btn-links"
    data-inspeccion-id="${it.inspeccion_id}"
    data-num-inspeccion="${it.num_inspeccion}"
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
      return `
          <tr>
            <td>${it.num_inspeccion ?? "-"}</td>
            <td>${it.inspeccion_id || "-"}</td>
            <td>${formatearFecha(it.created_at)}</td>
            <td>${it.sede_operacion || "-"}</td>
            <td>${it.area_trabajo || "-"}</td>
            <td>${it.responsable_inspeccion || "-"}</td>
            <td>${renderEstado(it.estado)}</td>
            <td>${totalItems}</td>
            <td>${recuperarBtn} ${verPdfBtn}</td>
          </tr>
        `;

    }).join("");
  }

  function updatePaginacion() {
    pageInfo.textContent = `Página ${state.page} de ${state.totalPages}`;
    btnPrev.disabled = state.page <= 1;
    btnNext.disabled = state.page >= state.totalPages;
    tablaMeta.textContent = `${state.total} inspecciones encontradas`;
  }

  async function cargarResumen() {
    const filtros = leerFiltros();
    const query = crearQuery(filtros);
    const resp = await fetch(`/api/estadisticas/resumen?${query}`);
    const data = await resp.json();
    if (!resp.ok || !data.ok) throw new Error("No fue posible cargar el resumen");
    setKpis(data.resumen || {});
  }

  async function cargarTabla() {
    const filtros = leerFiltros();
    const query = crearQuery({ ...filtros, page: state.page, pageSize: state.pageSize, sortBy: state.sortBy, sortOrder: state.sortOrder });
    const resp = await fetch(`/api/estadisticas/inspecciones?${query}`);
    const data = await resp.json();
    if (!resp.ok || !data.ok) throw new Error("No fue posible cargar la tabla");

    state.total = Number(data.total || 0);
    state.totalPages = Number(data.totalPages || 1);
    renderTabla(data.items || []);
    updatePaginacion();
  }

  async function cargarTodo() {
    try {
      await Promise.all([cargarResumen(), cargarTabla()]);
    } catch {
      tablaBody.innerHTML = '<tr><td colspan="9">Error cargando estadísticas. Intenta de nuevo.</td></tr>';
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

  columnasOrdenables.forEach(columna => {

    columna.addEventListener("click", () => {

      const campo = columna.dataset.sort;

      if (state.sortBy === campo) {
        state.sortOrder =
          state.sortOrder === "asc"
            ? "desc"
            : "asc";
      } else {
        state.sortBy = campo;
        state.sortOrder = "asc";
      }

      // Actualizar las flechas
      columnasOrdenables.forEach(c => {
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

  });;

  async function recuperarLinks(btnRecuperar) {

    const inspeccionId = btnRecuperar.dataset.inspeccionId;

    console.log("Recuperar inspección:", inspeccionId);

    //mostrarModal("cargando");

    try {

      const resp = await fetch(`/api/inspecciones/${inspeccionId}/links`);

      const data = await resp.json();

      console.log("RESPUESTA COMPLETA:");
      console.log(data);

      console.log("LINKS:");
      console.log(data.links);

      mostrarModal(
        "exito",
        inspeccionId,
        data.numInspeccion,
        data.links,
        "recuperar"


      );

    } catch (err) {

      console.error(err);

      mostrarModal("error");

    }

  }

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

      const previewUrl =
        `/api/aprobaciones/${data.previewToken}/preview`;

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


      const desde = flatpickr.formatDate(
        selectedDates[0],
        "Y-m-d"
      );

      const hasta = flatpickr.formatDate(
        selectedDates[1],
        "Y-m-d"
      );


      const inputDesde = document.getElementById("fechaDesde");
      const inputHasta = document.getElementById("fechaHasta");


      inputDesde.value = desde;
      inputHasta.value = hasta;


      actualizarResumen(desde, hasta);


      setTimeout(() => {
        actualizarFiltros();
      }, 50);

    }

  });

  function actualizarResumen(desde, hasta) {

    document.getElementById("textoDesde").textContent = desde;
    document.getElementById("textoHasta").textContent = hasta;

    document.getElementById("rangoResumen")
      .classList.remove("oculto");
  }

  document.getElementById("limpiarRango")
    .addEventListener("click", () => {


      calendario.clear();


      document.getElementById("fechaDesde").value = "";
      document.getElementById("fechaHasta").value = "";


      document.getElementById("textoDesde").textContent = "";
      document.getElementById("textoHasta").textContent = "";


      document.getElementById("rangoResumen")
        .classList.add("oculto");


      actualizarFiltros();

    });

  cargarTodo();

})();

