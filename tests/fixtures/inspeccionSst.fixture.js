/**
 * Datos válidos reutilizables para las pruebas de inspecciones SST.
 *
 * Cada función devuelve un objeto nuevo para evitar que una prueba
 * modifique accidentalmente los datos utilizados por otra.
 */

function crearExtintorValido() {
  return {
    numero: "1",
    ubicacion: "Área administrativa",
    tipo: "ABC",
    capacidad: "10 lb",
    mesRecarga: "09",
    anioRecarga: "2026",
    observaciones: "",
    evidenciaArchivo: "",
    evidenciaRuta: "",
    condiciones: {
      acceso: "B",
      visibilidad: "B",
      senalizacion: "B",
      paredAltura: "B",
      piso: "B",
      limpieza: "B",
      rotulo: "B",
      cilindro: "B",
      manometro: "B",
      presion: "B",
      pin: "B",
      manguera: "B",
      boquilla: "B",
      corneta: "B",
      pintura: "B",
      manija: "B",
      sello: "B",
      llaveSpanner: "B",
      otros: "B",
    },
  };
}

function crearCamillaValida() {
  return {
    numero: "1",
    ubicacion: "Área administrativa",
    observaciones: "",
    afectacionProductividad: "NO",
    evidenciaArchivo: "",
    evidenciaRuta: "",
    condiciones: {
      senalizacion: "B",
      acceso: "B",
      estadoSoporte: "B",
      instalacionPared: "B",
      correasSeguridad: "B",
      limpieza: "B",
      inmovilizador: "B",
    },
  };
}

function crearSenalizacionValida() {
  return {
    tipo: "Salida de emergencia",
    ubicacion: "Área administrativa",
    cantidad: "1",
    estado: "B",
    aseo: "B",
    observaciones: "",
    evidenciaRuta: "",
    evidenciaArchivo: "",
    evidenciaFecha: null,
  };
}

function crearEquipoTecnologicoValido() {
  return {
    no: "1",
    equipoTecnologico: "Sensor de humo",
    ubicacion: "Área administrativa",
    cantidad: "1",
    estado: "B",
    mantenimiento: "B",
    observaciones: "",
    afectacionServicio: "NO",
    evidenciaArchivo: "",
    evidenciaRuta: "",
  };
}

function crearBotiquinItemValido() {
  return {
    no: 1,
    item: "Gasa estéril",
    cantidadIdeal: "10",
    cantidadReal: "10",
    integridadEmpaque: "B",
    fechaVencimiento: "2027-09-11",
    planIntervencion: "",
    fechaIntervencion: "",
    cumplimiento: "Sí",
    observaciones: "",
    afectacionServicio: "No",
    evidenciaArchivo: "",
    evidenciaRuta: "",
  };
}

function crearBotiquinValido() {
  return {
    numero: "1",
    ubicacion: "Área administrativa",
    observacionGeneral: "",
    evidenciaGeneralArchivo: "",
    evidenciaArchivo: "",
    evidenciaRuta: "",
    items: [
      crearBotiquinItemValido(),
    ],
  };
}

function crearInspeccionSstValida() {
  return {
    inspeccionId: "INSP-PRUEBA-001",
    fecha: "2026-09-11",
    sedeOperacion: "Bogotá",
    areaTrabajo: "Administrativa",
    jefeResponsable: "Jefe de prueba",
    cargoJefe: "Jefe de área",
    responsableInspeccion: "Inspector de prueba",
    cargoResponsable: "Inspector SST",
    extintores: [
      crearExtintorValido(),
    ],
    camillas: [
      crearCamillaValida(),
    ],
    senalizaciones: [
      crearSenalizacionValida(),
    ],
    equiposTecnologicos: [
      crearEquipoTecnologicoValido(),
    ],
    botiquines: [
      crearBotiquinValido(),
    ],
  };
}

module.exports = {
  crearExtintorValido,
  crearCamillaValida,
  crearSenalizacionValida,
  crearEquipoTecnologicoValido,
  crearBotiquinItemValido,
  crearBotiquinValido,
  crearInspeccionSstValida,
};