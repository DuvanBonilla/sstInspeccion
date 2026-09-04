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

/**
 * Normaliza la información de un extintor.
 *
 * Limpia sus campos de texto, admite los nombres alternativos utilizados
 * para la evidencia y garantiza que exista un objeto de condiciones.
 *
 * @param {Object} extintor - Extintor recibido en el payload.
 * @returns {{
 *   numero: string,
 *   ubicacion: string,
 *   tipo: string,
 *   capacidad: string,
 *   mesRecarga: string,
 *   anioRecarga: string,
 *   observaciones: string,
 *   evidenciaArchivo: string,
 *   evidenciaRuta: string,
 *   condiciones: Object
 * }|null} Extintor normalizado, o `null` si el valor recibido no es un objeto.
 */

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
/**
 * Obtiene y normaliza los extintores presentes en el payload.
 *
 * Admite tanto la colección `extintores` como el objeto individual `extintor`
 * y devuelve siempre una lista uniforme, descartando valores inválidos.
 *
 * @param {Object} payload - Payload recibido para la inspección SST.
 * @returns {Array<Object>} Extintores normalizados.
 */

function normalizarExtintores(payload) {
  if (Array.isArray(payload?.extintores)) {
    return payload.extintores.map(normalizarExtintor).filter(Boolean);
  }

  const unico = normalizarExtintor(payload?.extintor);
  return unico ? [unico] : [];
}

/**
 * Valida la información y las condiciones de los extintores.
 *
 * Comprueba los datos obligatorios de cada extintor y verifica que todas
 * las condiciones configuradas tengan una calificación permitida:
 * `B`, `R`, `M`, `NC` o `NA`.
 *
 * Los errores encontrados se agregan al arreglo recibido y las condiciones
 * válidas se devuelven normalizadas en mayúsculas.
 *
 * @param {Array<Object>} extintores - Extintores previamente normalizados.
 * @param {string[]} errores - Arreglo donde deben acumularse los errores.
 * @returns {Array<Object>} Extintores con sus condiciones validadas y normalizadas.
 */

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
