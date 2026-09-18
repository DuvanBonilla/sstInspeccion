import { requierePlanAccion } from "../reglasEpp.js";

function crearError({
  mensaje,
  campo,
  trabajadorIndex = null,
  elementoIndex = null,
}) {
  return {
    valido: false,
    mensaje,
    campo,
    trabajadorIndex,
    elementoIndex,
  };
}

/**
 * Valida los datos estructurados de los trabajadores EPP.
 *
 * No modifica elementos del DOM ni muestra mensajes en la interfaz.
 *
 * @param {Object} opciones Datos requeridos para la validación.
 * @param {Array<Object>} opciones.trabajadores Trabajadores que deben validarse.
 * @param {Map|Set} opciones.evidencias Evidencias asociadas por trabajador.
 * @param {string} opciones.fechaInspeccion Fecha de la inspección.
 * @returns {Object} Resultado de la validación.
 */
export function validarTrabajadoresEpp({
  trabajadores = [],
  evidencias = new Set(),
  fechaInspeccion = "",
} = {}) {
  if (!Array.isArray(trabajadores) || trabajadores.length === 0) {
    return crearError({
      campo: "cantidad",
      mensaje: "Debe generar al menos un trabajador.",
    });
  }

  const codigosRegistrados = new Set();

  for (
    let trabajadorIndex = 0;
    trabajadorIndex < trabajadores.length;
    trabajadorIndex++
  ) {
    const trabajador = trabajadores[trabajadorIndex];
    const numeroTrabajador = trabajadorIndex + 1;

    const nombre = String(trabajador?.nombre || "").trim();
    const codigo = String(trabajador?.codigo || "").trim();
    const cargo = String(trabajador?.cargo || "").trim();

    if (!nombre) {
      return crearError({
        trabajadorIndex,
        campo: "nombre",
        mensaje:
          `Trabajador ${numeroTrabajador}: ingrese el nombre y apellido.`,
      });
    }

    if (nombre.length < 5) {
      return crearError({
        trabajadorIndex,
        campo: "nombre",
        mensaje:
          `Trabajador ${numeroTrabajador}: el nombre y apellido debe contener al menos 5 caracteres.`,
      });
    }

    if (!/^[A-Za-zÁÉÍÓÚáéíóúÜüÑñ' -]+$/.test(nombre)) {
      return crearError({
        trabajadorIndex,
        campo: "nombre",
        mensaje:
          `Trabajador ${numeroTrabajador}: el nombre y apellido no puede contener números ni caracteres especiales.`,
      });
    }

    const partesNombre = nombre.split(/\s+/).filter(Boolean);

    if (partesNombre.length < 2) {
      return crearError({
        trabajadorIndex,
        campo: "nombre",
        mensaje:
          `Trabajador ${numeroTrabajador}: registre al menos el nombre y un apellido.`,
      });
    }

    if (!codigo) {
      return crearError({
        trabajadorIndex,
        campo: "codigo",
        mensaje:
          `Trabajador ${numeroTrabajador}: ingrese el código.`,
      });
    }

    if (!/^\d{1,6}$/.test(codigo)) {
      return crearError({
        trabajadorIndex,
        campo: "codigo",
        mensaje:
          `Trabajador ${numeroTrabajador}: el código debe contener únicamente números y tener máximo 6 dígitos.`,
      });
    }

    if (Number(codigo) < 1) {
      return crearError({
        trabajadorIndex,
        campo: "codigo",
        mensaje:
          `Trabajador ${numeroTrabajador}: el código debe estar entre 000001 y 999999.`,
      });
    }

    if (codigosRegistrados.has(codigo)) {
      return crearError({
        trabajadorIndex,
        campo: "codigo",
        mensaje:
          `Trabajador ${numeroTrabajador}: el código "${codigo}" ya fue registrado en otro trabajador.`,
      });
    }

    codigosRegistrados.add(codigo);

    if (!cargo) {
      return crearError({
        trabajadorIndex,
        campo: "cargo",
        mensaje:
          `Trabajador ${numeroTrabajador}: ingrese la labor o cargo.`,
      });
    }

    const elementos = Array.isArray(trabajador?.elementos)
      ? trabajador.elementos
      : [];

    if (elementos.length === 0) {
      return crearError({
        trabajadorIndex,
        campo: "elementos",
        mensaje:
          `Trabajador ${numeroTrabajador}: debe tener al menos un elemento EPP.`,
      });
    }

    for (
      let elementoIndex = 0;
      elementoIndex < elementos.length;
      elementoIndex++
    ) {
      const elemento = elementos[elementoIndex];

      const nombreElemento =
        elemento?.elemento || `Elemento ${elementoIndex + 1}`;

      const condicion = elemento?.condicion || "";
      const uso = elemento?.uso || "";

      if (!condicion) {
        return crearError({
          trabajadorIndex,
          elementoIndex,
          campo: "condicion",
          mensaje:
            `Trabajador ${numeroTrabajador}: seleccione la condición de "${nombreElemento}".`,
        });
      }

      if (!uso) {
        return crearError({
          trabajadorIndex,
          elementoIndex,
          campo: "uso",
          mensaje:
            `Trabajador ${numeroTrabajador}: seleccione el uso de "${nombreElemento}".`,
        });
      }

      if (requierePlanAccion(condicion, uso)) {
        const planAccion = String(
          elemento?.planAccion || "",
        ).trim();

        const fechaPlanAccion =
          elemento?.fechaPlanAccion || "";

        if (!planAccion) {
          return crearError({
            trabajadorIndex,
            elementoIndex,
            campo: "planAccion",
            mensaje:
              `Trabajador ${numeroTrabajador}: registre el plan de acción para "${nombreElemento}".`,
          });
        }

        if (!fechaPlanAccion) {
          return crearError({
            trabajadorIndex,
            elementoIndex,
            campo: "fechaPlanAccion",
            mensaje:
              `Trabajador ${numeroTrabajador}: registre la fecha límite del plan de acción para "${nombreElemento}".`,
          });
        }

        if (
          fechaInspeccion &&
          fechaPlanAccion < fechaInspeccion
        ) {
          return crearError({
            trabajadorIndex,
            elementoIndex,
            campo: "fechaPlanAccion",
            mensaje:
              `Trabajador ${numeroTrabajador}: la fecha límite del plan de acción para "${nombreElemento}" no puede ser anterior a la fecha de la inspección.`,
          });
        }
      }
    }

    if (!evidencias?.has?.(trabajador.trabajadorId)) {
      return crearError({
        trabajadorIndex,
        campo: "evidencia",
        mensaje:
          `Trabajador ${numeroTrabajador}: registre la evidencia fotográfica de constancia del operario.`,
      });
    }
  }

  return {
    valido: true,
    mensaje: "",
    campo: null,
    trabajadorIndex: null,
    elementoIndex: null,
  };
}