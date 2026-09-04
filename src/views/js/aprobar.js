/*
  aprobar.js — Página de aprobación de la inspección.

  Qué hace:
  - Lee el token de la URL.
  - Obtiene la inspección desde GET /api/aprobaciones/:token.
  - Detecta automáticamente si la inspección es SST o EPP.
  - Muestra el panel correspondiente.
  - Mantiene una única lógica de aprobación para SST y EPP.
  - Envía la aprobación a POST /api/aprobaciones/:token.
  - Permite abrir el informe mediante /api/aprobaciones/:token/preview.

  Cómo interactúa:
  - Consume la API expuesta por aprobaciones.controller.js.
  - aprobar.html contiene panel-sst y panel-epp.
*/

document.addEventListener("DOMContentLoaded", () => {

  // =========================================================
  // CONFIGURACIÓN GENERAL
  // =========================================================

  const token = window.location.pathname
    .split("/")
    .filter(Boolean)
    .pop();

  const el = (id) => document.getElementById(id);

  const estados = {
    cargando: el("estado-cargando"),
    error: el("estado-error"),
    yaAprobado: el("estado-ya-aprobado"),
    exito: el("estado-exito"),
    formulario: el("estado-formulario"),
  };

  function mostrarEstado(nombre) {
    Object.entries(estados).forEach(([key, elemento]) => {

      if (!elemento) {
        return;
      }

      elemento.classList.toggle(
        "hidden",
        key !== nombre
      );

    });
  }

  function mostrarError(msg) {

    const errorEl = el("form-error");

    if (!errorEl) {
      return;
    }

    errorEl.textContent = msg;
    errorEl.classList.remove("hidden");
  }


  function ocultarError() {

    const errorEl = el("form-error");

    if (errorEl) {
      errorEl.classList.add("hidden");
    }

  }

/**
 * Muestra el resumen correspondiente a una inspección SST.
 *
 * Activa el panel SST, oculta el panel EPP y presenta la cantidad de
 * elementos inspeccionados en cada uno de los módulos disponibles.
 *
 * @param {Object} insp - Información de la inspección obtenida desde el backend.
 * @param {Object} [insp.conteos] - Cantidades registradas por módulo.
 * @returns {void}
 */

  function renderizarPanelSst(insp) {

    const panelSst = el("panel-sst");
    const panelEpp = el("panel-epp");

    // Ocultar EPP
    panelEpp?.classList.add("hidden");

    // Mostrar SST
    panelSst?.classList.remove("hidden");


    const c = insp.conteos || {};

    const resumenConteos = el("resumen-conteos");

    if (resumenConteos) {

      resumenConteos.textContent =
        `${c.extintores || 0} extintores · ` +
        `${c.camillas || 0} camillas · ` +
        `${c.senalizaciones || 0} señalizaciones · ` +
        `${c.equiposTecnologicos || 0} equipos · ` +
        `${c.botiquines || 0} botiquines`;

    }

  }

/**
 * Muestra el resumen correspondiente a una inspección EPP.
 *
 * Activa el panel EPP, oculta el panel SST y presenta las cantidades de
 * trabajadores, evaluaciones, novedades y trabajadores con o sin novedades.
 *
 * @param {Object} insp - Información de la inspección obtenida desde el backend.
 * @param {Object} [insp.conteos] - Totales calculados para la inspección EPP.
 * @returns {void}
 */

  function renderizarPanelEpp(insp) {

    const panelSst = el("panel-sst");
    const panelEpp = el("panel-epp");

    // Ocultar SST
    panelSst?.classList.add("hidden");

    // Mostrar EPP
    panelEpp?.classList.remove("hidden");


    const c = insp.conteos || {};


    // ---------------------------------------------------------
    // TOTAL TRABAJADORES
    // ---------------------------------------------------------

    const campoTrabajadores =
      el("epp-total-trabajadores");

    if (campoTrabajadores) {
      campoTrabajadores.textContent =
        String(Number(c.trabajadores || 0));
    }


    // ---------------------------------------------------------
    // TOTAL EVALUACIONES
    // ---------------------------------------------------------

    const campoEvaluaciones =
      el("epp-total-evaluaciones");

    if (campoEvaluaciones) {
      campoEvaluaciones.textContent =
        String(Number(c.evaluaciones || 0));
    }


    // ---------------------------------------------------------
    // TOTAL NOVEDADES
    // ---------------------------------------------------------

    const campoNovedades =
      el("epp-total-novedades");

    if (campoNovedades) {
      campoNovedades.textContent =
        String(Number(c.novedades || 0));
    }


    // ---------------------------------------------------------
    // TRABAJADORES CON NOVEDADES
    // ---------------------------------------------------------

    const campoConNovedades =
      el("epp-trabajadores-novedades");

    if (campoConNovedades) {
      campoConNovedades.textContent =
        String(
          Number(
            c.trabajadoresConNovedades || 0
          )
        );
    }


    // ---------------------------------------------------------
    // TRABAJADORES SIN NOVEDADES
    // ---------------------------------------------------------

    const campoSinNovedades =
      el("epp-trabajadores-sin-novedades");

    if (campoSinNovedades) {
      campoSinNovedades.textContent =
        String(
          Number(
            c.trabajadoresSinNovedades || 0
          )
        );
    }

  }

/**
 * Carga la inspección asociada con el token presente en la URL.
 *
 * Consulta la información de la inspección en el backend, verifica si el
 * token ya fue utilizado y presenta los datos generales junto con el panel
 * correspondiente al tipo de inspección SST o EPP.
 *
 * @async
 * @returns {Promise<void>}
 */

  async function cargar() {

    if (!token) {
      mostrarEstado("error");
      return;
    }


    try {

      // -------------------------------------------------------
      // CONSULTAR INSPECCIÓN
      // -------------------------------------------------------

      const resp = await fetch(
        `/api/aprobaciones/${token}`
      );

      const data = await resp.json();


      // -------------------------------------------------------
      // VALIDAR RESPUESTA
      // -------------------------------------------------------

      if (!resp.ok || !data.ok) {

        mostrarEstado("error");

        return;

      }


      // -------------------------------------------------------
      // INSPECCIÓN YA APROBADA POR ESTE TOKEN
      // -------------------------------------------------------

      if (data.yaAprobado) {

        const nombreAprobador =
          el("ya-aprobado-nombre");

        if (nombreAprobador) {

          nombreAprobador.textContent =
            data.nombreAprobador || "—";

        }

        mostrarEstado("yaAprobado");

        return;

      }


      // -------------------------------------------------------
      // INFORMACIÓN DE LA INSPECCIÓN
      // -------------------------------------------------------

      const insp = data.inspeccion || {};


      const rolLabel = el("rol-label");

      if (rolLabel) {

        rolLabel.textContent =
          `Aprobador: ${data.rolLabel || ""}`;

      }


      const resumenId = el("resumen-id");

      if (resumenId) {
        resumenId.textContent =
          insp.inspeccionId || "-";
      }


      const resumenFecha =
        el("resumen-fecha");

      if (resumenFecha) {
        resumenFecha.textContent =
          insp.fecha || "-";
      }


      const resumenSede =
        el("resumen-sede");

      if (resumenSede) {
        resumenSede.textContent =
          insp.sedeOperacion || "-";
      }


      const resumenArea =
        el("resumen-area");

      if (resumenArea) {
        resumenArea.textContent =
          insp.areaTrabajo || "-";
      }


      const resumenJefe =
        el("resumen-jefe");

      if (resumenJefe) {
        resumenJefe.textContent =
          insp.jefeResponsable || "-";
      }


      const resumenResponsable =
        el("resumen-responsable");

      if (resumenResponsable) {
        resumenResponsable.textContent =
          insp.responsableInspeccion || "-";
      }


      // =====================================================
      // DETECTAR TIPO DE INSPECCIÓN
      // =====================================================

      const tipoInspeccion = String(
        insp.tipoInspeccion || "SST"
      ).toUpperCase();


      // -------------------------------------------------------
      // TÍTULO DINÁMICO
      // -------------------------------------------------------

      const tituloHeader =
        el("aprobar-header-title");

      if (tituloHeader) {

        tituloHeader.textContent =
          `Aprobación de inspección ${tipoInspeccion}`;

      }


      // =====================================================
      // SELECCIONAR PANEL
      // =====================================================

      if (tipoInspeccion === "EPP") {

        renderizarPanelEpp(insp);

      } else {

        renderizarPanelSst(insp);

      }


      // -------------------------------------------------------
      // MOSTRAR FORMULARIO
      // -------------------------------------------------------

      mostrarEstado("formulario");

    } catch (error) {

      console.error(
        "[aprobar] Error cargando inspección:",
        error
      );

      mostrarEstado("error");

    }

  }

/**
 * Registra la aprobación de la inspección asociada con el token actual.
 *
 * Valida el nombre del aprobador y envía la confirmación al backend. Después
 * de una respuesta satisfactoria, informa si todavía existen aprobaciones
 * pendientes o si se completó la última aprobación requerida.
 *
 * @async
 * @returns {Promise<void>}
 */

  async function aprobar() {

    ocultarError();


    const inputNombre =
      el("input-nombre");

    const nombre =
      inputNombre?.value.trim() || "";


    // ---------------------------------------------------------
    // VALIDAR NOMBRE
    // ---------------------------------------------------------

    if (!nombre) {

      mostrarError(
        "Ingresa tu nombre completo."
      );

      return;

    }


    const btn =
      el("btn-aprobar");


    if (!btn) {
      return;
    }


    btn.disabled = true;
    btn.textContent = "Enviando…";


    try {

      // -------------------------------------------------------
      // ENVIAR APROBACIÓN
      // -------------------------------------------------------

      const resp = await fetch(
        `/api/aprobaciones/${token}`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify({
            nombre
          }),
        }
      );


      const data = await resp.json();


      // -------------------------------------------------------
      // VALIDAR RESPUESTA
      // -------------------------------------------------------

      if (!resp.ok || !data.ok) {

        mostrarError(
          (
            Array.isArray(data.errores) &&
            data.errores[0]
          ) ||
          "No fue posible registrar la aprobación."
        );


        btn.disabled = false;

        btn.textContent =
          "Confirmar aprobación";

        return;

      }


      // -------------------------------------------------------
      // MENSAJE DE ÉXITO
      // -------------------------------------------------------

      const mensajeExito =
        el("exito-mensaje");


      if (mensajeExito) {

        mensajeExito.textContent =
          data.todasCompletas
            ? "Gracias. Esa era la última aprobación pendiente — el reporte final se está generando y enviando por correo."
            : "Gracias. Tu aprobación quedó registrada, falta que confirmen los demás responsables.";

      }


      mostrarEstado("exito");

    } catch (error) {

      console.error(
        "[aprobar] Error registrando aprobación:",
        error
      );


      mostrarError(
        "No fue posible enviar la aprobación. Verifica tu conexión."
      );


      btn.disabled = false;

      btn.textContent =
        "Confirmar aprobación";

    }

  }

/**
 * Abre en una nueva pestaña la vista previa del informe de la inspección.
 *
 * Utiliza el token actual para construir el endpoint de consulta del
 * documento disponible para el aprobador.
 *
 * @returns {void}
 */

  function verInforme() {

    const url =
      `/api/aprobaciones/${token}/preview`;

    window.open(
      url,
      "_blank",
      "noopener"
    );

  }

  const btnAprobar =
    el("btn-aprobar");


  if (btnAprobar) {

    btnAprobar.addEventListener(
      "click",
      aprobar
    );

  }


  document
    .querySelectorAll(".btn-ver-informe")
    .forEach((button) => {

      button.addEventListener(
        "click",
        verInforme
      );

    });

  cargar();

});