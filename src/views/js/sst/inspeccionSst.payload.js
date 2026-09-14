/**
 * Construye los datos de una inspección SST.
 *
 * @param {Object} dependencias Datos y lectores necesarios.
 * @returns {Object} Inspección SST estructurada.
 */
export function construirInspeccionSst({
  inspeccionId = null,
  generarInspeccionId,
  obtenerValor,
  seccionesOmitidas = {},
  leerExtintores,
  leerCamillas,
  leerSenalizaciones,
  leerEquiposTecnologicos,
  leerBotiquines,
}) {
  const extintores = seccionesOmitidas.extintores
    ? []
    : leerExtintores();

  const camillas = seccionesOmitidas.camillas
    ? []
    : leerCamillas();

  const senalizaciones = seccionesOmitidas.senalizaciones
    ? []
    : leerSenalizaciones();

  const equiposTecnologicos = seccionesOmitidas.equiposTecnologicos
    ? []
    : leerEquiposTecnologicos();

  const botiquines = seccionesOmitidas.botiquines
    ? []
    : leerBotiquines();

  return {
    inspeccionId: inspeccionId || generarInspeccionId(),
    fecha: obtenerValor("fecha"),
    sedeOperacion: obtenerValor("sedeOperacion"),
    areaTrabajo: obtenerValor("areaTrabajo"),
    jefeResponsable: obtenerValor("jefeResponsable"),
    cargoJefe: obtenerValor("cargoJefe"),
    responsableInspeccion: obtenerValor(
      "responsableInspeccion",
    ),
    cargoResponsable: obtenerValor("cargoResponsable"),
    camillas,
    camilla: camillas[0] || null,
    senalizaciones,
    senalizacion: senalizaciones[0] || null,
    equiposTecnologicos,
    equipoTecnologico: equiposTecnologicos[0] || null,
    observacionesEquipos:
      obtenerValor("observacionesEquipos") || "",
    botiquines,
    botiquin: botiquines[0] || null,
    extintores,
    extintor: extintores[0] || null,
  };
}