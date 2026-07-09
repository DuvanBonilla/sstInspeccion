/*
  equiposTecnologicos.model.js — Modelo de validación y normalización de equipos tecnológicos.

  Qué hace:
  - normalizarEquiposTecnologicos(): limpia y estandariza el array de equipos del payload.
  - validarEquiposTecnologicos(): verifica que cada uno de los 4 equipos fijos
    (sensor de humo, sensor de movimiento, cámaras, alarma) tenga ubicación y que
    los campos de estado, mantenimiento (B/R/M/NC/NA) y afectación al servicio (SI/NO)
    sean valores válidos.

  Cómo interactúa:
  - Es importado por extintor.model.js y usado dentro de validarInspeccion()
    para validar únicamente la sección de equipos tecnológicos del payload.
  - No se comunica con el servidor ni con el frontend directamente.
*/
const ESTADOS_VALIDOS = new Set(["B", "R", "M", "NC", "NA"]);
const AFECTACION_SERVICIO_VALIDOS = new Set(["SI", "NO"]);

// Lista de equipos tecnológicos fijos que se esperan en el payload
const EQUIPOS_TECNOLOGICOS = [
  "Sensor de humo",
  "Sensor de movimiento",
  "Camaras de seguridad",
  "Alarma de emergencia"
];


// Normaliza un valor de texto, eliminando espacios en blanco al inicio y al final.
function normalizarTexto(valor) {
  if (typeof valor !== "string") return "";
  return valor.trim();
}


// Normaliza un objeto de equipo tecnológico, asegurando que todos los campos estén presentes y en el formato correcto.
function normalizarEquipoTecnologico(equipoTecnologico, index) {
  if (!equipoTecnologico || typeof equipoTecnologico !== "object") return null;

  // Si el campo 'no' no es un número válido, se asigna el índice + 1 como valor predeterminado.
  return {
    no: Number.isFinite(Number(equipoTecnologico.no)) ? String(equipoTecnologico.no) : String(index + 1),
    equipoTecnologico: normalizarTexto(equipoTecnologico.equipoTecnologico || equipoTecnologico.tipo || EQUIPOS_TECNOLOGICOS[index] || ""),
    ubicacion: normalizarTexto(equipoTecnologico.ubicacion),
    cantidad: normalizarTexto(equipoTecnologico.cantidad),
    estado: normalizarTexto(equipoTecnologico.estado).toUpperCase(),
    mantenimiento: normalizarTexto(equipoTecnologico.mantenimiento).toUpperCase(),
    observaciones: normalizarTexto(equipoTecnologico.observaciones),
    afectacionServicio: normalizarTexto(equipoTecnologico.afectacionServicio || equipoTecnologico.afectacion).toUpperCase(),
    evidenciaArchivo: normalizarTexto(equipoTecnologico.evidenciaArchivo || equipoTecnologico.evidenciaNombre),
    evidenciaRuta: normalizarTexto(equipoTecnologico.evidenciaRuta)
  };
}

// Normaliza un payload que puede contener un array de equipos tecnológicos o un único objeto de equipo tecnológico.
function normalizarEquiposTecnologicos(payload) {
  if (Array.isArray(payload?.equiposTecnologicos)) {
    return payload.equiposTecnologicos
      .map((equipoTecnologico, index) => normalizarEquipoTecnologico(equipoTecnologico, index))
      .filter(Boolean);
  }

  const unico = normalizarEquipoTecnologico(payload?.equipoTecnologico, 0);
  return unico ? [unico] : [];
}

// Valida un array de equipos tecnológicos, asegurando que cada uno tenga los campos requeridos y que los valores sean válidos.
function validarEquiposTecnologicos(equiposTecnologicos, errores) {
  return equiposTecnologicos.map((equipoTecnologico, index) => {
    if (!equipoTecnologico.equipoTecnologico) {
      errores.push(`Equipo tecnologico es obligatorio en registro ${index + 1}`);
    }

    if (!equipoTecnologico.ubicacion) {
      errores.push(`Ubicacion es obligatoria en equipo tecnologico ${index + 1}`);
    }

    if (!equipoTecnologico.cantidad) {
      errores.push(`Cantidad es obligatoria en equipo tecnologico ${index + 1}`);
    }

    if (!ESTADOS_VALIDOS.has(equipoTecnologico.estado)) {
      errores.push(`Estado invalido en equipo tecnologico ${index + 1}`);
    }

    if (!ESTADOS_VALIDOS.has(equipoTecnologico.mantenimiento)) {
      errores.push(`Mantenimiento invalido en equipo tecnologico ${index + 1}`);
    }

    if (!AFECTACION_SERVICIO_VALIDOS.has(equipoTecnologico.afectacionServicio)) {
      errores.push(`Afectacion al servicio debe ser SI o NO en equipo tecnologico ${index + 1}`);
    }

    return equipoTecnologico;
  });
}

module.exports = {
  normalizarEquiposTecnologicos,
  validarEquiposTecnologicos
};
