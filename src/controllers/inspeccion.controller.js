/*
  inspeccion.controller.js — Controlador del endpoint POST /enviar-onedrive-extintor.

  Qué hace:
  - Recibe el FormData del frontend (payload JSON + archivos de evidencia en memoria).
  - Valida la inspección usando inspeccion.model.js (campos obligatorios, estados válidos).
  - Por cada sección procesa las evidencias y las sube a OneDrive, luego agrega
    una fila al Excel de OneDrive:
      · Extintores   → appendExtintorRowToOneDrive()
      · Camillas     → appendCamillaRowToOneDrive()
      · Señalizaciones → appendSenalizacionRowToOneDrive()
      · Equipos Tec. → appendEquipoTecnologicoRowToOneDrive()
      · Botiquines   → appendBotiquinRowToOneDrive() (una fila por ítem)
  - Responde 201 si todo fue exitoso, o 400/500 con el detalle del error.

  Cómo interactúa:
  - Es registrado en app.js como handler de POST /enviar-onedrive-extintor.
  - Utiliza todas las funciones de inspeccion.model.js para la lógica de negocio
    (validación, escritura en Excel y subida de archivos a OneDrive).
  - El frontend (inspeccion-sst.js) es quien construye y envía el FormData.
*/
const {
  validarInspeccion,
  appendMultipleRowsToOneDrive,
  uploadEvidenceToOneDrive
} = require("../models/inspeccion.model");


// Convierte payload multipart/json en un objeto utilizable por el modelo.
function leerPayload(req) {
  if (typeof req.body?.payload === "string") {
    return JSON.parse(req.body.payload);
  }

  return req.body;
}

// Extrae, ordenadas por photoIndex, todas las fotos de un ítem cuyo fieldname
// sigue el patrón "{prefix}-{index}-{photoIndex}".
function obtenerArchivosMultiples(files, prefix, index) {
  const patron = new RegExp(`^${prefix}-${index}-(\\d+)$`);
  return files
    .map((file) => ({ file, match: patron.exec(file.fieldname || "") }))
    .filter((x) => x.match)
    .sort((a, b) => Number(a.match[1]) - Number(b.match[1]))
    .map((x) => x.file);
}

// Sube todas las fotos de un ítem a OneDrive y combina las rutas/nombres resultantes
// en un solo texto (la celda de Excel sigue siendo una sola columna por ítem).
async function subirEvidenciasMultiples(files, prefix, tipoPrefijo, index, inspeccionId) {
  const archivos = obtenerArchivosMultiples(files, prefix, index);
  if (archivos.length === 0) return { ruta: "", nombre: "" };

  const rutas = await Promise.all(
    archivos.map((file, subIdx) =>
      uploadEvidenceToOneDrive(file, tipoPrefijo, index + 1, inspeccionId, archivos.length > 1 ? subIdx + 1 : null)
    )
  );

  const rutasValidas = rutas.filter(Boolean);
  return {
    ruta: rutasValidas.join("\n"),
    nombre: rutasValidas.map((ruta) => ruta.split("/").pop() || "").join("\n")
  };
}

// Controlador principal para el endpoint POST /enviar-onedrive-extintor
async function enviarExtintorOneDrive(req, res) {
  let payload;

  try {
    payload = leerPayload(req);
  } catch {
    return res.status(400).json({
      ok: false,
      errores: ["No fue posible leer los datos del formulario"]
    });
  }

  const validacion = validarInspeccion(payload);
 
  // Si la validación falla, respondemos con un 400 y los errores.
  if (!validacion.ok) {
    return res.status(400).json({
      ok: false,
      errores: validacion.errores
    });
  }

  // Si llegamos aquí, la validación fue exitosa y podemos proceder a subir evidencias y agregar filas en OneDrive.
  try {
    const files = Array.isArray(req.files) ? req.files : [];
    const extintores = Array.isArray(validacion.data.extintores) ? validacion.data.extintores.map((extintor) => ({ ...extintor })) : [];
    const camillas = Array.isArray(validacion.data.camillas) ? validacion.data.camillas.map((camilla) => ({ ...camilla })) : [];
    const senalizaciones = Array.isArray(validacion.data.senalizaciones) ? validacion.data.senalizaciones.map((senalizacion) => ({ ...senalizacion })) : [];
    const equiposTecnologicos = Array.isArray(validacion.data.equiposTecnologicos) ? validacion.data.equiposTecnologicos.map((equipoTecnologico) => ({ ...equipoTecnologico })) : [];
    const botiquines = Array.isArray(validacion.data.botiquines) ? validacion.data.botiquines.map((botiquin) => ({ ...botiquin })) : [];

    // FASE 1 — subida de evidencias en paralelo (cada archivo tiene ruta única).
    const codigoInspeccion = validacion.data.general.inspeccionId;

    await Promise.all([
      ...extintores.map(async (extintor, i) => {
        const { ruta, nombre } = await subirEvidenciasMultiples(files, "evidencia", "EXT", i, codigoInspeccion);
        if (ruta) { extintor.evidenciaRuta = ruta; extintor.evidenciaArchivo = nombre; }
      }),
      ...camillas.map(async (camilla, i) => {
        const { ruta, nombre } = await subirEvidenciasMultiples(files, "evidencia-camilla", "CAM", i, codigoInspeccion);
        if (ruta) { camilla.evidenciaRuta = ruta; camilla.evidenciaArchivo = nombre; }
      }),
      ...senalizaciones.map(async (senalizacion, i) => {
        const { ruta, nombre } = await subirEvidenciasMultiples(files, "evidencia-senalizacion", "SEN", i, codigoInspeccion);
        if (ruta) { senalizacion.evidenciaRuta = ruta; senalizacion.evidenciaArchivo = nombre; }
      }),
      ...equiposTecnologicos.map(async (equipo, i) => {
        const { ruta, nombre } = await subirEvidenciasMultiples(files, "equipo-tecnologico-evidencia", "EQT", i, codigoInspeccion);
        if (ruta) { equipo.evidenciaRuta = ruta; equipo.evidenciaArchivo = nombre; }
      }),
      ...botiquines.map(async (botiquin, i) => {
        const { ruta, nombre } = await subirEvidenciasMultiples(files, "botiquin-evidencia", "BOT", i, codigoInspeccion);
        if (ruta) { botiquin.evidenciaRuta = ruta; botiquin.evidenciaArchivo = nombre; }
      }),
    ]);

    // FASE 2 — inserción por lotes: 1 llamada por tabla.
    const general = validacion.data.general;

    const botiquinRows = botiquines.flatMap(botiquin => {
      const items = Array.isArray(botiquin.items) ? botiquin.items : [];
      return items.map(botiquinItem => {
        const item = { ...botiquinItem };
        if (botiquin.evidenciaRuta) {
          item.evidenciaRuta = botiquin.evidenciaRuta;
          item.evidenciaArchivo = botiquin.evidenciaArchivo;
        }
        return { general, botiquin, botiquinItem: item };
      });
    });

    // Extintores primero: calcula y devuelve el NumInspeccion.
    const resultExtintores = await appendMultipleRowsToOneDrive(extintores.map(extintor => ({ general, extintor })), "ONEDRIVE_TABLE_NAME");
    const numInspeccion = resultExtintores?.resolvedNumInspeccion ?? null;

    // Las demás tablas usan la secuencia ya calculada (sin leer filas de nuevo).
    await appendMultipleRowsToOneDrive(camillas.map(camilla => ({ general, camilla })), "ONEDRIVE_TABLE_NAME_CAMILLA", numInspeccion);
    await appendMultipleRowsToOneDrive(senalizaciones.map(senalizacion => ({ general, senalizacion })), "ONEDRIVE_TABLE_NAME_SENALIZACION", numInspeccion);
    await appendMultipleRowsToOneDrive(equiposTecnologicos.map(equipoTecnologico => ({ general, equipoTecnologico })), "ONEDRIVE_TABLE_NAME_EQUIPO_TECNOLOGICO", numInspeccion);
    await appendMultipleRowsToOneDrive(botiquinRows, "ONEDRIVE_TABLE_NAME_BOTIQUIN", numInspeccion);

    // Respuesta exitosa
    return res.status(201).json({
      ok: true,
      mensaje: "Filas agregadas en Excel de OneDrive",
      numInspeccion
    });
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : "Error enviando a OneDrive";

    // Respuesta de error
    return res.status(500).json({
      ok: false,
      errores: [mensaje]
    });
  }
}

// Exportación del controlador para que pueda ser usado en app.js
module.exports = {
  enviarExtintorOneDrive
};
