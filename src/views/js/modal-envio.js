/**
 * Muestra el modal correspondiente al estado de una operación de inspección.
 *
 * Alterna entre los estados de carga, éxito y error. Cuando la operación
 * finaliza correctamente, configura la información de la inspección y los
 * enlaces de aprobación que deben presentarse.
 *
 * @param {"cargando"|"exito"|"error"} estado - Estado que debe mostrar el modal.
 * @param {string|null} [inspeccionId=null] - Identificador público de la inspección.
 * @param {number|string|null} [numInspeccion=null] - Número interno de la inspección.
 * @param {Object|null} enlaces - Enlaces de aprobación recibidos.
 * @param {string} [enlaces.jefe] - Enlace de aprobación correspondiente al jefe.
 * @param {string} [enlaces.copasst] - Enlace de aprobación correspondiente al COPASST.
 * Enlaces de aprobación disponibles.
 * @param {"crear"|"recuperar"} [modo="crear"] - Contexto en el que se abre el modal.
 * @returns {void}
 */

function mostrarModal(
  estado,
  inspeccionId = null,
  numInspeccion = null,
  links = null,
  modo = "crear",
) {
  const modal = document.getElementById("envio-modal");

  const estadoCargando = document.getElementById("envio-estado-cargando");
  const estadoExito = document.getElementById("envio-estado-exito");
  const estadoError = document.getElementById("envio-estado-error");

  if (!estadoCargando || !estadoExito || !estadoError) {
    console.error("Faltan elementos del modal", {
      estadoCargando,
      estadoExito,
      estadoError,
    });
    return;
  }

  estadoCargando.classList.toggle("hidden", estado !== "cargando");
  estadoExito.classList.toggle("hidden", estado !== "exito");
  estadoError.classList.toggle("hidden", estado !== "error");

  if (estado === "exito") {
    configurarModalExito(inspeccionId, numInspeccion, links, modo);
  }

  modal.classList.add("visible");
}

/**
 * Configura el contenido mostrado después de completar una operación.
 *
 * Presenta el identificador y número de la inspección, carga los enlaces
 * disponibles para Jefe de Área y COPASST, y adapta el mensaje y las acciones
 * según se trate de una inspección recién creada o de enlaces recuperados.
 *
 * @param {string|null} inspeccionId - Identificador público de la inspección.
 * @param {number|string|null} numInspeccion - Número interno de la inspección.
 * @param {Object|null} links
 * Enlaces de aprobación recibidos.
 * @param {"crear"|"recuperar"} [modo="crear"] - Contexto de presentación del modal.
 * @returns {void}
 */

function configurarModalExito(
  inspeccionId,
  numInspeccion,
  links,
  modo = "crear",
) {
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

  console.log("Links recibidos en configurarModalExito:", links);

  if (links) {
    const bloqueJefe = document.getElementById("bloque-jefe");
    const bloqueCopasst = document.getElementById("bloque-copasst");

    const inputJefe = document.getElementById("link-jefe");
    const inputCopasst = document.getElementById("link-copasst");

    // JEFE
    if (links.jefe) {
      bloqueJefe.hidden = false;
      inputJefe.value = links.jefe;
      inputJefe.setAttribute("value", links.jefe);
    } else {
      bloqueJefe.hidden = true;
      inputJefe.value = "";
      inputJefe.setAttribute("value", "");
    }

    // COPASST
    if (links.copasst) {
      bloqueCopasst.hidden = false;
      inputCopasst.value = links.copasst;
      inputCopasst.setAttribute("value", links.copasst);
    } else {
      bloqueCopasst.hidden = true;
      inputCopasst.value = "";
      inputCopasst.setAttribute("value", "");
    }
  }

  const titulo = document.querySelector(".exito-titulo");
  const subtitulo = document.querySelector(".exito-sub");

  const btnInicio = document.getElementById("btn-modal-inicio");

  const btnNueva = document.getElementById("btn-modal-nueva");

  console.log({
    titulo,
    subtitulo,
    btnInicio,
    btnNueva,
  });

  if (modo === "crear") {
    titulo.textContent = "¡Inspección guardada!";

    subtitulo.textContent =
      "El Inspector (quien diligenció el formulario) ya quedó aprobado automáticamente. Comparte estos links con Jefe de Área y COPASST para que aprueben. El correo con el PDF se envía automáticamente cuando las 3 aprobaciones estén completas.";

    btnInicio?.classList.remove("hidden");
    btnNueva?.classList.remove("hidden");
  } else if (modo === "recuperar") {
    titulo.textContent = "Enlaces recuperados";

    subtitulo.textContent =
      "Estos son nuevamente los enlaces de aprobación de la inspección. Puedes copiarlos y compartirlos nuevamente.";

    btnInicio?.classList.add("hidden");
    btnNueva?.classList.add("hidden");
  }
}

/**
 * Abre y copia al portapapeles un enlace de aprobación.
 *
 * Obtiene el enlace desde el campo asociado con el botón, lo abre en una
 * nueva pestaña y proporciona una confirmación visual cuando se copia
 * correctamente al portapapeles.
 *
 * @param {HTMLButtonElement} boton - Botón que contiene el identificador
 * del campo desde el cual debe obtenerse el enlace.
 * @returns {void}
 */

function copiarLink(boton) {
  const targetId = boton.getAttribute("data-copy-target");
  const input = document.getElementById(targetId);

  if (!input || !input.value) return;

  // Abrir el enlace en una nueva pestaña
  window.open(input.value, "_blank", "noopener,noreferrer");

  // Copiar al portapapeles
  navigator.clipboard
    .writeText(input.value)
    .then(() => {
      const textoOriginal = boton.textContent;

      boton.textContent = "Abierto ✓";

      boton.classList.add("copiado");

      setTimeout(() => {
        boton.textContent = textoOriginal;
        boton.classList.remove("copiado");
      }, 1500);
    })
    .catch((err) => {
      console.error("No fue posible copiar el enlace:", err);
    });
}

function cerrarModal() {
  document.getElementById("envio-modal").classList.remove("visible");
}

document.querySelectorAll(".envio-link-copy").forEach((btn) => {
  btn.addEventListener("click", () => copiarLink(btn));
});

window.mostrarModal = mostrarModal;
window.cerrarModal = cerrarModal;
window.copiarLink = copiarLink;
