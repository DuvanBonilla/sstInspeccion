/*
  inspeccion-sst.js — Controlador principal del formulario SST en el navegador.

  Qué hace:
  - Orquesta los 7 pasos del formulario: Info General → Extintores → Camillas
    → Señalización → Botiquín → Equipos Tecnológicos → Finalizar.
  - Valida cada paso antes de avanzar: marca en rojo los campos vacíos obligatorios
    y muestra un mensaje de error en pantalla.
  - El paso 7 (Finalizar) muestra un resumen de la info general y qué secciones
    se hicieron o no (renderResumenFinal()), y es donde vive el botón "Enviar".
  - Al enviar, recopila todos los datos del DOM en un objeto JSON (función payload())
    y los empaqueta junto con los archivos de evidencia en un FormData.
  - Hace una sola llamada al servidor:
      POST /enviar-onedrive-extintor → guarda la inspección en Neon + evidencias en OneDrive.
        El Inspector (quien diligencia el formulario) queda aprobado automáticamente
        con los datos de la info general; se devuelven los links de aprobación de
        Jefe de Área y COPASST, mostrados en el modal de éxito. El PDF y el correo
        se generan más tarde, solo cuando las 3 aprobaciones quedan completas
        (ver /aprobar/:token).

  Cómo interactúa:
  - Importa datos estáticos (listas de condiciones, ítems de botiquín, etc.) desde shared.js.
  - Delega la creación de tarjetas dinámicas a los managers:
      extintores.js, camillas.js, senalizaciones.js, botiquines.js, equiposTecnologicos.js
  - Cada manager expone { agregar(), leer() }; este archivo los llama para construir
    el FormData final antes de enviarlo al servidor (app.js).
*/
import {
  condiciones,
  condicionesCamilla,
  tipoOptionsHtml,
  itemsBotiquin,
  equiposTecnologicos,
  esCampoOpcional,
  crearOpciones,
  crearOpcionesAfectacion,
  activarSoloNumeros,
  abrirSelectorFecha,
  asignarFechaHoy,
  leerRespuesta
} from "/js/shared.js";

import { createExtintoresManager } from "/js/extintores.js";
import { createCamillasManager } from "/js/camillas.js";
import { createSenalizacionesManager } from "/js/senalizaciones.js";
import { createEquiposTecnologicosManager } from "/js/equiposTecnologicos.js";
import { createBotiquinesManager } from "/js/botiquines.js";

document.addEventListener("DOMContentLoaded", () => {
  let currentStep = 1;
  const totalSteps = 7;

  const extintoresManager = createExtintoresManager({
    condiciones,
    crearOpciones,
    tipoOptionsHtml
  });

  const camillasManager = createCamillasManager({
    condicionesCamilla,
    crearOpciones
  });

  const senalizacionesManager = createSenalizacionesManager({
    crearOpciones
  });

  const equiposTecnologicosManager = createEquiposTecnologicosManager({
    equiposTecnologicos,
    crearOpciones,
    crearOpcionesAfectacion
  });

  const botiquinesManager = createBotiquinesManager({
    itemsBotiquin,
    crearOpciones
  });

  // Sede Urabá: cada una de las 5 secciones (pasos 2 a 6) se puede omitir
  // explícitamente con el botón "Omitir" (se asume que esa sección no aplica
  // para esa inspección). Fuera de Urabá el botón no aparece.
  function esSedeUrabana() {
    const sede = document.getElementById("sedeOperacion")?.value || "";
    return [
      "urab",
      "santa marta"
    ].some(x => sede.toLowerCase().includes(x));

  }

  const SECCIONES_OMITIBLES = [
    { key: "extintores", step: 2, containerId: "extintores-container", btnOmitirId: "btn-omitir-extintores", mensajeId: "mensaje-omitido-extintores", btnAgregarId: "btn-agregar-extintor", siguientePaso: 3 },
    { key: "camillas", step: 3, containerId: "camillas-container", btnOmitirId: "btn-omitir-camillas", mensajeId: "mensaje-omitido-camillas", btnAgregarId: "btn-agregar-camilla", siguientePaso: 4 },
    { key: "senalizaciones", step: 4, containerId: "senalizaciones-container", btnOmitirId: "btn-omitir-senalizaciones", mensajeId: "mensaje-omitido-senalizaciones", btnAgregarId: "btn-agregar-senalizacion", siguientePaso: 5 },
    { key: "botiquines", step: 5, containerId: "botiquines-container", btnOmitirId: "btn-omitir-botiquines", mensajeId: "mensaje-omitido-botiquines", btnAgregarId: "btn-agregar-botiquin", siguientePaso: 6 },
    { key: "equiposTecnologicos", step: 6, containerId: "equipos-tecnologicos-container", btnOmitirId: "btn-omitir-equipos", mensajeId: "mensaje-omitido-equipos", btnAgregarId: null, siguientePaso: 7 }
  ];

  const seccionesOmitidas = {};
  SECCIONES_OMITIBLES.forEach((s) => { seccionesOmitidas[s.key] = false; });

  // Muestra/oculta los botones "Omitir" según la sede (solo Urabá). Si la sede
  // deja de ser Urabá, cancela cualquier omisión pendiente para no enviar
  // secciones vacías por error en otra sede.
  function actualizarVisibilidadOmitir() {
    const urabana = esSedeUrabana();
    SECCIONES_OMITIBLES.forEach((seccion) => {
      document.getElementById(seccion.btnOmitirId)?.classList.toggle("hidden", !urabana);
      if (!urabana && seccionesOmitidas[seccion.key]) {
        incluirSeccion(seccion);
      }
    });
  }

  // El botón "Omitir sección" es un toggle: al omitir se convierte en
  // "Incluir sección" y viceversa. No hay banner ni texto aparte.
  function actualizarTextoOmitir(seccion) {
    const btn = document.getElementById(seccion.btnOmitirId);
    if (btn) btn.textContent = seccionesOmitidas[seccion.key] ? "Incluir sección" : "Omitir sección";
  }

  function omitirSeccion(seccion) {
    seccionesOmitidas[seccion.key] = true;
    document.getElementById(seccion.containerId)?.classList.add("hidden");
    document.getElementById(seccion.mensajeId)?.classList.remove("hidden");
    if (seccion.btnAgregarId) document.getElementById(seccion.btnAgregarId)?.classList.add("hidden");
    actualizarTextoOmitir(seccion);
  }

  function incluirSeccion(seccion) {
    seccionesOmitidas[seccion.key] = false;
    document.getElementById(seccion.containerId)?.classList.remove("hidden");
    document.getElementById(seccion.mensajeId)?.classList.add("hidden");
    if (seccion.btnAgregarId) document.getElementById(seccion.btnAgregarId)?.classList.remove("hidden");
    actualizarTextoOmitir(seccion);
  }

  function validarPaso(numeroPaso) {
    const panel = document.querySelector(`[data-step-panel="${numeroPaso}"]`);
    if (!panel) return true;

    const seccion = SECCIONES_OMITIBLES.find((s) => s.step === numeroPaso);
    if (seccion && seccionesOmitidas[seccion.key]) {
      panel.querySelectorAll(".campo-error").forEach((el) => el.classList.remove("campo-error"));
      panel.querySelector(".validation-summary")?.remove();
      return true;
    }

    panel.querySelectorAll(".campo-error").forEach((el) => el.classList.remove("campo-error"));

    let valido = true;

    panel.querySelectorAll('input[type="text"], input[type="number"], input[type="date"], input[type="month"], input[type="file"]').forEach((input) => {
      if (input.disabled) return;
      if (esCampoOpcional(input)) return;
      if (!input.value.trim()) {
        input.classList.add("campo-error");
        valido = false;
      }
    });

    panel.querySelectorAll("select").forEach((select) => {
      if (select.disabled) return;
      if (!select.value) {
        select.classList.add("campo-error");
        valido = false;
      }
    });

    const summaryExistente = panel.querySelector(".validation-summary");
    if (!valido) {
      if (!summaryExistente) {
        const msg = document.createElement("div");
        msg.className = "validation-summary";
        msg.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clip-rule="evenodd"/></svg><span>Completa los campos marcados en rojo para continuar.</span>`;
        const stepActions = panel.querySelector(".step-actions");
        const stepActionsRight = stepActions?.querySelector(".step-actions-right");
        const navPrimary = (stepActionsRight ?? stepActions)?.querySelector(".nav-primary");
        const parent = stepActionsRight ?? stepActions;
        if (navPrimary && parent) {
          parent.insertBefore(msg, navPrimary);
        } else if (stepActions) {
          stepActions.appendChild(msg);
        } else {
          panel.appendChild(msg);
        }
      }
      const primerError = panel.querySelector(".campo-error");
      if (primerError) {
        primerError.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    } else if (summaryExistente) {
      summaryExistente.remove();
    }

    if (numeroPaso === 7 && !tieneItemsInspeccion()) {
      const msg = document.getElementById("msg");
      if (msg) {
        msg.textContent = "No puede enviar este informe porque no se ha registrado ningún ítem en la inspección.";
      }
      const btnEnviar = document.getElementById("btn-onedrive");
      if (btnEnviar) {
        btnEnviar.disabled = true;
      }
      return false;
    }

    return valido;
  }

  function irPaso(step) {
    if (step < 1 || step > totalSteps) return;
    if (step > currentStep && !validarPaso(currentStep)) return;

    const panelSaliente = document.querySelector(`[data-step-panel="${currentStep}"]`);
    panelSaliente?.querySelector(".validation-summary")?.remove();
    panelSaliente?.querySelectorAll(".campo-error").forEach((el) => el.classList.remove("campo-error"));

    currentStep = step;
    actualizarVisibilidadOmitir();

    if (currentStep === 7) renderResumenFinal();

    document.querySelectorAll("[data-step-panel]").forEach((panel) => {
      const panelStep = Number(panel.getAttribute("data-step-panel"));
      panel.classList.toggle("hidden", panelStep !== currentStep);
    });

    document.querySelectorAll("[data-step-indicator]").forEach((indicator) => {
      const indicatorStep = Number(indicator.getAttribute("data-step-indicator"));
      indicator.classList.remove("active", "done");

      if (indicatorStep < currentStep) {
        indicator.classList.add("done");
      } else if (indicatorStep === currentStep) {
        indicator.classList.add("active");
      }
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function generarInspeccionId() {
    const hoy = new Date();
    const fecha = `${hoy.getFullYear()}${String(hoy.getMonth() + 1).padStart(2, "0")}${String(hoy.getDate()).padStart(2, "0")}`;
    const aleatorio = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `INSP-${fecha}-${aleatorio}`;
  }

  function payload(inspeccionId) {
    // Las secciones omitidas (solo posible en sede Urabá) se envían vacías,
    // sin importar lo que haya quedado en el DOM.
    const extintores = seccionesOmitidas.extintores ? [] : extintoresManager.leer();
    const camillas = seccionesOmitidas.camillas ? [] : camillasManager.leer();
    const senalizaciones = seccionesOmitidas.senalizaciones ? [] : senalizacionesManager.leer();
    const equiposTecnologicosData = seccionesOmitidas.equiposTecnologicos ? [] : equiposTecnologicosManager.leer();
    const botiquinesData = seccionesOmitidas.botiquines ? [] : botiquinesManager.leer();

    return {
      inspeccionId: inspeccionId || generarInspeccionId(),
      fecha: document.getElementById("fecha").value,
      sedeOperacion: document.getElementById("sedeOperacion").value,
      areaTrabajo: document.getElementById("areaTrabajo").value,
      jefeResponsable: document.getElementById("jefeResponsable").value,
      cargoJefe: document.getElementById("cargoJefe").value,
      responsableInspeccion: document.getElementById("responsableInspeccion").value,
      cargoResponsable: document.getElementById("cargoResponsable").value,
      camillas,
      camilla: camillas[0] || null,
      senalizaciones,
      senalizacion: senalizaciones[0] || null,
      equiposTecnologicos: equiposTecnologicosData,
      equipoTecnologico: equiposTecnologicosData[0] || null,
      observacionesEquipos: document.getElementById("observacionesEquipos")?.value || "",
      botiquines: botiquinesData,
      botiquin: botiquinesData[0] || null,
      extintores,
      extintor: extintores[0] || null
    };
  }

  function contarItemsInspeccion() {
    return (
      (seccionesOmitidas.extintores ? 0 : extintoresManager.leer().length) +
      (seccionesOmitidas.camillas ? 0 : camillasManager.leer().length) +
      (seccionesOmitidas.senalizaciones ? 0 : senalizacionesManager.leer().length) +
      (seccionesOmitidas.botiquines ? 0 : botiquinesManager.leer().length) +
      (seccionesOmitidas.equiposTecnologicos ? 0 : equiposTecnologicosManager.leer().length)
    );
  }

  function tieneItemsInspeccion() {
    return contarItemsInspeccion() > 0;
  }

  // Resumen del paso 7: datos generales + qué secciones se hicieron y cuáles no
  // (omitidas o simplemente vacías). Se recalcula cada vez que se entra al paso.
  function renderResumenFinal() {
    document.getElementById("resumen-fecha").textContent = document.getElementById("fecha").value || "-";
    document.getElementById("resumen-sede").textContent = document.getElementById("sedeOperacion").value || "-";
    document.getElementById("resumen-area").textContent = document.getElementById("areaTrabajo").value || "-";
    document.getElementById("resumen-jefe").textContent = document.getElementById("jefeResponsable").value || "-";
    document.getElementById("resumen-cargo-jefe").textContent = document.getElementById("cargoJefe").value || "-";
    document.getElementById("resumen-responsable").textContent = document.getElementById("responsableInspeccion").value || "-";
    document.getElementById("resumen-cargo-responsable").textContent = document.getElementById("cargoResponsable").value || "-";

    const conteos = [
      { label: "Extintores", n: seccionesOmitidas.extintores ? 0 : extintoresManager.leer().length },
      { label: "Camillas", n: seccionesOmitidas.camillas ? 0 : camillasManager.leer().length },
      { label: "Señalización", n: seccionesOmitidas.senalizaciones ? 0 : senalizacionesManager.leer().length },
      { label: "Botiquín", n: seccionesOmitidas.botiquines ? 0 : botiquinesManager.leer().length },
      { label: "Equipos Tecnológicos", n: seccionesOmitidas.equiposTecnologicos ? 0 : equiposTecnologicosManager.leer().length }
    ];

    document.getElementById("resumen-secciones").innerHTML = conteos.map(({ label, n }) => `
      <div class="resumen-seccion-item ${n > 0 ? "resumen-seccion-item--ok" : "resumen-seccion-item--no"}">
        <span>${label}</span>
        <span>${n > 0 ? `Hecho (${n})` : "No se hizo"}</span>
      </div>
    `).join("");

    const totalItems = contarItemsInspeccion();
    const msg = document.getElementById("msg");
    const btnEnviar = document.getElementById("btn-onedrive");

    if (totalItems === 0) {
      if (msg) {
        msg.textContent = "No puede enviar este informe porque no se ha registrado ningún ítem en la inspección.";
      }
      if (btnEnviar) {
        btnEnviar.disabled = true;
      }
    } else {
      if (msg) {
        msg.textContent = "";
      }
      if (btnEnviar) {
        btnEnviar.disabled = false;
      }
    }
  }

  // Anexa todas las fotos seleccionadas en un bloque de evidencias (data-role="{rolePrefix}-input")
  // como campos "{fieldPrefix}-{itemIndex}-{photoIndex}" (+ su "-lastmod").
  function anexarEvidenciasMultiples(fd, card, rolePrefix, fieldPrefix, itemIndex) {
    card.querySelectorAll(`[data-role="${rolePrefix}-input"]`).forEach((input, photoIndex) => {
      const f = input.files[0];
      if (!f) return;
      fd.append(`${fieldPrefix}-${itemIndex}-${photoIndex}`, f);
      fd.append(`${fieldPrefix}-${itemIndex}-${photoIndex}-lastmod`, f.lastModified);
    });
  }

  function construirFormData(inspeccionId, numInspeccion) {
    const fd = new FormData();
    const p = payload(inspeccionId);
    if (numInspeccion != null) p.numInspeccion = numInspeccion;
    fd.append("payload", JSON.stringify(p));

    document.querySelectorAll("[data-extintor-index]").forEach((card, index) => {
      anexarEvidenciasMultiples(fd, card, "evidencia", "evidencia", index);
    });

    document.querySelectorAll("[data-camilla-index]").forEach((card, index) => {
      anexarEvidenciasMultiples(fd, card, "camilla-evidencia", "evidencia-camilla", index);
    });

    document.querySelectorAll("[data-senalizacion-index]").forEach((card, index) => {
      anexarEvidenciasMultiples(fd, card, "senalizacion-evidencia", "evidencia-senalizacion", index);
    });

    document.querySelectorAll("[data-equipo-tecnologico-index]").forEach((card, index) => {
      anexarEvidenciasMultiples(fd, card, "equipo-tecnologico-evidencia", "equipo-tecnologico-evidencia", index);
    });

    document.querySelectorAll("[data-botiquin-index]").forEach((card, index) => {
      anexarEvidenciasMultiples(fd, card, "botiquin-evidencia", "botiquin-evidencia", index);
    });

    return fd;
  }


  function mostrarModalCancelar() {
    document.getElementById("cancelar-modal").classList.add("visible");
  }

  function cerrarModalCancelar() {
    document.getElementById("cancelar-modal").classList.remove("visible");
  }

  async function enviarOneDrive() {
    if (!validarPaso(currentStep)) return;

    if (!tieneItemsInspeccion()) {
      const msg = document.getElementById("msg");
      if (msg) {
        msg.textContent = "No puede enviar este informe porque no se ha registrado ningún ítem en la inspección.";
      }
      return;
    }

    const btnEnviar = document.getElementById("btn-onedrive");
    btnEnviar.disabled = true;
    mostrarModal("cargando");


    try {
      const inspeccionId = generarInspeccionId();

      // Guarda la inspección (Neon + evidencias en OneDrive). El Inspector queda
      // aprobado automáticamente; se devuelven los links de Jefe y COPASST.
      // El PDF y el correo ya no se envían aquí: se generan solo cuando las 3 aprobaciones están completas.
      const respuestaOneDrive = await fetch("/enviar-onedrive-extintor", { method: "POST", body: construirFormData(inspeccionId) });
      const datosOneDrive = await leerRespuesta(respuestaOneDrive);

      if (!respuestaOneDrive.ok) {
        const errMsg = Array.isArray(datosOneDrive.errores)
          ? datosOneDrive.errores.join(" | ")
          : "Error al guardar la inspección";
        document.getElementById("envio-error-texto").textContent = errMsg;
        mostrarModal("error");
        btnEnviar.disabled = false;
        return;
      }

      const numInspeccion = datosOneDrive.numInspeccion ?? null;
      mostrarModal("exito", inspeccionId, numInspeccion, datosOneDrive.links);
    } catch (err) {

      console.error("===== ERROR COMPLETO =====");
      console.error(err);
      console.error(err.stack);

      document.getElementById("envio-error-texto").textContent =
        err?.message || "No fue posible completar el envío.";

      mostrarModal("error");

      btnEnviar.disabled = false;

    }
  }

  extintoresManager.agregar();
  camillasManager.agregar();
  senalizacionesManager.agregar();
  botiquinesManager.agregar();
  equiposTecnologicosManager.render(document.getElementById("equipos-tecnologicos-container"));

  activarSoloNumeros();
  asignarFechaHoy();

  document.querySelectorAll("[data-step-target]").forEach((button) => {
    button.addEventListener("click", () => {
      irPaso(Number(button.getAttribute("data-step-target")));
    });
  });

  document.querySelectorAll("[data-step-indicator]").forEach((indicator) => {
    indicator.addEventListener("click", () => {
      irPaso(Number(indicator.getAttribute("data-step-indicator")));
    });
  });

  irPaso(1);

  document.getElementById("btn-agregar-extintor").addEventListener("click", extintoresManager.agregar);
  document.getElementById("btn-agregar-camilla").addEventListener("click", camillasManager.agregar);
  document.getElementById("btn-agregar-senalizacion").addEventListener("click", senalizacionesManager.agregar);
  document.getElementById("btn-agregar-botiquin").addEventListener("click", botiquinesManager.agregar);
  document.getElementById("fecha")?.addEventListener("click", abrirSelectorFecha);
  document.getElementById("btn-onedrive").addEventListener("click", enviarOneDrive);

  // Botón "Omitir sección" / "Incluir sección" (toggle, solo visible en sede Urabá).
  SECCIONES_OMITIBLES.forEach((seccion) => {
    document.getElementById(seccion.btnOmitirId)?.addEventListener("click", () => {
      if (seccionesOmitidas[seccion.key]) {
        incluirSeccion(seccion);
      } else {
        omitirSeccion(seccion);
        if (seccion.siguientePaso) irPaso(seccion.siguientePaso);
      }
    });
  });
  document.getElementById("sedeOperacion")?.addEventListener("input", actualizarVisibilidadOmitir);
  document.getElementById("sedeOperacion")?.addEventListener("change", actualizarVisibilidadOmitir);
  actualizarVisibilidadOmitir();

  document.getElementById("btn-modal-nueva").addEventListener("click", () => location.reload());
  document.getElementById("btn-modal-inicio").addEventListener("click", () => { location.href = "/"; });
  document.getElementById("btn-modal-cerrar-error").addEventListener("click", cerrarModal);

  document.querySelectorAll(".envio-link-copy").forEach((boton) => {
    boton.addEventListener("click", () => copiarLink(boton));
  });

  document.getElementById("btn-salir").addEventListener("click", mostrarModalCancelar);
  document.getElementById("btn-cancelar-no").addEventListener("click", cerrarModalCancelar);
  document.getElementById("btn-cancelar-si").addEventListener("click", () => { location.href = "/"; });
});
