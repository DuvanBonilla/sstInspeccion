const {
  normalizarExtintores: normalizarExtintoresSeccion,
  validarExtintores,
} = require("../validators/extintores.validator");
const {
  normalizarCamillas: normalizarCamillasSeccion,
  validarCamillas,
} = require("../validators/camillas.validator");
const {
  normalizarSenalizaciones: normalizarSenalizacionesSeccion,
  validarSenalizaciones,
} = require("../validators/senalizaciones.validator");
const {
  normalizarEquiposTecnologicos: normalizarEquiposTecnologicosSeccion,
  validarEquiposTecnologicos,
} = require("../validators/equiposTecnologicos.validator");
const {
  normalizarBotiquines: normalizarBotiquinesSeccion,
  validarBotiquines,
} = require("../validators/botiquines.validator");

const { normalizarTexto } = require("../utils/texto.util");

/**
 * Normaliza y valida la información de una inspección SST.
 *
 * Valida los datos generales de la inspección y delega la normalización y
 * validación de extintores, camillas, señalizaciones, equipos tecnológicos
 * y botiquines en los validadores correspondientes.
 *
 * Para las sedes de Urabá y Santa Marta permite que una o varias secciones
 * sean enviadas sin elementos. En las demás sedes exige al menos un elemento
 * por cada sección. Los elementos recibidos se validan independientemente de
 * que la sede permita omitir secciones.
 *
 * @param {Object} payload Información recibida desde el formulario SST.
 * @param {string} [payload.inspeccionId] Identificador de la inspección.
 * @param {string} [payload.fecha] Fecha de la inspección.
 * @param {string} [payload.sedeOperacion] Sede donde se realiza la inspección.
 * @param {string} [payload.areaTrabajo] Área inspeccionada.
 * @param {string} [payload.jefeResponsable] Nombre del jefe responsable.
 * @param {string} [payload.cargoJefe] Cargo del jefe responsable.
 * @param {string} [payload.responsableInspeccion] Responsable de la inspección.
 * @param {string} [payload.cargoResponsable] Cargo del responsable.
 * @returns {Object} Resultado de la validación. Si existen errores devuelve
 * `ok: false` y la lista `errores`; si la información es válida devuelve
 * `ok: true` y los datos normalizados en `data`.
 */

function validarInspeccion(payload) {
  const errores = [];

  // Normaliza campos generales del payload.
  const inspeccionId = normalizarTexto(payload?.inspeccionId);
  const fecha = normalizarTexto(payload?.fecha);
  const sedeOperacion = normalizarTexto(payload?.sedeOperacion);
  const areaTrabajo = normalizarTexto(payload?.areaTrabajo);
  const jefeResponsable = normalizarTexto(payload?.jefeResponsable);
  const cargoJefe = normalizarTexto(payload?.cargoJefe);
  const responsableInspeccion = normalizarTexto(payload?.responsableInspeccion);
  const cargoResponsable = normalizarTexto(payload?.cargoResponsable);

  // Validaciones de campos obligatorios.
  if (!fecha) errores.push("Fecha de inspeccion es obligatoria");
  if (!sedeOperacion) errores.push("Sede de operacion es obligatoria");
  if (!areaTrabajo) errores.push("Area de trabajo es obligatoria");
  if (!jefeResponsable)
    errores.push("Nombre del jefe responsable es obligatorio");
  if (!cargoJefe) errores.push("Cargo del jefe es obligatorio");
  if (!responsableInspeccion)
    errores.push("Nombre del responsable de inspeccion es obligatorio");
  if (!cargoResponsable) errores.push("Cargo del responsable es obligatorio");

  // Normaliza cada sección del payload para validación.
  // Normaliza cada sección del payload para validación.
  const extintores = normalizarExtintoresSeccion(payload);

  const camillas = normalizarCamillasSeccion(payload);

  const senalizaciones = normalizarSenalizacionesSeccion(
    payload?.senalizaciones,
  );

  const equiposTecnologicos = normalizarEquiposTecnologicosSeccion(payload);

  const botiquines = normalizarBotiquinesSeccion(payload);

  // Sede Urabá: el usuario puede omitir cualquiera de las 5 secciones desde
  // el formulario (botón "Omitir"), que las envía vacías. Para esa sede no
  // se exige el mínimo de 1 ítem por sección. Fuera de eso, cualquier ítem
  // que sí venga (omitido o no, Urabá o no) se valida igual que siempre —
  // omitir una sección es dejarla en cero ítems, no aceptar datos incompletos.
  const SEDES_PERMITEN_OMITIR = ["urab", "santa marta"];

  const seccionMinimoOpcional = SEDES_PERMITEN_OMITIR.some((sede) =>
    sedeOperacion.toLowerCase().includes(sede),
  );

  if (!seccionMinimoOpcional) {
    // Validaciones de existencia mínima de cada sección.
    if (extintores.length === 0) {
      errores.push("Debe agregar al menos un extintor");
    }

    if (camillas.length === 0) {
      errores.push("Debe agregar al menos una camilla");
    }

    if (senalizaciones.length === 0) {
      errores.push("Debe agregar al menos una senalizacion");
    }

    if (equiposTecnologicos.length === 0) {
      errores.push("Debe agregar al menos un equipo tecnologico");
    }

    if (botiquines.length === 0) {
      errores.push("Debe agregar al menos un botiquin");
    }
  }

  // Valida cada sección y acumula errores.
  validarExtintores(extintores, errores);
  validarCamillas(camillas, errores);
  validarSenalizaciones(senalizaciones, errores);
  validarEquiposTecnologicos(equiposTecnologicos, errores);
  validarBotiquines(botiquines, errores);

  if (errores.length > 0) {
    return { ok: false, errores };
  }

  return {
    ok: true,
    data: {
      general: {
        inspeccionId,
        fecha,
        sedeOperacion,
        areaTrabajo,
        jefeResponsable,
        cargoJefe,
        responsableInspeccion,
        cargoResponsable,
      },
      extintores,
      camillas,
      camilla: camillas[0] || null,
      senalizaciones,
      senalizacion: senalizaciones[0] || null,
      equiposTecnologicos,
      equipoTecnologico: equiposTecnologicos[0] || null,
      botiquines,
      botiquin: botiquines[0] || null,
    },
  };
}

module.exports = {
  validarInspeccion,
};
