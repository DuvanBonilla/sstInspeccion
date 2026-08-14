const { normalizarTexto } = require("../utils/texto.util");
const ESTADOS_VALIDOS = new Set(["B", "R", "M", "NC", "NA"]);
const AFECTACION_PRODUCTIVIDAD_VALIDOS = new Set(["SI", "NO"]);

// Campos de condiciones de camilla que deben ser validados y normalizados.
const CAMPOS_CONDICION_CAMILLA = [
  "senalizacion",
  "acceso",
  "estadoSoporte",
  "instalacionPared",
  "correasSeguridad",
  "limpieza",
  "inmovilizador"
];


// Normaliza un objeto de camilla, asegurando que todos los campos sean cadenas de texto
function normalizarCamilla(camilla) {
  if (!camilla || typeof camilla !== "object") return null;

  return {
    numero: normalizarTexto(camilla.numero),
    ubicacion: normalizarTexto(camilla.ubicacion),
    observaciones: normalizarTexto(camilla.observaciones),
    afectacionProductividad: normalizarTexto(camilla.afectacionProductividad).toUpperCase(),
    evidenciaArchivo: normalizarTexto(camilla.evidenciaArchivo || camilla.evidenciaNombre),
    evidenciaRuta: normalizarTexto(camilla.evidenciaRuta),
    condiciones: camilla.condiciones || {}
  };
}

//  Normaliza un payload que puede contener un array de camillas o una única camilla.
function normalizarCamillas(payload) {
  if (Array.isArray(payload?.camillas)) {
    return payload.camillas.map(normalizarCamilla).filter(Boolean);
  }

  const unica = normalizarCamilla(payload?.camilla);
  return unica ? [unica] : [];
}

// Valida un array de camillas, acumulando errores en el array proporcionado.
function validarCamillas(camillas, errores) {
  return camillas.map((camilla, index) => {
    if (!camilla.numero) errores.push(`Numero de camilla es obligatorio en camilla ${index + 1}`);
    if (!camilla.ubicacion) errores.push(`Ubicacion de camilla es obligatoria en camilla ${index + 1}`);

    if (!AFECTACION_PRODUCTIVIDAD_VALIDOS.has(camilla.afectacionProductividad)) {
      errores.push(`Afectacion en la productividad debe ser SI o NO en camilla ${index + 1}`);
    }

    // Validar condiciones de camilla
    const condiciones = {};

    for (const campo of CAMPOS_CONDICION_CAMILLA) {
      const valor = normalizarTexto(camilla.condiciones?.[campo]).toUpperCase();

      if (!ESTADOS_VALIDOS.has(valor)) {
        errores.push(`Estado invalido para ${campo} en camilla ${index + 1}`);
        continue;
      }

      condiciones[campo] = valor;
    }

    return {
      ...camilla,
      condiciones
    };
  });
}

// Exportar funciones y constantes para ser usadas en otros módulos
module.exports = {
  CAMPOS_CONDICION_CAMILLA,
  normalizarCamillas,
  validarCamillas
};
