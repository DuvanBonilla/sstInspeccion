/**
 * Gestiona el conteo de elementos y el resumen final de una inspección SST.
 *
 * @param {Object} dependencias Dependencias del resumen.
 * @param {Document} dependencias.documento Documento de la interfaz.
 * @param {Object} dependencias.seccionesOmitidas Estado de las secciones.
 * @param {Function} dependencias.leerExtintores Obtiene los extintores.
 * @param {Function} dependencias.leerCamillas Obtiene las camillas.
 * @param {Function} dependencias.leerSenalizaciones Obtiene las señalizaciones.
 * @param {Function} dependencias.leerBotiquines Obtiene los botiquines.
 * @param {Function} dependencias.leerEquiposTecnologicos Obtiene los equipos.
 * @returns {Object} API del controlador del resumen.
 */
export function crearResumenInspeccionSstController({
  documento,
  seccionesOmitidas,
  leerExtintores,
  leerCamillas,
  leerSenalizaciones,
  leerBotiquines,
  leerEquiposTecnologicos,
}) {
  function obtenerConteos() {
    return [
      {
        key: "extintores",
        label: "Extintores",
        cantidad: seccionesOmitidas.extintores
          ? 0
          : leerExtintores().length,
      },
      {
        key: "camillas",
        label: "Camillas",
        cantidad: seccionesOmitidas.camillas
          ? 0
          : leerCamillas().length,
      },
      {
        key: "senalizaciones",
        label: "Señalización",
        cantidad: seccionesOmitidas.senalizaciones
          ? 0
          : leerSenalizaciones().length,
      },
      {
        key: "botiquines",
        label: "Botiquín",
        cantidad: seccionesOmitidas.botiquines
          ? 0
          : leerBotiquines().length,
      },
      {
        key: "equiposTecnologicos",
        label: "Equipos Tecnológicos",
        cantidad: seccionesOmitidas.equiposTecnologicos
          ? 0
          : leerEquiposTecnologicos().length,
      },
    ];
  }

  function contarItemsInspeccion() {
    return obtenerConteos().reduce(
      (total, seccion) => total + seccion.cantidad,
      0,
    );
  }

  function tieneItemsInspeccion() {
    return contarItemsInspeccion() > 0;
  }

  function obtenerValor(id) {
    return documento.getElementById(id)?.value || "-";
  }

  function asignarTexto(id, valor) {
    const elemento = documento.getElementById(id);

    if (elemento) {
      elemento.textContent = valor || "-";
    }
  }

  function renderizar() {
    asignarTexto("resumen-fecha", obtenerValor("fecha"));
    asignarTexto("resumen-sede", obtenerValor("sedeOperacion"));
    asignarTexto("resumen-area", obtenerValor("areaTrabajo"));
    asignarTexto("resumen-jefe", obtenerValor("jefeResponsable"));
    asignarTexto("resumen-cargo-jefe", obtenerValor("cargoJefe"));

    asignarTexto(
      "resumen-responsable",
      obtenerValor("responsableInspeccion"),
    );

    asignarTexto(
      "resumen-cargo-responsable",
      obtenerValor("cargoResponsable"),
    );

    const conteos = obtenerConteos();

    const contenedor = documento.getElementById("resumen-secciones");

    if (contenedor) {
      contenedor.innerHTML = conteos
        .map(
          ({ label, cantidad }) => `
            <div class="resumen-seccion-item ${
              cantidad > 0
                ? "resumen-seccion-item--ok"
                : "resumen-seccion-item--no"
            }">
              <span>${label}</span>
              <span>
                ${cantidad > 0 ? `Hecho (${cantidad})` : "No se hizo"}
              </span>
            </div>
          `,
        )
        .join("");
    }

    const tieneItems = conteos.some(
      (seccion) => seccion.cantidad > 0,
    );

    const mensaje = documento.getElementById("msg");
    const botonEnviar = documento.getElementById("btn-onedrive");

    if (mensaje) {
      mensaje.textContent = tieneItems
        ? ""
        : "No puede enviar este informe porque no se ha registrado ningún ítem en la inspección.";
    }

    if (botonEnviar) {
      botonEnviar.disabled = !tieneItems;
    }
  }

  return {
    obtenerConteos,
    contarItemsInspeccion,
    tieneItemsInspeccion,
    renderizar,
  };
}