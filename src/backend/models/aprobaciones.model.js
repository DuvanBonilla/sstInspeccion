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
/**
 * Busca una inspección y determina el rol asociado a un token.
 *
 * Compara el token recibido con los tokens del inspector, jefe responsable y
 * COPASST almacenados en la inspección.
 *
 * @async
 * @param {string} token Token único del enlace de aprobación.
 * @returns {Promise<Object|null>} Registro de la inspección y rol propietario
 * del token, o `null` cuando no existe ninguna coincidencia.
 * @throws {Error} Si falla la consulta a la base de datos.
 */

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

/**
 * Obtiene el contexto completo de una aprobación.
 *
 * Identifica el rol relacionado con el token y determina si ese responsable
 * ya aprobó la inspección. También recupera el nombre del aprobador y el
 * registro completo de la inspección.
 *
 * @async
 * @param {string} token Token único del enlace de aprobación.
 * @returns {Promise<Object|null>} Contexto con el rol, nombre visible,
 * estado de aprobación y registro de la inspección, o `null` si el token
 * no existe.
 * @throws {Error} Si falla la consulta a la base de datos.
 */

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

/**
 * Registra la aprobación correspondiente a un token.
 *
 * Identifica el rol propietario del token, comprueba que todavía no haya
 * aprobado y almacena el nombre del aprobador junto con la fecha del registro.
 *
 * La actualización se realiza de forma atómica para impedir que dos solicitudes
 * simultáneas utilicen el mismo enlace. Cuando las tres aprobaciones quedan
 * completas, cambia el estado de la inspección a `aprobada`.
 *
 * @async
 * @param {string} token Token único del enlace de aprobación.
 * @param {Object} aprobacion Información suministrada por el aprobador.
 * @param {string} aprobacion.nombre Nombre de la persona que aprueba.
 * @returns {Promise<Object>} Resultado del registro. Si la aprobación es
 * válida, devuelve el rol, identificador de la inspección y estado de las
 * aprobaciones; de lo contrario, indica si el token no existe o ya fue usado.
 * @throws {Error} Si falla alguna operación en la base de datos.
 */

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

/**
 * Marca una inspección como enviada y almacena la ubicación de su PDF.
 *
 * Se utiliza después de completar las aprobaciones, generar el informe final,
 * almacenarlo y procesar el correo correspondiente.
 *
 * @async
 * @param {string} inspeccionId Identificador único de la inspección.
 * @param {string} pdfUrl URL del informe PDF almacenado.
 * @returns {Promise<void>} Finaliza cuando la inspección ha sido actualizada.
 * @throws {Error} Si falla la actualización en la base de datos.
 */

async function marcarInspeccionEnviada(inspeccionId, pdfUrl) {
  await query(`UPDATE inspecciones SET estado = 'enviada', pdf_url = $1 WHERE inspeccion_id = $2`, [pdfUrl, inspeccionId]);
}

module.exports = {
  obtenerContextoAprobacion,
  guardarAprobacion,
  marcarInspeccionEnviada
};
