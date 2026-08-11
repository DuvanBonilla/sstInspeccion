/*
  inspeccionEpp.model.js

  Modelo principal para las inspecciones de Elementos de Protección Personal.

  Responsabilidades:
  - Normalizar y validar la información recibida desde el frontend EPP.
  - Guardar la cabecera de la inspección en `inspecciones`.
  - Guardar los trabajadores en `trabajadores_epp`.
  - Guardar las evaluaciones de cada trabajador en `evaluaciones_epp`.
  - Ejecutar todo el guardado dentro de una transacción.
*/

const { pool } = require("../db/pool");

/* =========================================================
   UTILIDADES
========================================================= */

function normalizarTexto(valor) {
  if (typeof valor !== "string") {
    return "";
  }

  return valor.trim();
}

/* =========================================================
   VALIDACIÓN
========================================================= */

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

    return {
      trabajadorId: trabajador?.trabajadorId ?? null,

      idx: index,

      nombre,

      codigo,

      cargo,

      planAccion,

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

/* =========================================================
   GUARDADO EN BASE DE DATOS
========================================================= */

async function guardarInspeccionEppEnDB(data) {
  const general = data?.general || {};

  const trabajadores = Array.isArray(data?.trabajadores)
    ? data.trabajadores
    : [];

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    /* -------------------------------------------------------
       INSPECCIÓN
    ------------------------------------------------------- */

    const { rows } = await client.query(
      `
      INSERT INTO inspecciones (
        inspeccion_id,
        tipo_inspeccion,
        fecha,
        sede_operacion,
        area_trabajo,
        jefe_responsable,
        cargo_jefe,
        responsable_inspeccion,
        cargo_responsable,
        aprobacion_inspector_nombre,
        aprobacion_inspector_cedula,
        aprobacion_inspector_at
      )
      VALUES (
        $1,
        'EPP',
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        $10,
        now()
      )
      RETURNING
        id,
        num_inspeccion,
        token_inspector,
        token_jefe,
        token_copasst
      `,
      [
        general.inspeccionId || "",
        general.fecha || "",
        general.sedeOperacion || "",
        general.areaTrabajo || "",
        general.jefeResponsable || "",
        general.cargoJefe || "",
        general.responsableInspeccion || "",
        general.cargoResponsable || "",
        general.responsableInspeccion || "",
        "",
      ],
    );

    const inspeccion = rows[0];

    const inspeccionPk = inspeccion.id;

    /* -------------------------------------------------------
       TRABAJADORES
    ------------------------------------------------------- */

    for (const [idx, trabajador] of trabajadores.entries()) {
      const { rows: trabajadorRows } = await client.query(
        `
        INSERT INTO trabajadores_epp (
          inspeccion_pk,
          idx,
          nombre,
          codigo,
          cargo,
          plan_accion,
          observaciones,
          evidencia_ruta,
          evidencia_archivo,
          evidencia_fecha
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10
        )
        RETURNING id
        `,
        [
          inspeccionPk,
          idx,
          trabajador.nombre || "",
          trabajador.codigo || "",
          trabajador.cargo || "",
          trabajador.planAccion || "",
          trabajador.observaciones || "",
          trabajador.evidenciaRuta || "",
          trabajador.evidenciaArchivo || "",
          trabajador.evidenciaFecha || null,
        ],
      );

      const trabajadorEppId = trabajadorRows[0].id;

      /* -----------------------------------------------------
         EVALUACIONES DEL TRABAJADOR
      ----------------------------------------------------- */

      for (const [elementoIdx, elemento] of (
        trabajador.elementos || []
      ).entries()) {
        await client.query(
          `
          INSERT INTO evaluaciones_epp (
            trabajador_epp_id,
            idx,
            elemento,
            condicion,
            uso
          )
          VALUES ($1,$2,$3,$4,$5)
          `,
          [
            trabajadorEppId,
            elementoIdx,
            elemento.elemento || "",
            elemento.condicion || "",
            elemento.uso || "",
          ],
        );
      }
    }

    /* -------------------------------------------------------
       FINALIZAR TRANSACCIÓN
    ------------------------------------------------------- */

    await client.query("COMMIT");

    return {
      inspeccionId: general.inspeccionId || "",

      numInspeccion: Number(inspeccion.num_inspeccion),

      tokens: {
        inspector: inspeccion.token_inspector,

        jefe: inspeccion.token_jefe,

        copasst: inspeccion.token_copasst,
      },
    };
  } catch (error) {
    await client.query("ROLLBACK");

    throw error;
  } finally {
    client.release();
  }
}

/* =========================================================
   EXPORTACIONES
========================================================= */

module.exports = {
  validarInspeccionEpp,
  guardarInspeccionEppEnDB,
};
