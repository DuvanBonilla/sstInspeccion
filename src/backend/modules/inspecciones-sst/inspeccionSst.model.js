const { query, pool } = require("../../config/database");

/**
 * Guarda una inspección SST completa en la base de datos.
 *
 * Registra la información general y sus secciones de extintores, camillas,
 * señalizaciones, equipos tecnológicos y botiquines. Los elementos de cada
 * botiquín se almacenan relacionados con su registro principal.
 *
 * Todas las operaciones se ejecutan dentro de una transacción. Si alguna
 * consulta falla, revierte los cambios realizados y libera la conexión.
 * La aprobación del inspector se registra automáticamente.
 *
 * @async
 * @param {Object} data Inspección SST normalizada.
 * @param {Object} data.general Información general de la inspección.
 * @param {Array<Object>} [data.extintores] Extintores inspeccionados.
 * @param {Array<Object>} [data.camillas] Camillas inspeccionadas.
 * @param {Array<Object>} [data.senalizaciones] Señalizaciones inspeccionadas.
 * @param {Array<Object>} [data.equiposTecnologicos] Equipos inspeccionados.
 * @param {Array<Object>} [data.botiquines] Botiquines inspeccionados.
 * @returns {Promise<Object>} Identificador, número consecutivo y tokens de
 * aprobación de la inspección registrada.
 * @throws {Error} Si falla alguna operación de la transacción.
 */

async function guardarInspeccionEnDB(data) {
  const general = data?.general || {};
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // El Inspector es quien diligencia el formulario: su aprobación queda
    // registrada de una vez con los datos de la info general (nombre),
    // sin necesidad de generarle un link aparte como a Jefe de Área y COPASST.
    const { rows } = await client.query(
      `INSERT INTO inspecciones (
        inspeccion_id, fecha, sede_operacion, area_trabajo,
        jefe_responsable, cargo_jefe, responsable_inspeccion, cargo_responsable,
        aprobacion_inspector_nombre, aprobacion_inspector_cedula, aprobacion_inspector_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())
      RETURNING inspecciones_id, token_inspector, token_jefe, token_copasst`,
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
    const pk = inspeccion.inspecciones_id;

    for (const [idx, e] of (data?.extintores || []).entries()) {
      await client.query(
        `INSERT INTO extintores (inspecciones_id, idx, numero, ubicacion, tipo, capacidad, mes_recarga, ano_recarga, observaciones, evidencia_ruta, evidencia_archivo, evidencia_fecha, condiciones)
        
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [
          pk,
          idx,
          e.numero || "",
          e.ubicacion || "",
          e.tipo || "",
          e.capacidad || "",
          e.mesRecarga || "",
          e.anioRecarga || "",
          e.observaciones || "",
          e.evidenciaRuta || "",
          e.evidenciaArchivo || "",
          e.evidenciaFecha || null,
          JSON.stringify(e.condiciones || {}),
        ],
      );
    }

    for (const [idx, c] of (data?.camillas || []).entries()) {
      await client.query(
        `INSERT INTO camillas (inspecciones_id, idx, numero, ubicacion, observaciones, afectacion_productividad, evidencia_ruta, evidencia_archivo, evidencia_fecha, condiciones)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          pk,
          idx,
          c.numero || "",
          c.ubicacion || "",
          c.observaciones || "",
          c.afectacionProductividad || "",
          c.evidenciaRuta || "",
          c.evidenciaArchivo || "",
          c.evidenciaFecha || null,
          JSON.stringify(c.condiciones || {}),
        ],
      );
    }

    for (const [idx, s] of (data?.senalizaciones || []).entries()) {
      await client.query(
        `INSERT INTO senalizaciones (inspecciones_id, idx, tipo, ubicacion, cantidad, estado, aseo, observaciones, evidencia_ruta, evidencia_archivo, evidencia_fecha)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          pk,
          idx,
          s.tipo || "",
          s.ubicacion || "",
          s.cantidad || "",
          s.estado || "",
          s.aseo || "",
          s.observaciones || "",
          s.evidenciaRuta || "",
          s.evidenciaArchivo || "",
          s.evidenciaFecha || null,
        ],
      );
    }

    for (const [idx, eq] of (data?.equiposTecnologicos || []).entries()) {
      await client.query(
        `INSERT INTO equipos_tecnologicos (inspecciones_id, idx, no, equipo_tecnologico, ubicacion, cantidad, estado, mantenimiento, observaciones, afectacion_servicio, evidencia_ruta, evidencia_archivo, evidencia_fecha)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [
          pk,
          idx,
          eq.no || "",
          eq.equipoTecnologico || "",
          eq.ubicacion || "",
          eq.cantidad || "",
          eq.estado || "",
          eq.mantenimiento || "",
          eq.observaciones || "",
          eq.afectacionServicio || "",
          eq.evidenciaRuta || "",
          eq.evidenciaArchivo || "",
          eq.evidenciaFecha || null,
        ],
      );
    }

    for (const [idx, b] of (data?.botiquines || []).entries()) {
      const { rows: botRows } = await client.query(
        `INSERT INTO botiquines (inspecciones_id, idx, numero, ubicacion, observacion_general, evidencia_ruta, evidencia_archivo, evidencia_fecha)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
        [
          pk,
          idx,
          b.numero || "",
          b.ubicacion || "",
          b.observacionGeneral || "",
          b.evidenciaRuta || "",
          b.evidenciaArchivo || "",
          b.evidenciaFecha || null,
        ],
      );
      const botiquinId = botRows[0].id;

      for (const [itemIdx, item] of (b.items || []).entries()) {
        await client.query(
          `INSERT INTO botiquin_items (botiquin_id, idx, no, item, cantidad_ideal, cantidad_real, integridad_empaque, fecha_vencimiento, plan_intervencion, fecha_intervencion, cumplimiento, observaciones, afectacion_servicio)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
          [
            botiquinId,
            itemIdx,
            item.no || "",
            item.item || "",
            item.cantidadIdeal || "",
            item.cantidadReal || "",
            item.integridadEmpaque || "",
            item.fechaVencimiento || "",
            item.planIntervencion || "",
            item.fechaIntervencion || "",
            item.cumplimiento || "",
            item.observaciones || "",
            item.afectacionServicio || "",
          ],
        );
      }
    }

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
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Obtiene los enlaces de aprobación pendientes de una inspección.
 *
 * Consulta los tokens de aprobación y genera únicamente los enlaces del jefe
 * y COPASST que todavía no hayan aprobado. También devuelve el token utilizado
 * para acceder a la vista previa del documento.
 *
 * Los enlaces se construyen utilizando la variable de entorno `APP_URL` o
 * `http://localhost:3000` cuando esta no se encuentra configurada.
 *
 * @async
 * @param {string} inspeccionId Identificador único de la inspección.
 * @returns {Promise<Object|null>} Datos de la inspección, token de vista
 * previa y enlaces pendientes, o `null` si la inspección no existe.
 * @throws {Error} Si falla la consulta a la base de datos.
 */

async function obtenerLinksInspeccion(inspeccionId) {
  const { rows } = await query(
    `SELECT
      inspeccion_id,
      inspecciones_id,

      token_inspector,
      token_jefe,
      token_copasst,

      aprobacion_inspector_nombre,
      aprobacion_jefe_nombre,
      aprobacion_copasst_nombre

     FROM inspecciones
     WHERE inspeccion_id = $1`,
    [inspeccionId],
  );

  if (!rows.length) {
    return null;
  }

  const inspeccion = rows[0];

  const baseUrl = process.env.APP_URL || "http://localhost:3000";

  // Enlaces para compartir
  const links = {};

  // El jefe solo aparece si aún no ha aprobado
  if (!inspeccion.aprobacion_jefe_nombre) {
    links.jefe = `${baseUrl}/aprobar/${inspeccion.token_jefe}`;
  }

  // El COPASST solo aparece si aún no ha aprobado
  if (!inspeccion.aprobacion_copasst_nombre) {
    links.copasst = `${baseUrl}/aprobar/${inspeccion.token_copasst}`;
  }

  return {
    inspeccionId: inspeccion.inspeccion_id,
    numInspeccion: inspeccion.inspecciones_id,

    // Token exclusivo para generar el PDF
    previewToken: inspeccion.token_inspector,

    // Enlaces que se muestran al usuario
    links,
  };
}

// Exporta funciones y constantes para uso en el controlador.
module.exports = {
  guardarInspeccionEnDB,
  obtenerLinksInspeccion,
};
