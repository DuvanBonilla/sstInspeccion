const { normalizarTexto } = require("../utils/texto.util");
const ESTADOS_VALIDOS = new Set(["B", "R", "M", "NC", "NA"]);

const CAMPOS_CONDICION = [
  "acceso",
  "visibilidad",
  "senalizacion",
  "paredAltura",
  "piso",
  "limpieza",
  "rotulo",
  "cilindro",
  "manometro",
  "presion",
  "pin",
  "manguera",
  "boquilla",
  "corneta",
  "pintura",
  "manija",
  "sello",
  "llaveSpanner",
  "otros"
];

function normalizarExtintor(extintor) {
  if (!extintor || typeof extintor !== "object") return null;

  return {
    numero: normalizarTexto(extintor.numero),
    ubicacion: normalizarTexto(extintor.ubicacion),
    tipo: normalizarTexto(extintor.tipo),
    capacidad: normalizarTexto(extintor.capacidad),
    mesRecarga: normalizarTexto(extintor.mesRecarga),
    anioRecarga: normalizarTexto(extintor.anioRecarga),
    observaciones: normalizarTexto(extintor.observaciones),
    evidenciaArchivo: normalizarTexto(extintor.evidenciaArchivo || extintor.evidenciaNombre),
    evidenciaRuta: normalizarTexto(extintor.evidenciaRuta),
    condiciones: extintor.condiciones || {}
  };
}

// Normaliza un payload que puede contener un array de extintores o un único objeto de extintor.
function normalizarExtintores(payload) {
  if (Array.isArray(payload?.extintores)) {
    return payload.extintores.map(normalizarExtintor).filter(Boolean);
  }

  const unico = normalizarExtintor(payload?.extintor);
  return unico ? [unico] : [];
}

//
function validarExtintores(extintores, errores) {
  return extintores.map((extintor, index) => {
    if (!extintor.numero) errores.push(`Numero de extintor es obligatorio en extintor ${index + 1}`);
    if (!extintor.ubicacion) errores.push(`Ubicacion es obligatoria en extintor ${index + 1}`);
    if (!extintor.tipo) errores.push(`Tipo es obligatorio en extintor ${index + 1}`);
    if (!extintor.capacidad) errores.push(`Capacidad es obligatoria en extintor ${index + 1}`);
    if (!extintor.mesRecarga) errores.push(`Mes de recarga es obligatorio en extintor ${index + 1}`);
    if (!extintor.anioRecarga) errores.push(`Ano de recarga es obligatorio en extintor ${index + 1}`);

    const condiciones = {};

    for (const campo of CAMPOS_CONDICION) {
      const valor = normalizarTexto(extintor.condiciones?.[campo]).toUpperCase();

      if (!ESTADOS_VALIDOS.has(valor)) {
        errores.push(`Estado invalido para ${campo} en extintor ${index + 1}`);
        continue;
      }

      condiciones[campo] = valor;
    }

    return {
      ...extintor,
      condiciones
    };
  });
}

// Exporta las funciones y constantes para que puedan ser utilizadas en otros módulos.
module.exports = {
  CAMPOS_CONDICION,
  normalizarExtintores,
  validarExtintores
};
