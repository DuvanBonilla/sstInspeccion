const { normalizarTexto } = require("../utils/texto.util");

const ESTADOS_VALIDOS = new Set(["B", "R", "M", "NC", "NA"]);

function normalizarSenalizacion(item = {}, idx = 0) {
  return {
    idx,
    tipo: normalizarTexto(item.tipo),
    ubicacion: normalizarTexto(item.ubicacion),

    cantidad: normalizarTexto(item.cantidad),

    estado: normalizarTexto(item.estado).toUpperCase(),

    aseo: normalizarTexto(item.aseo).toUpperCase(),

    observaciones: normalizarTexto(item.observaciones),
    evidenciaRuta: normalizarTexto(item.evidenciaRuta),
    evidenciaArchivo: normalizarTexto(item.evidenciaArchivo),
    evidenciaFecha: item.evidenciaFecha || null,
  };
}

function normalizarSenalizaciones(lista) {
  if (!Array.isArray(lista)) return [];

  return lista.map((item, idx) => normalizarSenalizacion(item, idx));
}

function validarSenalizaciones(lista, errores) {
  lista.forEach((item, idx) => {
    const numero = idx + 1;

    if (!item.tipo) {
      errores.push(`Señalización ${numero}: tipo es obligatorio`);
    }

    if (!item.ubicacion) {
      errores.push(`Señalización ${numero}: ubicación es obligatoria`);
    }

    if (!ESTADOS_VALIDOS.has(item.estado)) {
      errores.push(`Señalización ${numero}: estado inválido`);
    }
  });
}

module.exports = {
  normalizarSenalizaciones,
  validarSenalizaciones,
};
