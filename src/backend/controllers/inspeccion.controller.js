const {
  uploadEvidenceToOneDrive,
  guardarInspeccionEnDB,
  obtenerLinksInspeccion,
} = require("../models/inspeccion.model");
const { validarInspeccion } = require("../validators/inspeccion.validator");
const { resolverFechaEvidencia } = require("../utils/fechaEvidencia");

function leerPayload(req) {
  if (typeof req.body?.payload === "string") {
    return JSON.parse(req.body.payload);
  }

  return req.body;
}

function obtenerArchivosMultiples(files, prefix, index) {
  const patron = new RegExp(`^${prefix}-${index}-(\\d+)$`);
  return files
    .map((file) => ({ file, match: patron.exec(file.fieldname || "") }))
    .filter((x) => x.match)
    .sort((a, b) => Number(a.match[1]) - Number(b.match[1]))
    .map((x) => x.file);
}

async function subirEvidenciasMultiples(
  files,
  prefix,
  tipoPrefijo,
  index,
  inspeccionId,
  body,
) {
  const archivos = obtenerArchivosMultiples(files, prefix, index);
  if (archivos.length === 0) return { ruta: "", nombre: "", fecha: null };

  const rutas = await Promise.all(
    archivos.map((file, subIdx) =>
      uploadEvidenceToOneDrive(
        file,
        tipoPrefijo,
        index + 1,
        inspeccionId,
        archivos.length > 1 ? subIdx + 1 : null,
      ),
    ),
  );

  const rutasValidas = rutas.filter(Boolean);
  const lastmod = body?.[`${prefix}-${index}-0-lastmod`];
  const fecha = await resolverFechaEvidencia(archivos[0], lastmod);

  return {
    ruta: rutasValidas.join("\n"),
    nombre: rutasValidas.map((ruta) => ruta.split("/").pop() || "").join("\n"),
    fecha,
  };
}

async function enviarExtintorOneDrive(req, res) {
  let payload;

  try {
    payload = leerPayload(req);
  } catch {
    return res.status(400).json({
      ok: false,
      errores: ["No fue posible leer los datos del formulario"],
    });
  }

  const validacion = validarInspeccion(payload);

  // Si la validación falla, respondemos con un 400 y los errores.
  if (!validacion.ok) {
    return res.status(400).json({
      ok: false,
      errores: validacion.errores,
    });
  }

  // Si llegamos aquí, la validación fue exitosa y podemos proceder a subir evidencias y guardar en Neon.
  try {
    const files = Array.isArray(req.files) ? req.files : [];
    const extintores = Array.isArray(validacion.data.extintores)
      ? validacion.data.extintores.map((extintor) => ({ ...extintor }))
      : [];
    const camillas = Array.isArray(validacion.data.camillas)
      ? validacion.data.camillas.map((camilla) => ({ ...camilla }))
      : [];
    const senalizaciones = Array.isArray(validacion.data.senalizaciones)
      ? validacion.data.senalizaciones.map((senalizacion) => ({
          ...senalizacion,
        }))
      : [];
    const equiposTecnologicos = Array.isArray(
      validacion.data.equiposTecnologicos,
    )
      ? validacion.data.equiposTecnologicos.map((equipoTecnologico) => ({
          ...equipoTecnologico,
        }))
      : [];
    const botiquines = Array.isArray(validacion.data.botiquines)
      ? validacion.data.botiquines.map((botiquin) => ({ ...botiquin }))
      : [];

    // Subida de evidencias en paralelo (cada archivo tiene ruta única). La fecha
    // de cada evidencia se resuelve aquí (EXIF/lastModified) y queda guardada
    // junto al item, para no tener que reabrir el archivo al regenerar el PDF.
    const codigoInspeccion = validacion.data.general.inspeccionId;

    await Promise.all([
      ...extintores.map(async (extintor, i) => {
        const { ruta, nombre, fecha } = await subirEvidenciasMultiples(
          files,
          "evidencia",
          "EXT",
          i,
          codigoInspeccion,
          req.body,
        );
        if (ruta) {
          extintor.evidenciaRuta = ruta;
          extintor.evidenciaArchivo = nombre;
          extintor.evidenciaFecha = fecha;
        }
      }),
      ...camillas.map(async (camilla, i) => {
        const { ruta, nombre, fecha } = await subirEvidenciasMultiples(
          files,
          "evidencia-camilla",
          "CAM",
          i,
          codigoInspeccion,
          req.body,
        );
        if (ruta) {
          camilla.evidenciaRuta = ruta;
          camilla.evidenciaArchivo = nombre;
          camilla.evidenciaFecha = fecha;
        }
      }),
      ...senalizaciones.map(async (senalizacion, i) => {
        const { ruta, nombre, fecha } = await subirEvidenciasMultiples(
          files,
          "evidencia-senalizacion",
          "SEN",
          i,
          codigoInspeccion,
          req.body,
        );
        if (ruta) {
          senalizacion.evidenciaRuta = ruta;
          senalizacion.evidenciaArchivo = nombre;
          senalizacion.evidenciaFecha = fecha;
        }
      }),
      ...equiposTecnologicos.map(async (equipo, i) => {
        const { ruta, nombre, fecha } = await subirEvidenciasMultiples(
          files,
          "equipo-tecnologico-evidencia",
          "EQT",
          i,
          codigoInspeccion,
          req.body,
        );
        if (ruta) {
          equipo.evidenciaRuta = ruta;
          equipo.evidenciaArchivo = nombre;
          equipo.evidenciaFecha = fecha;
        }
      }),
      ...botiquines.map(async (botiquin, i) => {
        const { ruta, nombre, fecha } = await subirEvidenciasMultiples(
          files,
          "botiquin-evidencia",
          "BOT",
          i,
          codigoInspeccion,
          req.body,
        );
        if (ruta) {
          botiquin.evidenciaRuta = ruta;
          botiquin.evidenciaArchivo = nombre;
          botiquin.evidenciaFecha = fecha;
        }
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
      botiquines,
    });

    // El Inspector ya quedó aprobado automáticamente (guardarInspeccionEnDB, con
    // los datos de la info general): solo hace falta enviar link a Jefe y COPASST.
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const links = {
      jefe: `${baseUrl}/aprobar/${resultado.tokens.jefe}`,
      copasst: `${baseUrl}/aprobar/${resultado.tokens.copasst}`,
    };

    // Respuesta exitosa
    return res.status(201).json({
      ok: true,
      mensaje:
        "Inspección guardada. Comparte los links de aprobación con cada responsable.",
      inspeccionId: resultado.inspeccionId,
      numInspeccion: resultado.numInspeccion,
      links,
    });
  } catch (error) {
    console.error("Error enviando inspección SST:", error);

    if (error?.cause) {
      console.error("Causa:", error.cause);
    }

    const mensaje =
      error instanceof Error ? error.message : "Error guardando la inspección";

    return res.status(500).json({
      ok: false,
      errores: [mensaje],
    });
  }
}

async function obtenerLinks(req, res) {
  try {
    const { id } = req.params;

    const data = await obtenerLinksInspeccion(id);

    if (!data) {
      return res.status(404).json({
        ok: false,
        message: "Inspección no encontrada",
      });
    }

    return res.json({
      ok: true,
      ...data,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      ok: false,
      message: err.message,
    });
  }
}
// Exportación del controlador para que pueda ser usado en app.js
module.exports = {
  enviarExtintorOneDrive,
  obtenerLinks,
};
