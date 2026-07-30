/*
  aprobaciones.model.js — Acceso a datos del estado de aprobación de una inspección.

  Qué hace:
  - Cada inspección tiene 3 roles que deben aprobarla: Inspector, Jefe de Área,
    COPASST. No se captura firma manuscrita/biométrica (restricción legal):
    la aprobación de cada rol es nombre completo, con fecha.
  - obtenerContextoAprobacion(): dado un token de link, identifica el rol
    dueño y el estado actual de esa aprobación.
  - guardarAprobacion(): registra la aprobación de un rol (nombre) de
    forma atómica, evitando que un mismo link se use dos veces. Indica si con
    esta aprobación quedaron las 3 completas.
  - marcarInspeccionEnviada(): actualiza el estado final tras archivar el PDF
    y enviar el correo.

  Cómo interactúa:
  - Es el único punto de acceso a las columnas de aprobación en la tabla
    `inspecciones` (Neon). aprobaciones.controller.js NO debe hacer SQL directo;
    siempre pasa por aquí (capa Modelo).
  - inspeccion.model.js maneja los datos de la inspección en sí (general +
    secciones); este archivo maneja solo el estado de aprobación.
*/
const { query } = require("../db/pool");

const ROLES = {
  inspector: { tokenCol: "token_inspector", cedulaCol: "aprobacion_inspector_cedula", nombreCol: "aprobacion_inspector_nombre", atCol: "aprobacion_inspector_at", label: "Inspector" },
  jefe: { tokenCol: "token_jefe", cedulaCol: "aprobacion_jefe_cedula", nombreCol: "aprobacion_jefe_nombre", atCol: "aprobacion_jefe_at", label: "Jefe de Área" },
  copasst: { tokenCol: "token_copasst", cedulaCol: "aprobacion_copasst_cedula", nombreCol: "aprobacion_copasst_nombre", atCol: "aprobacion_copasst_at", label: "COPASST" }
};

// Busca la fila y el rol dueño de un token dado.
async function buscarPorToken(token) {
  const { rows } = await query(
    `SELECT * FROM inspecciones WHERE token_inspector = $1 OR token_jefe = $1 OR token_copasst = $1 LIMIT 1`,
    [token]
  );
  const row = rows[0];
  if (!row) return null;

  const rol = row.token_inspector === token ? "inspector" : row.token_jefe === token ? "jefe" : "copasst";
  return { row, rol };
}

// Contexto de aprobación para un token: qué rol es, si ya aprobó, y la fila completa.
async function obtenerContextoAprobacion(token) {
  const encontrado = await buscarPorToken(token);
  if (!encontrado) return null;

  const { row, rol } = encontrado;
  const cfg = ROLES[rol];

  return {
    rol,
    rolLabel: cfg.label,
    yaAprobado: Boolean(row[cfg.nombreCol]),
    nombreAprobador: row[cfg.nombreCol] || null,
    row
  };
}

// Registra la aprobación de un rol (nombre). Devuelve:
//   { ok: false, motivo: "no_encontrado" | "ya_aprobado" }
//   { ok: true, rol, inspeccionId, completas }
async function guardarAprobacion(token, { nombre }) {
  const encontrado = await buscarPorToken(token);
  if (!encontrado) return { ok: false, motivo: "no_encontrado" };

  const { row, rol } = encontrado;
  const cfg = ROLES[rol];

  if (row[cfg.nombreCol]) return { ok: false, motivo: "ya_aprobado" };

  // WHERE ... AND <col> IS NULL evita que dos requests casi simultáneos aprueben dos veces el mismo rol.
  const { rows, rowCount } = await query(
    `UPDATE inspecciones
     SET ${cfg.nombreCol} = $1, ${cfg.atCol} = now()
     WHERE inspeccion_id = $2 AND ${cfg.nombreCol} IS NULL
     RETURNING *`,
    [String(nombre).trim(), row.inspeccion_id]
  );

  if (rowCount === 0) return { ok: false, motivo: "ya_aprobado" };

  const actualizado = rows[0];
  const completas = Boolean(
    actualizado.aprobacion_inspector_nombre &&
    actualizado.aprobacion_jefe_nombre &&
    actualizado.aprobacion_copasst_nombre
  );

  if (completas && actualizado.estado === "pendiente_aprobacion") {
    await query(`UPDATE inspecciones SET estado = 'aprobada' WHERE inspeccion_id = $1`, [actualizado.inspeccion_id]);
  }

  return { ok: true, rol, inspeccionId: actualizado.inspeccion_id, completas };
}

// Marca la inspección como enviada (PDF archivado + correo enviado) tras las 3 aprobaciones.
async function marcarInspeccionEnviada(inspeccionId, pdfUrl) {
  await query(`UPDATE inspecciones SET estado = 'enviada', pdf_url = $1 WHERE inspeccion_id = $2`, [pdfUrl, inspeccionId]);
}

module.exports = {
  obtenerContextoAprobacion,
  guardarAprobacion,
  marcarInspeccionEnviada
};
