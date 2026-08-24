const { query } = require("../db/pool");

async function obtenerExtintoresSstAprobados() {
  const sql = `
    SELECT
      i.inspeccion_id,
      i.inspecciones_id,
      i.fecha,
      i.sede_operacion,
      i.area_trabajo,
      i.jefe_responsable,
      i.cargo_jefe,
      i.responsable_inspeccion,
      i.cargo_responsable,

      e.numero,
      e.ubicacion,
      e.tipo,
      e.capacidad,
      e.mes_recarga,
      e.ano_recarga,
      e.observaciones,
      e.evidencia_archivo,
      e.condiciones

    FROM inspecciones i

    INNER JOIN extintores e
      ON e.inspecciones_id = i.inspecciones_id

    WHERE i.tipo_inspeccion = $1
      AND i.estado = $2

    ORDER BY
      i.inspecciones_id,
      e.idx
  `;

  const { rows } = await query(sql, [
    "SST",
    "enviada",
  ]);

  return rows;
}

async function obtenerCamillasSstAprobadas() {
  const sql = `
    SELECT
      i.inspeccion_id,
      i.inspecciones_id,
      i.fecha,
      i.sede_operacion,
      i.area_trabajo,
      i.jefe_responsable,
      i.cargo_jefe,
      i.responsable_inspeccion,
      i.cargo_responsable,

      c.numero,
      c.ubicacion,
      c.observaciones,
      c.afectacion_productividad,
      c.evidencia_archivo,
      c.condiciones

    FROM inspecciones i

    INNER JOIN camillas c
      ON c.inspecciones_id = i.inspecciones_id

    WHERE i.tipo_inspeccion = $1
      AND i.estado = $2

    ORDER BY
      i.inspecciones_id,
      c.idx
  `;

  const { rows } = await query(sql, [
    "SST",
    "enviada",
  ]);

  return rows;
}
    
module.exports = {
  obtenerExtintoresSstAprobados,
  obtenerCamillasSstAprobadas,
};