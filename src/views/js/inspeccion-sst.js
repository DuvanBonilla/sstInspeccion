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
  leerRespuesta,
} from "/js/shared.js";

import { createExtintoresManager } from "/js/extintores.js";
import { createCamillasManager } from "/js/camillas.js";
import { createSenalizacionesManager } from "/js/senalizaciones.js";
import { createEquiposTecnologicosManager } from "/js/equiposTecnologicos.js";
import { createBotiquinesManager } from "/js/botiquines.js";
import { optimizarImagen } from "./imageOptimizer.js";
import { generarInspeccionId } from "./sst/inspeccionSst.id.js";
import { construirInspeccionSst } from "./sst/inspeccionSst.payload.js";
import { construirFormDataSst } from "./sst/inspeccionSst.formData.js";
import { enviarInspeccionSst as enviarInspeccionSstApi } from "./sst/inspeccionSst.api.js";
import { crearEnvioInspeccionSstController } from "./sst/controllers/envioInspeccionSst.controller.js";
import { crearNavegacionInspeccionSst } from "./sst/controllers/navegacionInspeccionSst.controller.js";

document.addEventListener("DOMContentLoaded", () => {
  const totalSteps = 7;

  const extintoresManager = createExtintoresManager({
    condiciones,
    crearOpciones,
    tipoOptionsHtml,
  });

  const camillasManager = createCamillasManager({
    condicionesCamilla,
    crearOpciones,
  });

  const senalizacionesManager = createSenalizacionesManager({
    crearOpciones,
  });

  const equiposTecnologicosManager = createEquiposTecnologicosManager({
    equiposTecnologicos,
    crearOpciones,
    crearOpcionesAfectacion,
  });

  const botiquinesManager = createBotiquinesManager({
    itemsBotiquin,
    crearOpciones,
  });

  /**
   * Determina si la sede permite omitir secciones de la inspección.
   *
   * Actualmente considera aplicable esta regla para las sedes de Urabá y
   * Santa Marta.
   *
   * @returns {boolean} `true` cuando la sede permite omitir secciones.
   */

  function esSedeUrabana() {
    const sede = document.getElementById("sedeOperacion")?.value || "";
    return ["urab", "santa marta"].some((x) => sede.toLowerCase().includes(x));
  }

  const SECCIONES_OMITIBLES = [
    {
      key: "extintores",
      step: 2,
      containerId: "extintores-container",
      btnOmitirId: "btn-omitir-extintores",
      mensajeId: "mensaje-omitido-extintores",
      btnAgregarId: "btn-agregar-extintor",
      siguientePaso: 3,
    },
    {
      key: "camillas",
      step: 3,
      containerId: "camillas-container",
      btnOmitirId: "btn-omitir-camillas",
      mensajeId: "mensaje-omitido-camillas",
      btnAgregarId: "btn-agregar-camilla",
      siguientePaso: 4,
    },
    {
      key: "senalizaciones",
      step: 4,
      containerId: "senalizaciones-container",
      btnOmitirId: "btn-omitir-senalizaciones",
      mensajeId: "mensaje-omitido-senalizaciones",
      btnAgregarId: "btn-agregar-senalizacion",
      siguientePaso: 5,
    },
    {
      key: "botiquines",
      step: 5,
      containerId: "botiquines-container",
      btnOmitirId: "btn-omitir-botiquines",
      mensajeId: "mensaje-omitido-botiquines",
      btnAgregarId: "btn-agregar-botiquin",
      siguientePaso: 6,
    },
    {
      key: "equiposTecnologicos",
      step: 6,
      containerId: "equipos-tecnologicos-container",
      btnOmitirId: "btn-omitir-equipos",
      mensajeId: "mensaje-omitido-equipos",
      btnAgregarId: null,
      siguientePaso: 7,
    },
  ];

  const seccionesOmitidas = {};
  SECCIONES_OMITIBLES.forEach((s) => {
    seccionesOmitidas[s.key] = false;
  });

  // Muestra/oculta los botones "Omitir" según la sede (solo Urabá). Si la sede
  // deja de ser Urabá, cancela cualquier omisión pendiente para no enviar
  // secciones vacías por error en otra sede.
  function actualizarVisibilidadOmitir() {
    const urabana = esSedeUrabana();
    SECCIONES_OMITIBLES.forEach((seccion) => {
      document
        .getElementById(seccion.btnOmitirId)
        ?.classList.toggle("hidden", !urabana);
      if (!urabana && seccionesOmitidas[seccion.key]) {
        incluirSeccion(seccion);
      }
    });
  }

  // El botón "Omitir sección" es un toggle: al omitir se convierte en
  // "Incluir sección" y viceversa. No hay banner ni texto aparte.
  function actualizarTextoOmitir(seccion) {
    const btn = document.getElementById(seccion.btnOmitirId);
    if (btn)
      btn.textContent = seccionesOmitidas[seccion.key]
        ? "Incluir sección"
        : "Omitir sección";
  }

  function omitirSeccion(seccion) {
    seccionesOmitidas[seccion.key] = true;
    document.getElementById(seccion.containerId)?.classList.add("hidden");
    document.getElementById(seccion.mensajeId)?.classList.remove("hidden");
    if (seccion.btnAgregarId)
      document.getElementById(seccion.btnAgregarId)?.classList.add("hidden");
    actualizarTextoOmitir(seccion);
  }

  function incluirSeccion(seccion) {
    seccionesOmitidas[seccion.key] = false;
    document.getElementById(seccion.containerId)?.classList.remove("hidden");
    document.getElementById(seccion.mensajeId)?.classList.add("hidden");
    if (seccion.btnAgregarId)
      document.getElementById(seccion.btnAgregarId)?.classList.remove("hidden");
    actualizarTextoOmitir(seccion);
  }

  /**
   * Valida los campos obligatorios del paso actual del formulario.
   *
   * Ignora los campos deshabilitados, los configurados como opcionales y las
   * secciones que fueron omitidas. Cuando encuentra datos incompletos, marca
   * los campos, muestra un mensaje y dirige la vista al primer error.
   *
   * En el paso final también impide enviar una inspección sin elementos.
   *
   * @param {number} numeroPaso Número del paso que será validado.
   * @returns {boolean} `true` cuando el paso puede continuar.
   */

  function validarPaso(numeroPaso) {
    const panel = document.querySelector(`[data-step-panel="${numeroPaso}"]`);
    if (!panel) return true;

    const seccion = SECCIONES_OMITIBLES.find((s) => s.step === numeroPaso);
    if (seccion && seccionesOmitidas[seccion.key]) {
      panel
        .querySelectorAll(".campo-error")
        .forEach((el) => el.classList.remove("campo-error"));
      panel.querySelector(".validation-summary")?.remove();
      return true;
    }

    panel
      .querySelectorAll(".campo-error")
      .forEach((el) => el.classList.remove("campo-error"));

    let valido = true;

    panel
      .querySelectorAll(
        'input[type="text"], input[type="number"], input[type="date"], input[type="month"], input[type="file"]',
      )
      .forEach((input) => {
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
        const stepActionsRight = stepActions?.querySelector(
          ".step-actions-right",
        );
        const navPrimary = (stepActionsRight ?? stepActions)?.querySelector(
          ".nav-primary",
        );
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
        msg.textContent =
          "No puede enviar este informe porque no se ha registrado ningún ítem en la inspección.";
      }
      const btnEnviar = document.getElementById("btn-onedrive");
      if (btnEnviar) {
        btnEnviar.disabled = true;
      }
      return false;
    }

    return valido;
  }

  function actualizarBotonSiguienteGeneral() {
    const panel = document.querySelector('[data-step-panel="1"]');

    const botonSiguiente = panel?.querySelector('[data-step-target="2"]');

    if (!panel || !botonSiguiente) {
      return;
    }

    const camposTexto = panel.querySelectorAll(
      'input[type="text"], input[type="date"], select',
    );

    const camposCompletos = Array.from(camposTexto).every((campo) => {
      if (campo.disabled || esCampoOpcional(campo)) {
        return true;
      }

      return String(campo.value || "").trim() !== "";
    });

    botonSiguiente.disabled = !camposCompletos;
  }

  const navegacion = crearNavegacionInspeccionSst({
    documento: document,
    ventana: window,
    totalPasos: totalSteps,
    validarPaso,
    actualizarVisibilidadOmitir,
    prepararResumen: renderResumenFinal,
  });
  /**
   * Construye el objeto completo de una inspección SST.
   *
   * Recopila la información general y los elementos registrados por los
   * administradores de cada sección. Las secciones marcadas como omitidas se
   * incluyen como arreglos vacíos.
   *
   * @param {string} [inspeccionId] Identificador previamente generado.
   * @returns {Object} Información general y secciones de la inspección SST.
   */
  function payload(inspeccionId) {
    return construirInspeccionSst({
      inspeccionId,
      generarInspeccionId,
      obtenerValor(id) {
        return document.getElementById(id)?.value || "";
      },
      seccionesOmitidas,
      leerExtintores() {
        return extintoresManager.leer();
      },
      leerCamillas() {
        return camillasManager.leer();
      },
      leerSenalizaciones() {
        return senalizacionesManager.leer();
      },
      leerEquiposTecnologicos() {
        return equiposTecnologicosManager.leer();
      },
      leerBotiquines() {
        return botiquinesManager.leer();
      },
    });
  }

  function contarItemsInspeccion() {
    return (
      (seccionesOmitidas.extintores ? 0 : extintoresManager.leer().length) +
      (seccionesOmitidas.camillas ? 0 : camillasManager.leer().length) +
      (seccionesOmitidas.senalizaciones
        ? 0
        : senalizacionesManager.leer().length) +
      (seccionesOmitidas.botiquines ? 0 : botiquinesManager.leer().length) +
      (seccionesOmitidas.equiposTecnologicos
        ? 0
        : equiposTecnologicosManager.leer().length)
    );
  }

  function tieneItemsInspeccion() {
    return contarItemsInspeccion() > 0;
  }

  /**
   * Muestra el resumen final de la inspección SST.
   *
   * Presenta la información general y la cantidad de elementos registrados en
   * cada sección. También deshabilita el envío cuando la inspección no contiene
   * ningún elemento.
   *
   * @returns {void}
   */

  function renderResumenFinal() {
    document.getElementById("resumen-fecha").textContent =
      document.getElementById("fecha").value || "-";
    document.getElementById("resumen-sede").textContent =
      document.getElementById("sedeOperacion").value || "-";
    document.getElementById("resumen-area").textContent =
      document.getElementById("areaTrabajo").value || "-";
    document.getElementById("resumen-jefe").textContent =
      document.getElementById("jefeResponsable").value || "-";
    document.getElementById("resumen-cargo-jefe").textContent =
      document.getElementById("cargoJefe").value || "-";
    document.getElementById("resumen-responsable").textContent =
      document.getElementById("responsableInspeccion").value || "-";
    document.getElementById("resumen-cargo-responsable").textContent =
      document.getElementById("cargoResponsable").value || "-";

    const conteos = [
      {
        label: "Extintores",
        n: seccionesOmitidas.extintores ? 0 : extintoresManager.leer().length,
      },
      {
        label: "Camillas",
        n: seccionesOmitidas.camillas ? 0 : camillasManager.leer().length,
      },
      {
        label: "Señalización",
        n: seccionesOmitidas.senalizaciones
          ? 0
          : senalizacionesManager.leer().length,
      },
      {
        label: "Botiquín",
        n: seccionesOmitidas.botiquines ? 0 : botiquinesManager.leer().length,
      },
      {
        label: "Equipos Tecnológicos",
        n: seccionesOmitidas.equiposTecnologicos
          ? 0
          : equiposTecnologicosManager.leer().length,
      },
    ];

    document.getElementById("resumen-secciones").innerHTML = conteos
      .map(
        ({ label, n }) => `
      <div class="resumen-seccion-item ${n > 0 ? "resumen-seccion-item--ok" : "resumen-seccion-item--no"}">
        <span>${label}</span>
        <span>${n > 0 ? `Hecho (${n})` : "No se hizo"}</span>
      </div>
    `,
      )
      .join("");

    const totalItems = contarItemsInspeccion();
    const msg = document.getElementById("msg");
    const btnEnviar = document.getElementById("btn-onedrive");

    if (totalItems === 0) {
      if (msg) {
        msg.textContent =
          "No puede enviar este informe porque no se ha registrado ningún ítem en la inspección.";
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

  async function construirFormData(inspeccionId, numInspeccion) {
    return construirFormDataSst({
      inspeccionId,
      numInspeccion,
      construirPayload: payload,
      documento: document,
      optimizarImagen,
    });
  }

  function mostrarModalCancelar() {
    document.getElementById("cancelar-modal").classList.add("visible");
  }

  function cerrarModalCancelar() {
    document.getElementById("cancelar-modal").classList.remove("visible");
  }

  const envioInspeccion = crearEnvioInspeccionSstController({
    documento: document,

    obtenerPasoActual() {
      return navegacion.obtenerPasoActual();
    },

    validarPaso,

    tieneItemsInspeccion,

    generarInspeccionId,

    construirFormData,

    enviarInspeccion(formData) {
      return enviarInspeccionSstApi(formData, {
        leerRespuesta,
      });
    },

    mostrarModal,
  });

  extintoresManager.agregar();
  camillasManager.agregar();
  senalizacionesManager.agregar();
  botiquinesManager.agregar();
  equiposTecnologicosManager.render(
    document.getElementById("equipos-tecnologicos-container"),
  );

  activarSoloNumeros();
  asignarFechaHoy();

  navegacion.inicializar();

  const panelInformacionGeneral = document.querySelector(
    '[data-step-panel="1"]',
  );

  panelInformacionGeneral?.addEventListener(
    "input",
    actualizarBotonSiguienteGeneral,
  );

  panelInformacionGeneral?.addEventListener(
    "change",
    actualizarBotonSiguienteGeneral,
  );

  actualizarBotonSiguienteGeneral();

  document
    .getElementById("btn-agregar-extintor")
    .addEventListener("click", extintoresManager.agregar);
  document
    .getElementById("btn-agregar-camilla")
    .addEventListener("click", camillasManager.agregar);
  document
    .getElementById("btn-agregar-senalizacion")
    .addEventListener("click", senalizacionesManager.agregar);
  document
    .getElementById("btn-agregar-botiquin")
    .addEventListener("click", botiquinesManager.agregar);
  document
    .getElementById("fecha")
    ?.addEventListener("click", abrirSelectorFecha);
  envioInspeccion.inicializar();

  // Botón "Omitir sección" / "Incluir sección" (toggle, solo visible en sede Urabá).
  SECCIONES_OMITIBLES.forEach((seccion) => {
    document
      .getElementById(seccion.btnOmitirId)
      ?.addEventListener("click", () => {
        if (seccionesOmitidas[seccion.key]) {
          incluirSeccion(seccion);
        } else {
          omitirSeccion(seccion);
          if (seccion.siguientePaso) {
            navegacion.irPaso(seccion.siguientePaso);
          }
        }
      });
  });
  document
    .getElementById("sedeOperacion")
    ?.addEventListener("input", actualizarVisibilidadOmitir);
  document
    .getElementById("sedeOperacion")
    ?.addEventListener("change", actualizarVisibilidadOmitir);
  actualizarVisibilidadOmitir();

  document
    .getElementById("btn-modal-nueva")
    .addEventListener("click", () => location.reload());
  document.getElementById("btn-modal-inicio").addEventListener("click", () => {
    location.href = "/";
  });
  document
    .getElementById("btn-modal-cerrar-error")
    .addEventListener("click", cerrarModal);

  document.querySelectorAll(".envio-link-copy").forEach((boton) => {
    boton.addEventListener("click", () => copiarLink(boton));
  });

  document
    .getElementById("btn-salir")
    .addEventListener("click", mostrarModalCancelar);
  document
    .getElementById("btn-cancelar-no")
    .addEventListener("click", cerrarModalCancelar);
  document.getElementById("btn-cancelar-si").addEventListener("click", () => {
    location.href = "/";
  });
});
