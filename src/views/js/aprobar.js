/*
  aprobar.js — Página de aprobación de la inspección.

  Qué hace:
  - Lee el token de la URL y pide el resumen de la inspección a GET /api/aprobaciones/:token.
  - Si el token ya fue usado, muestra el estado "ya aprobaste".
  - Si no, muestra el resumen + el campo de nombre (sin firma dibujada,
    por restricción legal) y envía la aprobación a POST /api/aprobaciones/:token.

  Cómo interactúa:
  - Consume la API expuesta por aprobaciones.controller.js (app.js registra las rutas).
*/
document.addEventListener("DOMContentLoaded", () => {
  const token = window.location.pathname.split("/").filter(Boolean).pop();
  const el = (id) => document.getElementById(id);

  const estados = {
    cargando: el("estado-cargando"),
    error: el("estado-error"),
    yaAprobado: el("estado-ya-aprobado"),
    exito: el("estado-exito"),
    formulario: el("estado-formulario")
  };

  function mostrarEstado(nombre) {
    Object.entries(estados).forEach(([key, elemento]) => {
      elemento.classList.toggle("hidden", key !== nombre);
    });
  }

  function mostrarError(msg) {
    const errorEl = el("form-error");
    errorEl.textContent = msg;
    errorEl.classList.remove("hidden");
  }

  function ocultarError() {
    el("form-error").classList.add("hidden");
  }

  async function cargar() {
    if (!token) {
      mostrarEstado("error");
      return;
    }

    try {
      const resp = await fetch(`/api/aprobaciones/${token}`);
      const data = await resp.json();

      if (!resp.ok || !data.ok) {
        mostrarEstado("error");
        return;
      }

      if (data.yaAprobado) {
        el("ya-aprobado-nombre").textContent = data.nombreAprobador || "—";
        mostrarEstado("yaAprobado");
        return;
      }

      const insp = data.inspeccion || {};
      el("rol-label").textContent = `Aprobador: ${data.rolLabel || ""}`;
      el("resumen-id").textContent = insp.inspeccionId || "-";
      el("resumen-fecha").textContent = insp.fecha || "-";
      el("resumen-sede").textContent = insp.sedeOperacion || "-";
      el("resumen-area").textContent = insp.areaTrabajo || "-";
      el("resumen-jefe").textContent = insp.jefeResponsable || "-";
      el("resumen-responsable").textContent = insp.responsableInspeccion || "-";

      const c = insp.conteos || {};
      el("resumen-conteos").textContent =
        `${c.extintores || 0} extintores · ${c.camillas || 0} camillas · ${c.senalizaciones || 0} señalizaciones · ${c.equiposTecnologicos || 0} equipos · ${c.botiquines || 0} botiquines`;

      mostrarEstado("formulario");
    } catch {
      mostrarEstado("error");
    }
  }

  async function aprobar() {
    ocultarError();
    const nombre = el("input-nombre").value.trim();

    if (!nombre) {
      mostrarError("Ingresa tu nombre completo.");
      return;
    }

    const btn = el("btn-aprobar");
    btn.disabled = true;
    btn.textContent = "Enviando…";

    try {
      const resp = await fetch(`/api/aprobaciones/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre })
      });
      const data = await resp.json();

      if (!resp.ok || !data.ok) {
        mostrarError((Array.isArray(data.errores) && data.errores[0]) || "No fue posible registrar la aprobación.");
        btn.disabled = false;
        btn.textContent = "Confirmar aprobación";
        return;
      }

      el("exito-mensaje").textContent = data.todasCompletas
        ? "Gracias. Esa era la última aprobación pendiente — el reporte final se está generando y enviando por correo."
        : "Gracias. Tu aprobación quedó registrada, falta que confirmen los demás responsables.";
      mostrarEstado("exito");
    } catch {
      mostrarError("No fue posible enviar la aprobación. Verifica tu conexión.");
      btn.disabled = false;
      btn.textContent = "Confirmar aprobación";
    }
  }
  
  function verInforme() {
    const url = `/api/aprobaciones/${token}/preview`;
    window.open(url, "_blank", "noopener");
  }

  el("btn-aprobar").addEventListener("click", aprobar);
  document.querySelectorAll(".btn-ver-informe").forEach((button) => {
    button.addEventListener("click", verInforme);
  });

  cargar();
});
