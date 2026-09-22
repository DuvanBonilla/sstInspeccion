const MENSAJES = {
  enviado: "Solicitud enviada por correo.",
  fallido:
    "No se pudo enviar el correo. Copie el enlace y compártalo manualmente.",
  manual: "Abra WhatsApp o copie el enlace para compartirlo.",
};

/**
 * Muestra el estado del envío de las solicitudes de aprobación por rol.
 *
 * Crea el aviso visual cuando es necesario y oculta el enlace de correo
 * después de un envío exitoso.
 *
 * @param {Document} documento Documento de la interfaz.
 * @param {Object<string, ("enviado"|"fallido"|"manual")>} [estados={}]
 * Estados de envío indexados por rol.
 * @returns {void}
 */

export function mostrarEstadoEnvioAprobacion(documento, estados = {}) {
  for (const rol of ["jefe", "copasst"]) {
    const bloque = documento.getElementById(`bloque-${rol}`);

    if (!bloque) {
      continue;
    }

    let aviso = bloque.querySelector("[data-estado-envio-aprobacion]");

    if (!aviso) {
      aviso = documento.createElement("p");
      aviso.dataset.estadoEnvioAprobacion = rol;
      aviso.setAttribute("role", "status");
      bloque.appendChild(aviso);
    }
    const estado = estados?.[rol];
    aviso.textContent = MENSAJES[estado] || "";
    aviso.hidden = !aviso.textContent;

    const botonCompartir = documento.getElementById(
      `btn-compartir-aprobacion-${rol}`,
    );

    if (estado === "enviado" && botonCompartir?.dataset.metodo === "correo") {
      botonCompartir.classList.add("hidden");
    }
  }
}
