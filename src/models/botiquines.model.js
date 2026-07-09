/*
  botiquines.model.js — Modelo de validación y normalización de botiquines.

  Qué hace:
  - normalizarBotiquines(): limpia y estandariza el array de botiquines del payload,
    incluyendo los ítems anidados de cada botiquín.
  - validarBotiquines(): verifica que cada botiquín tenga número y ubicación,
    y que cada ítem tenga los campos requeridos con estados válidos
    (B, R, M, NC, NA) para integridad, plan de intervención, cumplimiento
    y afectación al servicio.

  Cómo interactúa:
  - Es importado por extintor.model.js y usado dentro de validarInspeccion()
    para validar únicamente la sección de botiquines del payload.
  - No se comunica con el servidor ni con el frontend directamente.
*/


// Definición de estados válidos para integridad, plan de intervención, cumplimiento y afectación al servicio
const ESTADOS_VALIDOS = new Set(["B", "R", "M", "NC", "NA"]);
const VALORES_SI_NO   = new Set(["Sí", "No", ""]);

// Función para normalizar texto: elimina espacios al inicio y al final, y asegura que sea una cadena
function normalizarTexto(valor) {
  if (typeof valor !== "string") return "";
  return valor.trim();
}

// Función para normalizar un ítem de botiquín
function normalizarBotiquinItem(item) {
  if (!item || typeof item !== "object") return null;

  // Normaliza cada campo del ítem, asegurando que sean cadenas y aplicando mayúsculas donde corresponde
  return {
    no: item.no || "",
    item: normalizarTexto(item.item),
    cantidadIdeal: normalizarTexto(item.cantidadIdeal),
    cantidadReal: normalizarTexto(item.cantidadReal),
    integridadEmpaque: normalizarTexto(item.integridadEmpaque).toUpperCase(),
    fechaVencimiento: normalizarTexto(item.fechaVencimiento),
    planIntervencion: normalizarTexto(item.planIntervencion).toUpperCase(),
    fechaIntervencion: normalizarTexto(item.fechaIntervencion),
    cumplimiento: normalizarTexto(item.cumplimiento),
    observaciones: normalizarTexto(item.observaciones),
    afectacionServicio: normalizarTexto(item.afectacionServicio),
    evidenciaArchivo: normalizarTexto(item.evidenciaArchivo || item.evidenciaNombre),
    evidenciaRuta: normalizarTexto(item.evidenciaRuta)
  };
}

// Función para normalizar un botiquín completo, incluyendo sus ítems
function normalizarBotiquin(botiquin) {
  if (!botiquin || typeof botiquin !== "object") return null;

  return {
    numero: normalizarTexto(botiquin.numero),
    ubicacion: normalizarTexto(botiquin.ubicacion),
    observacionGeneral: normalizarTexto(botiquin.observacionGeneral),
    evidenciaGeneralArchivo: normalizarTexto(botiquin.evidenciaGeneralArchivo),
    evidenciaArchivo: normalizarTexto(botiquin.evidenciaArchivo || botiquin.evidenciaNombre),
    evidenciaRuta: normalizarTexto(botiquin.evidenciaRuta),
    items: Array.isArray(botiquin.items) ? botiquin.items.map(normalizarBotiquinItem).filter(Boolean) : []
  };
}

// Función principal para normalizar un payload de botiquines, que puede ser un array o un objeto único
function normalizarBotiquines(payload) {
  if (Array.isArray(payload?.botiquines)) {
    return payload.botiquines.map(normalizarBotiquin).filter(Boolean);
  }

  const unico = normalizarBotiquin(payload?.botiquin);
  return unico ? [unico] : [];
}

// Función para validar un array de botiquines, registrando errores en un array proporcionado
function validarBotiquines(botiquines, errores) {
  return botiquines.map((botiquin, index) => {
    if (!botiquin.numero) errores.push(`Numero de botiquin es obligatorio en botiquin ${index + 1}`);
    if (!botiquin.ubicacion) errores.push(`Ubicacion de botiquin es obligatoria en botiquin ${index + 1}`);

    const items = Array.isArray(botiquin.items) ? botiquin.items : [];
    if (items.length === 0) {
      errores.push(`Debe agregar items en botiquin ${index + 1}`);
    }

    // Validación de cada ítem dentro del botiquín
    for (const [itemIndex, item] of items.entries()) {
      if (!item.item) errores.push(`Item obligatorio en botiquin ${index + 1}, fila ${itemIndex + 1}`);
      if (!item.cantidadIdeal) errores.push(`Cantidad ideal obligatoria en botiquin ${index + 1}, fila ${itemIndex + 1}`);
      if (!item.cantidadReal) errores.push(`Cantidad real obligatoria en botiquin ${index + 1}, fila ${itemIndex + 1}`);

      if (!ESTADOS_VALIDOS.has(item.integridadEmpaque)) {
        errores.push(`Integridad empaque invalida en botiquin ${index + 1}, fila ${itemIndex + 1}`);
      }

      if (!VALORES_SI_NO.has(item.cumplimiento)) {
        errores.push(`Cumplimiento invalido en botiquin ${index + 1}, fila ${itemIndex + 1}`);
      }

      if (!VALORES_SI_NO.has(item.afectacionServicio)) {
        errores.push(`Afectacion al servicio invalida en botiquin ${index + 1}, fila ${itemIndex + 1}`);
      }
    }

    return botiquin;
  });
}

// Exportación de las funciones para normalización y validación de botiquines
module.exports = {
  normalizarBotiquines,
  validarBotiquines
};
