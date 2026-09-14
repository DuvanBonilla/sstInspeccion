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
import { crearValidacionPasosSst } from "./sst/controllers/validacionPasosSst.controller.js";
import { crearSeccionesOmitidasSstController } from "./sst/controllers/seccionesOmitidasSst.controller.js";
import { crearResumenInspeccionSstController } from "./sst/controllers/resumenInspeccionSst.controller.js";

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

  const secciones = crearSeccionesOmitidasSstController({
    documento: document,
  });

  const seccionesOmitidas = secciones.seccionesOmitidas;

  const resumenInspeccion = crearResumenInspeccionSstController({
    documento: document,

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

    leerBotiquines() {
      return botiquinesManager.leer();
    },

    leerEquiposTecnologicos() {
      return equiposTecnologicosManager.leer();
    },
  });

  const validacion = crearValidacionPasosSst({
    documento: document,
    seccionesOmitibles: secciones.seccionesOmitibles,
    seccionesOmitidas: secciones.seccionesOmitidas,
    esCampoOpcional,
    tieneItemsInspeccion: resumenInspeccion.tieneItemsInspeccion,
  });

  const navegacion = crearNavegacionInspeccionSst({
    documento: document,
    ventana: window,
    totalPasos: totalSteps,
    validarPaso: validacion.validarPaso,
    actualizarVisibilidadOmitir: secciones.actualizarVisibilidadOmitir,
    prepararResumen: resumenInspeccion.renderizar,
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
      seccionesOmitidas: secciones.seccionesOmitidas,
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

    validarPaso: validacion.validarPaso,

    tieneItemsInspeccion: resumenInspeccion.tieneItemsInspeccion,

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

  validacion.inicializar();

  navegacion.inicializar();

  secciones.inicializar({
    navegarAlPaso: navegacion.irPaso,
  });

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
