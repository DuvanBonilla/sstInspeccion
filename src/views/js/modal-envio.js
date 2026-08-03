function mostrarModal(estado, inspeccionId = null, numInspeccion = null, links = null, modo = "crear") {
  const modal = document.getElementById("envio-modal");


const estadoCargando = document.getElementById("envio-estado-cargando");
const estadoExito = document.getElementById("envio-estado-exito");
const estadoError = document.getElementById("envio-estado-error");

if (!estadoCargando || !estadoExito || !estadoError) {
  console.error("Faltan elementos del modal", {
    estadoCargando,
    estadoExito,
    estadoError
  });
  return;
}

estadoCargando.classList.toggle("hidden", estado !== "cargando");
estadoExito.classList.toggle("hidden", estado !== "exito");
estadoError.classList.toggle("hidden", estado !== "error");

  if (estado === "exito") {

    configurarModalExito(
      inspeccionId,
      numInspeccion,
      links,
      modo
    );

  }

  modal.classList.add("visible");
}

function configurarModalExito(inspeccionId, numInspeccion, links, modo = "crear") {
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

  if (links) {
    const inputJefe = document.getElementById("link-jefe");
    const inputCopasst = document.getElementById("link-copasst");

    if (inputJefe) inputJefe.value = links.jefe || "";
    if (inputCopasst) inputCopasst.value = links.copasst || "";
  }

  const titulo = document.querySelector(".exito-titulo");
  const subtitulo = document.querySelector(".exito-sub");

  const btnInicio = document.getElementById("btn-modal-inicio");
  const btnNueva = document.getElementById("btn-modal-nueva");

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

// Copia el valor de un input de link al portapapeles y da feedback visual en el botón.
function copiarLink(boton) {
  const targetId = boton.getAttribute("data-copy-target");
  const input = document.getElementById(targetId);
  if (!input || !input.value) return;

  navigator.clipboard.writeText(input.value).then(() => {
    const textoOriginal = boton.textContent;
    boton.textContent = "Copiado";
    boton.classList.add("copiado");
    setTimeout(() => {
      boton.textContent = textoOriginal;
      boton.classList.remove("copiado");
    }, 1500);
  });
}

function cerrarModal() {
  document.getElementById("envio-modal").classList.remove("visible");
}

window.mostrarModal = mostrarModal;
window.cerrarModal = cerrarModal;
window.copiarLink = copiarLink;