/**
 * Construye los enlaces de aprobación de una inspección EPP.
 *
 * @param {Object|null} tokens Tokens entregados por el backend.
 * @param {string} baseUrl Origen de la aplicación.
 * @returns {{jefe: string|null, copasst: string|null}|null}
 */
export function construirLinksAprobacionEpp(
  tokens,
  baseUrl,
) {
  if (!tokens) {
    return null;
  }

  return {
    jefe: tokens.jefe
      ? `${baseUrl}/aprobar/${tokens.jefe}`
      : null,

    copasst: tokens.copasst
      ? `${baseUrl}/aprobar/${tokens.copasst}`
      : null,
  };
}

/**
 * Inicializa el flujo visual de envío de una inspección EPP.
 *
 * Controla el botón de envío y los modales mostrados durante el proceso,
 * delegando la operación de envío a la función recibida.
 *
 * @param {Object} dependencias Dependencias del controlador.
 * @param {Document} [dependencias.documento=document] Documento actual.
 * @param {Window} [dependencias.ventana=window] Ventana actual.
 * @param {Function} dependencias.enviarInspeccionEpp Operación de envío.
 * @param {Function} [dependencias.registrarError=console.error] Registro de errores.
 * @returns {void}
 */
export function inicializarEnvioEpp({
  documento = document,
  ventana = window,
  enviarInspeccionEpp,
  registrarError = console.error,
} = {}) {
  const btnEnviar = documento.getElementById(
    "btn-enviar-inspeccion-epp",
  );

  if (!btnEnviar) {
    return;
  }

  btnEnviar.addEventListener(
    "click",
    async () => {
      try {
        btnEnviar.disabled = true;
        btnEnviar.textContent = "Enviando...";

        if (
          typeof ventana.mostrarModal ===
          "function"
        ) {
          ventana.mostrarModal("cargando");
        }

        const resultado =
          await enviarInspeccionEpp();

        const links =
          construirLinksAprobacionEpp(
            resultado.tokens,
            ventana.location.origin,
          );

        if (
          typeof ventana.mostrarModal ===
          "function"
        ) {
          ventana.mostrarModal(
            "exito",
            resultado.inspeccionId,
            resultado.numInspeccion,
            links,
            "crear",
          );
        }

        btnEnviar.textContent =
          "Inspección enviada";
      } catch (error) {
        registrarError(
          "❌ No fue posible completar el envío EPP:",
          error,
        );

        if (
          typeof ventana.mostrarModal ===
          "function"
        ) {
          ventana.mostrarModal("error");
        }

        btnEnviar.disabled = false;
        btnEnviar.textContent =
          "Enviar inspección";
      }
    },
  );
}