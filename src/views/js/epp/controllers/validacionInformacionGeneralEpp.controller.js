const CAMPOS_INFORMACION_GENERAL = [
  "fecha",
  "sedeOperacion",
  "areaTrabajo",
  "jefeResponsable",
  "cargoJefe",
  "responsableInspeccion",
  "cargoResponsable",
];

/**
 * Crea el controlador de validación visual de información general.
 *
 * @param {Object} dependencias Dependencias del controlador.
 * @param {Document} [dependencias.documento=document] Documento actual.
 * @param {Array<string>} [dependencias.campos] Identificadores requeridos.
 * @returns {Object} API del controlador.
 */
export function crearValidacionInformacionGeneralEpp({
  documento = document,
  campos = CAMPOS_INFORMACION_GENERAL,
} = {}) {
  function validar() {
    let valido = true;
    let primerCampoInvalido = null;

    campos.forEach((id) => {
      const campo =
        documento.getElementById(id);

      if (!campo) {
        return;
      }

      const valor = campo.value.trim();

      if (!valor) {
        valido = false;

        campo.classList.add("campo-error");

        if (!primerCampoInvalido) {
          primerCampoInvalido = campo;
        }
      } else {
        campo.classList.remove(
          "campo-error",
        );
      }
    });

    if (primerCampoInvalido) {
      primerCampoInvalido.focus();
    }

    return valido;
  }

  function actualizarBotonSiguiente() {
    const botonSiguiente =
      documento.querySelector(
        '[data-step-panel="1"] [data-step-target="2"]',
      );

    if (!botonSiguiente) {
      return;
    }

    const camposCompletos = campos.every(
      (id) => {
        const campo =
          documento.getElementById(id);

        if (!campo || campo.disabled) {
          return true;
        }

        return (
          String(campo.value || "").trim() !==
          ""
        );
      },
    );

    botonSiguiente.disabled =
      !camposCompletos;
  }

  function inicializar() {
    campos.forEach((id) => {
      const campo =
        documento.getElementById(id);

      if (!campo) {
        return;
      }

      const actualizarCampo = () => {
        if (campo.value.trim()) {
          campo.classList.remove(
            "campo-error",
          );
        }

        actualizarBotonSiguiente();
      };

      campo.addEventListener(
        "input",
        actualizarCampo,
      );

      campo.addEventListener(
        "change",
        actualizarCampo,
      );
    });

    actualizarBotonSiguiente();
  }

  return {
    inicializar,
    validar,
    actualizarBotonSiguiente,
  };
}