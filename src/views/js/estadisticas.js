/*
  estadisticas.js — Dashboard de estadísticas de inspecciones.
*/
(function () {
  const form = document.getElementById("filtros-form");
  const btnLimpiar = document.getElementById("btn-limpiar");
  const btnPrev = document.getElementById("btn-prev");
  const btnNext = document.getElementById("btn-next");
  const tablaBody = document.getElementById("tabla-body");
  const tablaMeta = document.getElementById("tabla-meta");
  const pageInfo = document.getElementById("page-info");

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
    total: 0
  };

  function leerFiltros() {
    const fd = new FormData(form);
    return {
      fechaDesde: String(fd.get("fechaDesde") || "").trim(),
      fechaHasta: String(fd.get("fechaHasta") || "").trim(),
      sedeOperacion: String(fd.get("sedeOperacion") || "").trim(),
      estado: String(fd.get("estado") || "").trim(),
      q: String(fd.get("q") || "").trim()
    };
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
    return `<span class="estado-pill estado-${safe}">${safe.replaceAll("_", " ")}</span>`;
  }

  function renderTabla(items) {
    if (!Array.isArray(items) || items.length === 0) {
      tablaBody.innerHTML = '<tr><td colspan="8">No hay inspecciones para los filtros seleccionados.</td></tr>';
      return;
    }

    tablaBody.innerHTML = items.map((it) => {
      const totalItems = Number(it.extintores || 0) + Number(it.camillas || 0) + Number(it.senalizaciones || 0) + Number(it.equipos || 0) + Number(it.botiquines || 0);
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
    const query = crearQuery({ ...filtros, page: state.page, pageSize: state.pageSize });
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
      tablaBody.innerHTML = '<tr><td colspan="8">Error cargando estadísticas. Intenta de nuevo.</td></tr>';
      tablaMeta.textContent = "";
    }
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    state.page = 1;
    cargarTodo();
  });

  btnLimpiar.addEventListener("click", () => {
    form.reset();
    state.page = 1;
    cargarTodo();
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

  cargarTodo();
})();
