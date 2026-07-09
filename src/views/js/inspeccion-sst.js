/*
  inspeccion-sst.js — Controlador principal del formulario SST en el navegador.

  Qué hace:
  - Orquesta los 6 pasos del formulario: Info General → Extintores → Camillas
    → Señalización → Botiquín → Equipos Tecnológicos.
  - Valida cada paso antes de avanzar: marca en rojo los campos vacíos obligatorios
    y muestra un mensaje de error en pantalla.
  - Al enviar, recopila todos los datos del DOM en un objeto JSON (función payload())
    y los empaqueta junto con los archivos de evidencia en un FormData.
  - Hace dos llamadas secuenciales al servidor:
      1. POST /enviar-onedrive-extintor → guarda en Excel de OneDrive
      2. POST /enviar-pdf-prueba-correo → genera PDF y lo envía por correo

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
  const totalSteps = 6;

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

  function validarPaso(numeroPaso) {
    const panel = document.querySelector(`[data-step-panel="${numeroPaso}"]`);
    if (!panel) return true;

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

    return valido;
  }

  function irPaso(step) {
    if (step < 1 || step > totalSteps) return;
    if (step > currentStep && !validarPaso(currentStep)) return;

    const panelSaliente = document.querySelector(`[data-step-panel="${currentStep}"]`);
    panelSaliente?.querySelector(".validation-summary")?.remove();
    panelSaliente?.querySelectorAll(".campo-error").forEach((el) => el.classList.remove("campo-error"));

    currentStep = step;

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
    const extintores = extintoresManager.leer();
    const camillas = camillasManager.leer();
    const senalizaciones = senalizacionesManager.leer();
    const equiposTecnologicosData = equiposTecnologicosManager.leer();
    const botiquinesData = botiquinesManager.leer();

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

  function mostrarModal(estado, inspeccionId = null, numInspeccion = null) {
    const modal = document.getElementById("envio-modal");
    document.getElementById("envio-estado-cargando").classList.toggle("hidden", estado !== "cargando");
    document.getElementById("envio-estado-exito").classList.toggle("hidden", estado !== "exito");
    document.getElementById("envio-estado-error").classList.toggle("hidden", estado !== "error");
    if (estado === "exito" && inspeccionId) {
      document.getElementById("envio-inspeccion-id").textContent = inspeccionId;
      const numEl = document.getElementById("envio-num-inspeccion");
      if (numEl) {
        if (numInspeccion != null) {
          numEl.textContent = `Inspección N.° ${numInspeccion}`;
          numEl.classList.remove("hidden");
        } else {
          numEl.classList.add("hidden");
        }
      }
    }
    modal.classList.add("visible");
  }

  function cerrarModal() {
    document.getElementById("envio-modal").classList.remove("visible");
  }

  function mostrarModalCancelar() {
    document.getElementById("cancelar-modal").classList.add("visible");
  }

  function cerrarModalCancelar() {
    document.getElementById("cancelar-modal").classList.remove("visible");
  }

  async function enviarOneDrive() {
    if (!validarPaso(currentStep)) return;

    const btnEnviar = document.getElementById("btn-onedrive");
    btnEnviar.disabled = true;
    mostrarModal("cargando");

    try {
      const inspeccionId = generarInspeccionId();

      // Primero guardar en OneDrive para obtener el número de inspección
      const respuestaOneDrive = await fetch("/enviar-onedrive-extintor", { method: "POST", body: construirFormData(inspeccionId) });
      const datosOneDrive = await leerRespuesta(respuestaOneDrive);

      if (!respuestaOneDrive.ok) {
        const errMsg = Array.isArray(datosOneDrive.errores)
          ? datosOneDrive.errores.join(" | ")
          : "Error al guardar en OneDrive";
        document.getElementById("envio-error-texto").textContent = errMsg;
        mostrarModal("error");
        btnEnviar.disabled = false;
        return;
      }

      const numInspeccion = datosOneDrive.numInspeccion ?? null;

      // Luego enviar el correo incluyendo el número de inspección en el payload
      const respuestaCorreo = await fetch("/enviar-pdf-prueba-correo", { method: "POST", body: construirFormData(inspeccionId, numInspeccion) });
      const datosCorreo = await leerRespuesta(respuestaCorreo);

      if (!respuestaCorreo.ok) {
        const errCorreo = Array.isArray(datosCorreo.errores)
          ? datosCorreo.errores.join(" | ")
          : "Error al enviar correo";
        document.getElementById("envio-error-texto").textContent =
          `Datos guardados, pero el correo falló: ${errCorreo}`;
        mostrarModal("error");
        btnEnviar.disabled = false;
        return;
      }

      mostrarModal("exito", inspeccionId, numInspeccion);
    } catch {
      document.getElementById("envio-error-texto").textContent =
        "No fue posible completar el envío. Verifique su conexión.";
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

  document.getElementById("btn-modal-nueva").addEventListener("click", () => location.reload());
  document.getElementById("btn-modal-inicio").addEventListener("click", () => { location.href = "/"; });
  document.getElementById("btn-modal-cerrar-error").addEventListener("click", cerrarModal);

  document.getElementById("btn-salir").addEventListener("click", mostrarModalCancelar);
  document.getElementById("btn-cancelar-no").addEventListener("click", cerrarModalCancelar);
  document.getElementById("btn-cancelar-si").addEventListener("click", () => { location.href = "/"; });
});
