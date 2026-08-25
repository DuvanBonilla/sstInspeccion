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

async function obtenerSenalizacionesSstAprobadas() {
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

      s.tipo,
      s.ubicacion,
      s.cantidad,
      s.estado,
      s.aseo,
      s.observaciones,
      s.evidencia_archivo

    FROM inspecciones i

    INNER JOIN senalizaciones s
      ON s.inspecciones_id = i.inspecciones_id

    WHERE i.tipo_inspeccion = $1
      AND i.estado = $2

    ORDER BY
      i.inspecciones_id,
      s.idx
  `;

  const { rows } = await query(sql, [
    "SST",
    "enviada",
  ]);

  return rows;
}

async function obtenerEquiposTecnologicosSstAprobados() {
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
      e.equipo_tecnologico,
      e.ubicacion,
      e.cantidad,
      e.estado,
      e.mantenimiento,
      e.observaciones,
      e.afectacion_servicio,
      e.evidencia_archivo
    FROM inspecciones i
    INNER JOIN equipos_tecnologicos e
      ON e.inspecciones_id = i.inspecciones_id
    WHERE i.tipo_inspeccion = $1
      AND i.estado = $2
    ORDER BY
      i.inspecciones_id,
      e.idx
  `;

  const { rows } = await query(sql, ["SST", "enviada"]);

  return rows;
}

async function obtenerBotiquinItemsSstAprobados() {
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

      b.numero AS numero_botiquin,
      b.evidencia_archivo,
      b.evidencia_ruta,

      bi.no AS numero_item,
      bi.item,
      bi.cantidad_ideal,
      bi.cantidad_real,
      bi.integridad_empaque,
      bi.fecha_vencimiento,
      bi.plan_intervencion,
      bi.fecha_intervencion,
      bi.cumplimiento,
      bi.observaciones,
      bi.afectacion_servicio

    FROM inspecciones i

    INNER JOIN botiquines b
      ON b.inspecciones_id = i.inspecciones_id

    INNER JOIN botiquin_items bi
      ON bi.botiquin_id = b.id

    WHERE i.tipo_inspeccion = $1
      AND i.estado = $2

    ORDER BY
      i.inspecciones_id,
      b.idx,
      bi.idx
  `;

  const { rows } = await query(sql, ["SST", "enviada"]);

  return rows;
}
    
module.exports = {
  obtenerExtintoresSstAprobados,
  obtenerCamillasSstAprobadas,
  obtenerSenalizacionesSstAprobadas,
  obtenerEquiposTecnologicosSstAprobados,
  obtenerBotiquinItemsSstAprobados,
};