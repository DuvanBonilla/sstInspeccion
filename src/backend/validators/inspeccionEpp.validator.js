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

    const planAccion = normalizarTexto(trabajador?.planAccion);

    const fechaPlanAccion = normalizarTexto(trabajador?.fechaPlanAccion);

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
       EVALUACIONES
    ------------------------------------------------------- */

    if (elementosEntrada.length !== 11) {
      errores.push(
        `Trabajador ${numeroTrabajador}: debe contener 11 evaluaciones EPP`,
      );
    }

    const elementos = elementosEntrada.map((elemento, elementoIndex) => {
      const nombreElemento = normalizarTexto(
        elemento?.elemento || elemento?.nombre,
      );

      const condicion = normalizarTexto(elemento?.condicion).toUpperCase();

      const uso = normalizarTexto(elemento?.uso).toUpperCase();

      const valoresPermitidos = ["M", "R", "B", "NA"];

      if (!nombreElemento) {
        errores.push(
          `Trabajador ${numeroTrabajador}, elemento ${elementoIndex + 1}: nombre inválido`,
        );
      }

      if (!valoresPermitidos.includes(condicion)) {
        errores.push(
          `Trabajador ${numeroTrabajador}, ${nombreElemento || `elemento ${elementoIndex + 1}`}: condición inválida`,
        );
      }

      if (!valoresPermitidos.includes(uso)) {
        errores.push(
          `Trabajador ${numeroTrabajador}, ${nombreElemento || `elemento ${elementoIndex + 1}`}: uso inválido`,
        );
      }

      return {
        idx: elementoIndex,
        elemento: nombreElemento,
        condicion,
        uso,
      };
    });

    /* -------------------------------------------------------
       PLAN DE ACCIÓN
    ------------------------------------------------------- */

    const tieneNovedad = elementos.some(
      (elemento) =>
        elemento.condicion === "M" ||
        elemento.condicion === "R" ||
        elemento.uso === "M" ||
        elemento.uso === "R",
    );

    if (tieneNovedad && !planAccion) {
      errores.push(
        `Trabajador ${numeroTrabajador}: debe registrar un plan de acción`,
      );
    }

    if (tieneNovedad && !fechaPlanAccion) {
      errores.push(
        `Trabajador ${numeroTrabajador}: debe registrar la fecha límite del plan de acción`,
      );
    }

    return {
      trabajadorId: trabajador?.trabajadorId ?? null,

      idx: index,

      nombre,

      codigo,

      cargo,

      planAccion,

      fechaPlanAccion,

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
}