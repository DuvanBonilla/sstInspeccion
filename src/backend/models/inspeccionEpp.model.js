/*
  inspeccionEpp.model.js

  Modelo principal para las inspecciones de Elementos de Protección Personal.

  Responsabilidades:
  - Normalizar y validar la información recibida desde el frontend EPP.
  - Guardar la cabecera de la inspección en `inspecciones`.
  - Guardar los trabajadores en `evaluaciones_epp`.
  - Guardar las evaluaciones de cada trabajador en `detalle_evaluacion_epp`.
  - Ejecutar todo el guardado dentro de una transacción.
*/
const { normalizarTexto } = require("../utils/texto.util");
const { pool } = require("../db/pool");

/* =========================================================
   UTILIDADES
========================================================= */

/* =========================================================
   VALIDACIÓN
========================================================= */

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
        inspecciones_id,
        token_inspector,
        token_jefe,
        token_copasst
      `,
      [
        general.inspeccionId || "", // $1
        general.fecha || null, // $2
        general.sedeOperacion || "", // $3
        general.areaTrabajo || "", // $4
        general.jefeResponsable || "", // $5
        general.cargoJefe || "", // $6
        general.responsableInspeccion || "", // $7
        general.cargoResponsable || "", // $8
        general.responsableInspeccion || "", // $9
        "", // $10
      ],
    );

    const inspeccion = rows[0];

    const inspeccionPk = inspeccion.inspecciones_id;

    /* -------------------------------------------------------
       TRABAJADORES
    ------------------------------------------------------- */

    for (const [idx, trabajador] of trabajadores.entries()) {
      const { rows: trabajadorRows } = await client.query(
        `
        INSERT INTO evaluaciones_epp (
          inspecciones_id,
          idx,
          nombre,
          codigo,
          cargo,
          observaciones,
          evidencia_ruta,
          evidencia_archivo,
          evidencia_fecha
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9
        )
        RETURNING id
        `,
        [
          inspeccionPk, // $1
          idx, // $2
          trabajador.nombre || "", // $3
          trabajador.codigo || "", // $4
          trabajador.cargo || "", // $5
          trabajador.observaciones || "", // $6
          trabajador.evidenciaRuta || "", // $7
          trabajador.evidenciaArchivo || "", // $8
          trabajador.evidenciaFecha || null, // $9
        ],
      );

      const trabajadorEppId = trabajadorRows[0].id;

      /* -----------------------------------------------------
         EVALUACIONES DEL TRABAJADOR
      ----------------------------------------------------- */

      for (const elemento of trabajador.elementos || []) {
        await client.query(
          `
    INSERT INTO detalle_evaluacion_epp (
      evaluacion_epp_id,
      elemento_epp_id,
      condicion,
      uso,
      plan_accion,
      fecha_plan_accion
    )
    VALUES ($1,$2,$3,$4,$5,$6)
    `,
          [
            trabajadorEppId,
            elemento.elementoEppId,
            elemento.condicion || "",
            elemento.uso || "",
            elemento.planAccion || null,
            elemento.fechaPlanAccion || null,
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

      numInspeccion: Number(inspeccion.inspecciones_id),

      tokens: {
        inspector: inspeccion.token_inspector,

        jefe: inspeccion.token_jefe,

        copasst: inspeccion.token_copasst,
      },
    };
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("❌ ERROR GUARDANDO INSPECCIÓN EPP:", {
      mensaje: error.message,
      inspeccionId: general.inspeccionId,
    });

    throw error;
  } finally {
    client.release();
  }
}

/* =========================================================
   EXPORTACIONES
========================================================= */

module.exports = {
  guardarInspeccionEppEnDB,
};
