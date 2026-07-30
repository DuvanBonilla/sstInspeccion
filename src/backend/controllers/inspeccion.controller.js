/*
  inspeccion.controller.js — Controlador del endpoint POST /enviar-onedrive-extintor.

  Qué hace:
  - Recibe el FormData del frontend (payload JSON + archivos de evidencia en memoria).
  - Valida la inspección usando inspeccion.model.js (campos obligatorios, estados válidos).
  - Sube las evidencias de cada sección a OneDrive (carpeta EVIDENCIAS) y guarda
    la ruta + fecha de cada una junto al item correspondiente.
  - Guarda la inspección completa (datos generales + las 5 secciones) en Neon
    con una sola llamada. El Inspector queda aprobado automáticamente con los
    datos de la info general (es quien diligencia el formulario); solo se
    generan links de aprobación para Jefe de Área y COPASST.
  - Responde 201 con el número de inspección y los links, o 400/500 con el detalle del error.

  Cómo interactúa:
  - Es registrado en app.js como handler de POST /enviar-onedrive-extintor.
  - Utiliza inspeccion.model.js para validación, subida de evidencias y guardado en Neon.
  - El frontend (inspeccion-sst.js) es quien construye y envía el FormData, y
    muestra los links de aprobación devueltos en el modal de éxito.
*/
const {
  validarInspeccion,
  uploadEvidenceToOneDrive,
  guardarInspeccionEnDB
} = require("../models/inspeccion.model");
const { resolverFechaEvidencia } = require("../utils/fechaEvidencia");


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

// Sube todas las fotos de un ítem a OneDrive, combina las rutas/nombres resultantes
// en un solo texto (una celda por ítem) y resuelve la fecha de la primera foto.
async function subirEvidenciasMultiples(files, prefix, tipoPrefijo, index, inspeccionId, body) {
  const archivos = obtenerArchivosMultiples(files, prefix, index);
  if (archivos.length === 0) return { ruta: "", nombre: "", fecha: null };

  const rutas = await Promise.all(
    archivos.map((file, subIdx) =>
      uploadEvidenceToOneDrive(file, tipoPrefijo, index + 1, inspeccionId, archivos.length > 1 ? subIdx + 1 : null)
    )
  );

  const rutasValidas = rutas.filter(Boolean);
  const lastmod = body?.[`${prefix}-${index}-0-lastmod`];
  const fecha = await resolverFechaEvidencia(archivos[0], lastmod);

  return {
    ruta: rutasValidas.join("\n"),
    nombre: rutasValidas.map((ruta) => ruta.split("/").pop() || "").join("\n"),
    fecha
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

  // Si llegamos aquí, la validación fue exitosa y podemos proceder a subir evidencias y guardar en Neon.
  try {
    const files = Array.isArray(req.files) ? req.files : [];
    const extintores = Array.isArray(validacion.data.extintores) ? validacion.data.extintores.map((extintor) => ({ ...extintor })) : [];
    const camillas = Array.isArray(validacion.data.camillas) ? validacion.data.camillas.map((camilla) => ({ ...camilla })) : [];
    const senalizaciones = Array.isArray(validacion.data.senalizaciones) ? validacion.data.senalizaciones.map((senalizacion) => ({ ...senalizacion })) : [];
    const equiposTecnologicos = Array.isArray(validacion.data.equiposTecnologicos) ? validacion.data.equiposTecnologicos.map((equipoTecnologico) => ({ ...equipoTecnologico })) : [];
    const botiquines = Array.isArray(validacion.data.botiquines) ? validacion.data.botiquines.map((botiquin) => ({ ...botiquin })) : [];

    // Subida de evidencias en paralelo (cada archivo tiene ruta única). La fecha
    // de cada evidencia se resuelve aquí (EXIF/lastModified) y queda guardada
    // junto al item, para no tener que reabrir el archivo al regenerar el PDF.
    const codigoInspeccion = validacion.data.general.inspeccionId;

    await Promise.all([
      ...extintores.map(async (extintor, i) => {
        const { ruta, nombre, fecha } = await subirEvidenciasMultiples(files, "evidencia", "EXT", i, codigoInspeccion, req.body);
        if (ruta) { extintor.evidenciaRuta = ruta; extintor.evidenciaArchivo = nombre; extintor.evidenciaFecha = fecha; }
      }),
      ...camillas.map(async (camilla, i) => {
        const { ruta, nombre, fecha } = await subirEvidenciasMultiples(files, "evidencia-camilla", "CAM", i, codigoInspeccion, req.body);
        if (ruta) { camilla.evidenciaRuta = ruta; camilla.evidenciaArchivo = nombre; camilla.evidenciaFecha = fecha; }
      }),
      ...senalizaciones.map(async (senalizacion, i) => {
        const { ruta, nombre, fecha } = await subirEvidenciasMultiples(files, "evidencia-senalizacion", "SEN", i, codigoInspeccion, req.body);
        if (ruta) { senalizacion.evidenciaRuta = ruta; senalizacion.evidenciaArchivo = nombre; senalizacion.evidenciaFecha = fecha; }
      }),
      ...equiposTecnologicos.map(async (equipo, i) => {
        const { ruta, nombre, fecha } = await subirEvidenciasMultiples(files, "equipo-tecnologico-evidencia", "EQT", i, codigoInspeccion, req.body);
        if (ruta) { equipo.evidenciaRuta = ruta; equipo.evidenciaArchivo = nombre; equipo.evidenciaFecha = fecha; }
      }),
      ...botiquines.map(async (botiquin, i) => {
        const { ruta, nombre, fecha } = await subirEvidenciasMultiples(files, "botiquin-evidencia", "BOT", i, codigoInspeccion, req.body);
        if (ruta) { botiquin.evidenciaRuta = ruta; botiquin.evidenciaArchivo = nombre; botiquin.evidenciaFecha = fecha; }
      }),
    ]);

    // Guardar la inspección completa en Neon (una sola llamada).
    const general = validacion.data.general;
    const resultado = await guardarInspeccionEnDB({
      general,
      extintores,
      camillas,
      senalizaciones,
      equiposTecnologicos,
      botiquines
    });

    // El Inspector ya quedó aprobado automáticamente (guardarInspeccionEnDB, con
    // los datos de la info general): solo hace falta enviar link a Jefe y COPASST.
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const links = {
      jefe: `${baseUrl}/aprobar/${resultado.tokens.jefe}`,
      copasst: `${baseUrl}/aprobar/${resultado.tokens.copasst}`
    };

    // Respuesta exitosa
    return res.status(201).json({
      ok: true,
      mensaje: "Inspección guardada. Comparte los links de aprobación con cada responsable.",
      inspeccionId: resultado.inspeccionId,
      numInspeccion: resultado.numInspeccion,
      links
    });
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : "Error guardando la inspección";

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
