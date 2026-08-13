const ESTADOS_VALIDOS = new Set(["B", "R", "M", "NC", "NA"]);

// Normaliza un valor de texto, eliminando espacios al inicio y al final.
function normalizarTexto(valor) {
  if (typeof valor !== "string") return "";
  return valor.trim();
}

// Normaliza una señalización individual, asegurando que todos los campos sean cadenas de texto
function normalizarSenalizacion(senalizacion) {
  if (!senalizacion || typeof senalizacion !== "object") return null;

  return {
    tipo: normalizarTexto(senalizacion.tipo),
    ubicacion: normalizarTexto(senalizacion.ubicacion),
    cantidad: normalizarTexto(senalizacion.cantidad),
    estado: normalizarTexto(senalizacion.estado).toUpperCase(),
    aseo: normalizarTexto(senalizacion.aseo).toUpperCase(),
    observaciones: normalizarTexto(senalizacion.observaciones),
    evidenciaArchivo: normalizarTexto(senalizacion.evidenciaArchivo || senalizacion.evidenciaNombre),
    evidenciaRuta: normalizarTexto(senalizacion.evidenciaRuta)
  };
}

// Normaliza un payload de señalizaciones, que puede ser un array o un objeto único
function normalizarSenalizaciones(payload) {
  if (Array.isArray(payload?.senalizaciones)) {
    return payload.senalizaciones.map(normalizarSenalizacion).filter(Boolean);
  }

  const unica = normalizarSenalizacion(payload?.senalizacion);
  return unica ? [unica] : [];
}

// Valida un array de señalizaciones, asegurando que cada una tenga tipo y ubicación,
function validarSenalizaciones(senalizaciones, errores) {
  return senalizaciones.map((senalizacion, index) => {
    if (!senalizacion.tipo) errores.push(`Tipo de senalizacion es obligatorio en senalizacion ${index + 1}`);
    if (!senalizacion.ubicacion) errores.push(`Ubicacion es obligatoria en senalizacion ${index + 1}`);
    if (!senalizacion.cantidad) errores.push(`Cantidad es obligatoria en senalizacion ${index + 1}`);

    if (!ESTADOS_VALIDOS.has(senalizacion.estado)) {
      errores.push(`Estado invalido en senalizacion ${index + 1}`);
    }

    if (!ESTADOS_VALIDOS.has(senalizacion.aseo)) {
      errores.push(`Aseo invalido en senalizacion ${index + 1}`);
    }

    return senalizacion;
  });
}

module.exports = {
  normalizarSenalizaciones,
  validarSenalizaciones
};
