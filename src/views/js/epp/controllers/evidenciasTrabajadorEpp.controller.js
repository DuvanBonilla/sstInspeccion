/**
 * Procesa el cambio de evidencia fotográfica de un trabajador EPP.
 *
 * Valida y optimiza el archivo seleccionado, actualiza el estado visual
 * del campo y almacena la evidencia procesada por trabajador.
 *
 * @param {Event} event Evento generado por el campo de evidencia.
 * @param {Object} dependencias Dependencias del procesamiento.
 * @param {HTMLElement} dependencias.container Contenedor de trabajadores.
 * @param {Map<number, File>} dependencias.evidencias Evidencias procesadas.
 * @param {Function} dependencias.validarEvidenciaEpp Valida el archivo.
 * @param {Function} dependencias.optimizarImagen Optimiza la imagen.
 * @param {Function} dependencias.formatearPesoArchivo Formatea su tamaño.
 * @param {Console} dependencias.logger Registro de información y errores.
 * @returns {Promise<boolean>} Indica si el evento correspondía a evidencia.
 */
export async function manejarCambioEvidencia(
  event,
  {
    container,
    evidencias,
    validarEvidenciaEpp,
    optimizarImagen,
    formatearPesoArchivo,
    logger = console,
  },
) {
  const input = event.target;

  if (
    !input.matches(
      '[data-role="evidencia"]',
    )
  ) {
    return false;
  }

  const tarjeta = input.closest(
    ".trabajador-card",
  );

  if (!tarjeta) {
    return false;
  }

  const trabajadorId = Number(
    tarjeta.dataset.trabajadorId,
  );

  const estado = tarjeta.querySelector(
    '[data-role="evidenciaEstado"]',
  );

  const archivo = input.files?.[0];

  estado?.classList.remove(
    "evidencia-estado--error",
  );

  if (!archivo) {
    evidencias.delete(trabajadorId);

    if (estado) {
      estado.textContent = "Sin evidencia";
    }

    return true;
  }

  const validacion =
    validarEvidenciaEpp(archivo);

  if (!validacion.valido) {
    evidencias.delete(trabajadorId);
    input.value = "";

    if (estado) {
      estado.textContent =
        validacion.mensaje;

      estado.classList.add(
        "evidencia-estado--error",
      );
    }

    return true;
  }

  input.disabled = true;

  if (estado) {
    estado.textContent =
      "Optimizando imagen...";
  }

  try {
    const archivoOptimizado =
      await optimizarImagen(archivo);

    evidencias.set(
      trabajadorId,
      archivoOptimizado,
    );

    if (estado) {
      estado.classList.remove(
        "evidencia-estado--error",
      );

      estado.textContent =
        `Evidencia lista · ${
          formatearPesoArchivo(
            archivoOptimizado.size,
          )
        }`;
    }

    const numeroVisual =
      Array.from(
        container.querySelectorAll(
          ".trabajador-card",
        ),
      ).indexOf(tarjeta) + 1;

    logger.log(
      `Evidencia trabajador ${numeroVisual}:`,
      {
        trabajadorId,
        original: archivo.size,
        optimizado:
          archivoOptimizado.size,
        archivo: archivoOptimizado,
      },
    );
  } catch (error) {
    logger.error(
      "Error procesando evidencia EPP:",
      error,
    );

    evidencias.delete(trabajadorId);
    input.value = "";

    if (estado) {
      estado.textContent =
        "⚠ No fue posible procesar la imagen seleccionada.";

      estado.classList.add(
        "evidencia-estado--error",
      );
    }
  } finally {
    input.disabled = false;
  }

  return true;
}