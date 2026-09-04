const { normalizarTexto } = require("../utils/texto.util");

const TIPOS_IMAGEN_PERMITIDOS = new Set([
  "image/jpeg",
  "image/png",
]);

const TAMANO_MAXIMO_EVIDENCIA = 10 * 1024 * 1024; // 10 MB

/**
 * Valida la evidencia fotográfica asociada a un trabajador.
 *
 * Comprueba que el archivo exista, contenga información, corresponda a una
 * imagen JPG o PNG y no supere el tamaño máximo permitido de 10 MB.
 *
 * @param {Object} file Archivo recibido mediante Multer.
 * @param {Buffer} file.buffer Contenido binario del archivo.
 * @param {string} file.mimetype Tipo MIME del archivo.
 * @param {number} file.size Tamaño del archivo en bytes.
 * @param {number} numeroTrabajador Número utilizado para identificar al
 * trabajador dentro de los mensajes de validación.
 * @returns {Object} Resultado de la validación. Si el archivo es válido,
 * devuelve `ok: true` y el archivo en `data`; de lo contrario, devuelve
 * `ok: false` y la lista `errores`.
 */

function validarEvidenciaTrabajador(file, numeroTrabajador) {
  const errores = [];

  if (!file) {
    errores.push(
      `Trabajador ${numeroTrabajador}: debe adjuntar una evidencia.`,
    );

    return {
      ok: false,
      errores,
    };
  }

  if (!file.buffer?.length) {
    errores.push(
      `Trabajador ${numeroTrabajador}: la evidencia está vacía.`,
    );
  }

  if (!TIPOS_IMAGEN_PERMITIDOS.has(file.mimetype)) {
    errores.push(
      `Trabajador ${numeroTrabajador}: la evidencia debe ser una imagen JPG o PNG.`,
    );
  }

  if (
    Number.isFinite(file.size) &&
    file.size > TAMANO_MAXIMO_EVIDENCIA
  ) {
    errores.push(
      `Trabajador ${numeroTrabajador}: la evidencia supera el tamaño máximo permitido de 10 MB.`,
    );
  }

  if (errores.length > 0) {
    return {
      ok: false,
      errores,
    };
  }

  return {
    ok: true,
    data: file,
  };
}

/**
 * Normaliza y valida la información de una inspección EPP.
 *
 * Valida la información general, los trabajadores y las evaluaciones de sus
 * elementos de protección personal. Cada trabajador debe tener nombre, código,
 * cargo y al menos una evaluación EPP.
 *
 * Las calificaciones permitidas para condición y uso son `M`, `R`, `B` y
 * `NA`. Cuando alguna evaluación contiene una calificación `M` o `R`, exige
 * un plan de acción y su fecha límite.
 *
 * Esta función valida los datos del formulario, pero no procesa los archivos
 * de evidencia, cuya validación se realiza mediante
 * {@link validarEvidenciaTrabajador}.
 *
 * @param {Object} payload Información recibida desde el formulario EPP.
 * @param {string} [payload.inspeccionId] Identificador de la inspección.
 * @param {Object} [payload.informacionGeneral] Información general.
 * @param {Array<Object>} [payload.trabajadores] Trabajadores inspeccionados.
 * @returns {Object} Resultado de la validación. Si existen errores, devuelve
 * `ok: false` y la lista `errores`; si es válida, devuelve `ok: true` y la
 * inspección normalizada en `data`.
 */

function validarInspeccionEpp(payload) {
  const errores = [];

  const informacionGeneral = payload?.informacionGeneral || {};

  const trabajadoresEntrada = Array.isArray(payload?.trabajadores)
    ? payload.trabajadores
    : [];

  /* ---------------------------------------------------------
     INFORMACIÓN GENERAL
  --------------------------------------------------------- */

  const general = {
    inspeccionId: normalizarTexto(
      payload?.inspeccionId || informacionGeneral.inspeccionId,
    ),

    fecha: normalizarTexto(informacionGeneral.fecha),

    sedeOperacion: normalizarTexto(
      informacionGeneral.sedeOperacion || informacionGeneral.sede,
    ),

    areaTrabajo: normalizarTexto(
      informacionGeneral.areaTrabajo || informacionGeneral.area,
    ),

    jefeResponsable: normalizarTexto(
      informacionGeneral.jefeResponsable || informacionGeneral.jefeArea,
    ),

    cargoJefe: normalizarTexto(informacionGeneral.cargoJefe),

    responsableInspeccion: normalizarTexto(
      informacionGeneral.responsableInspeccion,
    ),

    cargoResponsable: normalizarTexto(informacionGeneral.cargoResponsable),
  };

  if (!general.fecha) {
    errores.push("Fecha de inspección es obligatoria");
  }

  if (!general.sedeOperacion) {
    errores.push("Sede de operación es obligatoria");
  }

  if (!general.areaTrabajo) {
    errores.push("Área de trabajo es obligatoria");
  }

  if (!general.jefeResponsable) {
    errores.push("Nombre del jefe responsable es obligatorio");
  }

  if (!general.cargoJefe) {
    errores.push("Cargo del jefe es obligatorio");
  }

  if (!general.responsableInspeccion) {
    errores.push("Responsable de la inspección es obligatorio");
  }

  if (!general.cargoResponsable) {
    errores.push("Cargo del responsable es obligatorio");
  }

  /* ---------------------------------------------------------
     TRABAJADORES
  --------------------------------------------------------- */

  if (trabajadoresEntrada.length === 0) {
    errores.push("Debe existir al menos un trabajador");
  }

  const trabajadores = trabajadoresEntrada.map((trabajador, index) => {
    const numeroTrabajador = index + 1;

    const nombre = normalizarTexto(trabajador?.nombre);

    const codigo = normalizarTexto(trabajador?.codigo);

    const cargo = normalizarTexto(trabajador?.cargo);

    const observaciones = normalizarTexto(trabajador?.observaciones);

    const elementosEntrada = Array.isArray(trabajador?.elementos)
      ? trabajador.elementos
      : [];

    if (!nombre) {
      errores.push(`Trabajador ${numeroTrabajador}: nombre es obligatorio`);
    }

    if (!codigo) {
      errores.push(`Trabajador ${numeroTrabajador}: código es obligatorio`);
    }

    if (!cargo) {
      errores.push(`Trabajador ${numeroTrabajador}: cargo es obligatorio`);
    }

    /* -------------------------------------------------------
       EVALUACIONES EPP
    ------------------------------------------------------- */

    if (elementosEntrada.length === 0) {
      errores.push(
        `Trabajador ${numeroTrabajador}: debe contener al menos una evaluación EPP`,
      );
    }

    const elementos = elementosEntrada.map((elemento, elementoIndex) => {
      /* ---------------------------------------------------
           IDENTIFICACIÓN DEL ELEMENTO
        --------------------------------------------------- */

      const elementoEppId = Number(elemento?.elementoEppId);

      const nombreElemento = normalizarTexto(
        elemento?.elemento || elemento?.nombre,
      );

      /* ---------------------------------------------------
           CALIFICACIONES
        --------------------------------------------------- */

      const condicion = normalizarTexto(elemento?.condicion).toUpperCase();

      const uso = normalizarTexto(elemento?.uso).toUpperCase();

      const valoresPermitidos = ["M", "R", "B", "NA"];

      /* ---------------------------------------------------
           PLAN DE ACCIÓN DEL ELEMENTO
        --------------------------------------------------- */

      const planAccion = normalizarTexto(elemento?.planAccion);

      const fechaPlanAccion = normalizarTexto(elemento?.fechaPlanAccion);

      /* ---------------------------------------------------
           VALIDAR CATÁLOGO
        --------------------------------------------------- */

      if (!Number.isInteger(elementoEppId) || elementoEppId <= 0) {
        errores.push(
          `Trabajador ${numeroTrabajador}, elemento ${
            elementoIndex + 1
          }: catálogo EPP inválido`,
        );
      }

      /* ---------------------------------------------------
           VALIDAR NOMBRE
        --------------------------------------------------- */

      if (!nombreElemento) {
        errores.push(
          `Trabajador ${numeroTrabajador}, elemento ${
            elementoIndex + 1
          }: nombre inválido`,
        );
      }

      /* ---------------------------------------------------
           VALIDAR CONDICIÓN
        --------------------------------------------------- */

      if (!valoresPermitidos.includes(condicion)) {
        errores.push(
          `Trabajador ${numeroTrabajador}, ${
            nombreElemento || `elemento ${elementoIndex + 1}`
          }: condición inválida`,
        );
      }

      /* ---------------------------------------------------
           VALIDAR USO
        --------------------------------------------------- */

      if (!valoresPermitidos.includes(uso)) {
        errores.push(
          `Trabajador ${numeroTrabajador}, ${
            nombreElemento || `elemento ${elementoIndex + 1}`
          }: uso inválido`,
        );
      }

      /* ---------------------------------------------------
           DETERMINAR SI REQUIERE PLAN DE ACCIÓN

           NO requiere:
           B  + B
           B  + NA
           NA + B
           NA + NA

           Cualquier R o M requiere plan.
        --------------------------------------------------- */

      const requierePlan =
        condicion === "R" || condicion === "M" || uso === "R" || uso === "M";

      /* ---------------------------------------------------
           VALIDAR PLAN DE ACCIÓN
        --------------------------------------------------- */

      if (requierePlan && !planAccion) {
        errores.push(
          `Trabajador ${numeroTrabajador}, ${
            nombreElemento || `elemento ${elementoIndex + 1}`
          }: debe registrar un plan de acción`,
        );
      }

      if (requierePlan && !fechaPlanAccion) {
        errores.push(
          `Trabajador ${numeroTrabajador}, ${
            nombreElemento || `elemento ${elementoIndex + 1}`
          }: debe registrar la fecha límite del plan de acción`,
        );
      }

      /* ---------------------------------------------------
           ELEMENTO NORMALIZADO
        --------------------------------------------------- */

      return {
        idx: elementoIndex,
        elementoEppId,
        elemento: nombreElemento,
        condicion,
        uso,
        planAccion: normalizarTexto(elemento?.planAccion) || null,
        fechaPlanAccion: normalizarTexto(elemento?.fechaPlanAccion) || null,
      };
    });

    /* -------------------------------------------------------
       TRABAJADOR NORMALIZADO
    ------------------------------------------------------- */

    return {
      trabajadorId: trabajador?.trabajadorId ?? null,

      idx: index,

      nombre,

      codigo,

      cargo,

      observaciones,

      elementos,

      evidenciaRuta: normalizarTexto(trabajador?.evidenciaRuta),

      evidenciaArchivo: normalizarTexto(trabajador?.evidenciaArchivo),

      evidenciaFecha: trabajador?.evidenciaFecha || null,
    };
  });

  /* ---------------------------------------------------------
     RESULTADO
  --------------------------------------------------------- */

  if (errores.length > 0) {
    return {
      ok: false,
      errores,
    };
  }

  return {
    ok: true,

    data: {
      general,
      trabajadores,
    },
  };
}



module.exports = {
  validarInspeccionEpp,
  validarEvidenciaTrabajador,
};
