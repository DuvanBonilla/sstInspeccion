/*
  inspeccionCompleta.model.js — Lectura de una inspección completa (SST o EPP).

  Qué hace:
  - obtenerInspeccionCompleta(): devuelve la cabecera de la inspección y sus
    secciones (extintores, camillas, señalizaciones, equipos tecnológicos,
    botiquines o trabajadores EPP con sus evaluaciones).

  Cómo interactúa:
  - Es compartido: lo usan el módulo de aprobaciones (resumen, vista previa y
    cierre) para inspecciones SST y EPP.
  - La consulta se trasladó sin cambios desde models/inspeccion.model.js.
*/
const { query } = require("../../config/database");

/**
 * Recupera una inspección completa desde la base de datos.
 *
 * Obtiene la información general y reconstruye la estructura correspondiente
 * según el tipo de inspección. Para EPP recupera los trabajadores y sus
 * evaluaciones; para SST recupera las cinco secciones y los elementos de
 * cada botiquín.
 *
 * @async
 * @param {string} inspeccionId Identificador único de la inspección.
 * @returns {Promise<Object|null>} Inspección completa con su estructura SST
 * o EPP, o `null` cuando el identificador no existe.
 * @throws {Error} Si falla alguna consulta a la base de datos.
 */

async function obtenerInspeccionCompleta(inspeccionId) {
  const { rows } = await query(
    `SELECT * FROM inspecciones WHERE inspeccion_id = $1`,
    [inspeccionId],
  );

  const inspeccion = rows[0];

  if (!inspeccion) {
    return null;
  }

  const pk = inspeccion.inspecciones_id;

  /* =====================================================
     INSPECCIÓN EPP
  ===================================================== */

  if (inspeccion.tipo_inspeccion === "EPP") {
    const { rows: trabajadoresRows } = await query(
      `
    SELECT *
    FROM evaluaciones_epp
    WHERE inspecciones_id = $1
    ORDER BY idx
    `,
      [pk],
    );

    const trabajadores = await Promise.all(
      trabajadoresRows.map(async (trabajador) => {
        const { rows: evaluacionesRows } = await query(
          `
        SELECT
          ee.id,
          ee.evaluacion_epp_id,
          ee.elemento_epp_id,
          e.nombre AS elemento,
          e.categoria AS categoria,
          ee.condicion,
          ee.uso,
          ee.plan_accion,
          ee.fecha_plan_accion
        FROM detalle_evaluacion_epp ee
        INNER JOIN elementos_epp e
          ON e.id = ee.elemento_epp_id
        WHERE ee.evaluacion_epp_id = $1
        `,
          [trabajador.id],
        );

        return {
          id: trabajador.id,
          idx: trabajador.idx,

          nombre: trabajador.nombre || "",
          codigo: trabajador.codigo || "",
          cargo: trabajador.cargo || "",

          observaciones: trabajador.observaciones || "",

          evidenciaRuta: trabajador.evidencia_ruta || "",
          evidenciaArchivo: trabajador.evidencia_archivo || "",
          evidenciaFecha: trabajador.evidencia_fecha || null,

          elementos: evaluacionesRows.map((evaluacion) => ({
            elementoEppId: evaluacion.elemento_epp_id,

            elemento: evaluacion.elemento || "",

            categoria: evaluacion.categoria || "",

            condicion: evaluacion.condicion || "",

            uso: evaluacion.uso || "",

            planAccion: evaluacion.plan_accion || "",

            fechaPlanAccion: evaluacion.fecha_plan_accion || null,
          })),
        };
      }),
    );

    return {
      inspeccion,
      tipoInspeccion: "EPP",
      trabajadores,
    };
  }

  /* =====================================================
     INSPECCIÓN SST
     Se mantiene el comportamiento actual
  ===================================================== */

  const [extRes, camRes, senRes, eqpRes, botRes] = await Promise.all([
    query(
      `SELECT * FROM extintores
         WHERE inspecciones_id = $1
         ORDER BY idx`,
      [pk],
    ),

    query(
      `SELECT * FROM camillas
         WHERE inspecciones_id = $1
         ORDER BY idx`,
      [pk],
    ),

    query(
      `SELECT * FROM senalizaciones
         WHERE inspecciones_id = $1
         ORDER BY idx`,
      [pk],
    ),

    query(
      `SELECT * FROM equipos_tecnologicos
         WHERE inspecciones_id = $1
         ORDER BY idx`,
      [pk],
    ),

    query(
      `SELECT * FROM botiquines
         WHERE inspecciones_id = $1
         ORDER BY idx`,
      [pk],
    ),
  ]);

  const botiquines = await Promise.all(
    botRes.rows.map(async (b) => {
      const { rows: items } = await query(
        `
        SELECT *
        FROM botiquin_items
        WHERE botiquin_id = $1
        ORDER BY idx
        `,
        [b.id],
      );

      return {
        numero: b.numero || "",
        ubicacion: b.ubicacion || "",
        observacionGeneral: b.observacion_general || "",
        evidenciaRuta: b.evidencia_ruta || "",
        evidenciaArchivo: b.evidencia_archivo || "",
        evidenciaFecha: b.evidencia_fecha || null,

        items: items.map((it) => ({
          no: it.no || "",
          item: it.item || "",
          cantidadIdeal: it.cantidad_ideal || "",
          cantidadReal: it.cantidad_real || "",
          integridadEmpaque: it.integridad_empaque || "",
          fechaVencimiento: it.fecha_vencimiento || "",
          planIntervencion: it.plan_intervencion || "",
          fechaIntervencion: it.fecha_intervencion || "",
          cumplimiento: it.cumplimiento || "",
          observaciones: it.observaciones || "",
          afectacionServicio: it.afectacion_servicio || "",
        })),
      };
    }),
  );

  return {
    inspeccion,

    tipoInspeccion: "SST",

    extintores: extRes.rows.map((e) => ({
      numero: e.numero || "",
      ubicacion: e.ubicacion || "",
      tipo: e.tipo || "",
      capacidad: e.capacidad || "",
      mesRecarga: e.mes_recarga || "",
      anioRecarga: e.ano_recarga || "",
      observaciones: e.observaciones || "",
      evidenciaRuta: e.evidencia_ruta || "",
      evidenciaArchivo: e.evidencia_archivo || "",
      evidenciaFecha: e.evidencia_fecha || null,
      condiciones: e.condiciones || {},
    })),

    camillas: camRes.rows.map((c) => ({
      numero: c.numero || "",
      ubicacion: c.ubicacion || "",
      observaciones: c.observaciones || "",
      afectacionProductividad: c.afectacion_productividad || "",
      evidenciaRuta: c.evidencia_ruta || "",
      evidenciaArchivo: c.evidencia_archivo || "",
      evidenciaFecha: c.evidencia_fecha || null,
      condiciones: c.condiciones || {},
    })),

    senalizaciones: senRes.rows.map((s) => ({
      tipo: s.tipo || "",
      ubicacion: s.ubicacion || "",
      cantidad: s.cantidad || "",
      estado: s.estado || "",
      aseo: s.aseo || "",
      observaciones: s.observaciones || "",
      evidenciaRuta: s.evidencia_ruta || "",
      evidenciaArchivo: s.evidencia_archivo || "",
      evidenciaFecha: s.evidencia_fecha || null,
    })),

    equiposTecnologicos: eqpRes.rows.map((eq) => ({
      no: eq.no || "",
      equipoTecnologico: eq.equipo_tecnologico || "",
      ubicacion: eq.ubicacion || "",
      cantidad: eq.cantidad || "",
      estado: eq.estado || "",
      mantenimiento: eq.mantenimiento || "",
      observaciones: eq.observaciones || "",
      afectacionServicio: eq.afectacion_servicio || "",
      evidenciaRuta: eq.evidencia_ruta || "",
      evidenciaArchivo: eq.evidencia_archivo || "",
      evidenciaFecha: eq.evidencia_fecha || null,
    })),

    botiquines,
  };
}

module.exports = {
  obtenerInspeccionCompleta,
};
