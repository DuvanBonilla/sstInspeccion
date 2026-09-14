/**
 * Crea el controlador encargado del envío de una inspección SST.
 *
 * @param {Object} dependencias Dependencias del flujo de envío.
 * @returns {{inicializar: Function, enviar: Function}}
 */
export function crearEnvioInspeccionSstController({
  documento,
  obtenerPasoActual,
  validarPaso,
  tieneItemsInspeccion,
  validarContactos = () => true,
  prepararAccionesAprobacion = () => {},
  generarInspeccionId,
  construirFormData,
  enviarInspeccion,
  mostrarModal,
  consola = console,
}) {
  async function enviar() {
    if (!validarPaso(obtenerPasoActual())) {
      return;
    }

    if (!tieneItemsInspeccion()) {
      const mensaje = documento.getElementById("msg");

      if (mensaje) {
        mensaje.textContent =
          "No puede enviar este informe porque no se ha registrado ningún ítem en la inspección.";
      }

      return;
    }
    
    if (!validarContactos()) {
      return;
    }

    const botonEnviar = documento.getElementById("btn-onedrive");

    if (!botonEnviar) {
      return;
    }

    botonEnviar.disabled = true;

    mostrarModal("cargando");

    try {
      const inspeccionId = generarInspeccionId();

      const formData = await construirFormData(inspeccionId);

      const resultado = await enviarInspeccion(formData);

      const numInspeccion = resultado.numInspeccion ?? null;

      prepararAccionesAprobacion({
        links: resultado.links,
        inspeccionId,
        numInspeccion,
      });

      mostrarModal("exito", inspeccionId, numInspeccion, resultado.links);
    } catch (error) {
      consola.error("[SST] Error enviando inspección:", error);

      const mensajeError = documento.getElementById("envio-error-texto");

      if (mensajeError) {
        mensajeError.textContent =
          error?.message || "No fue posible completar el envío.";
      }

      mostrarModal("error");

      botonEnviar.disabled = false;
    }
  }

  function inicializar() {
    const botonEnviar = documento.getElementById("btn-onedrive");

    botonEnviar?.addEventListener("click", enviar);
  }

  return {
    inicializar,
    enviar,
  };
}