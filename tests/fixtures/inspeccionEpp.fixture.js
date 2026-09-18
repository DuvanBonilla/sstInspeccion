/**
 * Datos válidos reutilizables para las pruebas de inspecciones EPP.
 *
 * Cada función devuelve una estructura nueva para que las pruebas
 * puedan modificar sus datos sin afectar otros casos.
 */

function crearElementoEppValido() {
  return {
    elementoEppId: 1,
    elemento: "Casco de seguridad",
    condicion: "B",
    uso: "B",
    planAccion: "",
    fechaPlanAccion: "",
  };
}

function crearTrabajadorEppValido() {
  return {
    trabajadorId: null,
    nombre: "Trabajador de prueba",
    codigo: "TRAB-001",
    cargo: "Auxiliar operativo",
    observaciones: "",
    elementos: [
      crearElementoEppValido(),
    ],
    evidenciaRuta: "",
    evidenciaArchivo: "",
    evidenciaFecha: null,
  };
}

function crearInspeccionEppValida() {
  return {
    inspeccionId: "INSP-EPP-PRUEBA-001",
    informacionGeneral: {
      fecha: "2026-09-11",
      sedeOperacion: "Apartadó",
      areaTrabajo: "Operaciones",
      jefeResponsable: "Jefe de prueba",
      cargoJefe: "Jefe de área",
      responsableInspeccion: "Inspector de prueba",
      cargoResponsable: "Inspector SST",
    },
    trabajadores: [
      crearTrabajadorEppValido(),
    ],
  };
}

function crearEvidenciaTrabajadorValida() {
  const buffer = Buffer.from("evidencia-de-prueba");

  return {
    originalname: "evidencia.jpg",
    mimetype: "image/jpeg",
    buffer,
    size: buffer.length,
  };
}

module.exports = {
  crearElementoEppValido,
  crearTrabajadorEppValido,
  crearInspeccionEppValida,
  crearEvidenciaTrabajadorValida,
};