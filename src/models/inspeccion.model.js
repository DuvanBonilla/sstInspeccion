/*
  inspeccion.model.js — Modelo principal de la inspección SST (capa de datos/negocio).

  Qué hace:
  - validarInspeccion(): valida el payload completo recibido del frontend.
    Delega la validación de cada sección a los modelos específicos:
      extintores.model.js, camillas.model.js, senalizaciones.model.js,
      equiposTecnologicos.model.js, botiquines.model.js
  - uploadEvidenceToOneDrive(): sube un archivo de imagen a la carpeta de
    evidencias en OneDrive usando Microsoft Graph API y devuelve la ruta.
  - appendMultipleRowsToOneDrive(): agrega múltiples filas a una tabla de
    Excel en OneDrive en una sola llamada HTTP.

  Cómo interactúa:
  - Es llamado exclusivamente por inspeccion.controller.js.
  - Requiere variables de entorno en .env:
      MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET,
      ONEDRIVE_USER_ID, ONEDRIVE_DRIVE_ID, ONEDRIVE_FOLDER_ID,
      ONEDRIVE_EXCEL_ID y los IDs de tabla de cada sección.
  - Importa los modelos de sección para normalización y validación.
*/
const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

// Caché de token OAuth (evita una llamada de autenticación por cada operación)
let _cachedToken = null;
let _tokenExpiresAt = 0;

// Caché de columnas por tabla (evita leer columnas en cada fila insertada)
const _columnsCache = new Map();
const {
  normalizarExtintores: normalizarExtintoresSeccion,
  validarExtintores
} = require("./extintores.model");
const {
  normalizarCamillas: normalizarCamillasSeccion,
  validarCamillas
} = require("./camillas.model");
const {
  normalizarSenalizaciones: normalizarSenalizacionesSeccion,
  validarSenalizaciones
} = require("./senalizaciones.model");
const {
  normalizarEquiposTecnologicos: normalizarEquiposTecnologicosSeccion,
  validarEquiposTecnologicos
} = require("./equiposTecnologicos.model");
const {
  normalizarBotiquines: normalizarBotiquinesSeccion,
  validarBotiquines
} = require("./botiquines.model");


// Campos de condición que se esperan en la sección de extintores.
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

// Normaliza un valor de texto: si no es string, devuelve "", si es string, lo trimmea.
function normalizarTexto(valor) {
  if (typeof valor !== "string") {
    return "";
  }

  return valor.trim();
}

// Obtiene una variable de entorno requerida y lanza error si no está definida.
function getRequiredEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Falta variable de entorno requerida: ${name}`);
  }

  return value;
}

// Solicita token app-only para consumir Microsoft Graph (con caché).
async function getAccessToken() {
  if (_cachedToken && Date.now() < _tokenExpiresAt - 30_000) {
    return _cachedToken;
  }

  const tenantId = getRequiredEnv("MS_TENANT_ID");
  const clientId = getRequiredEnv("MS_CLIENT_ID");
  const clientSecret = getRequiredEnv("MS_CLIENT_SECRET");

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "client_credentials",
    scope: "https://graph.microsoft.com/.default"
  });

  // Realiza la solicitud POST para obtener el token.
  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });

  // Lee la respuesta y parsea JSON.
  const data = await response.json();

  if (!response.ok || !data.access_token) {
    const detail = data?.error_description || data?.error || "No se pudo obtener token";
    throw new Error(`Error autenticando en Microsoft Graph: ${detail}`);
  }

  _cachedToken = data.access_token;
  _tokenExpiresAt = Date.now() + (data.expires_in || 3600) * 1000;
  return _cachedToken;
}

// Compara el tipo de extintor y retorna "SI" o "NO" según corresponda.
function tipoMarca(tipoSeleccionado, tipoColumna) {
  return tipoSeleccionado === tipoColumna ? "SI" : "NO";
}

// Extrae el año de una fecha en formato "YYYY-MM-DD" o devuelve el valor tal cual si no es fecha.
function extraerAnio(valor) {
  if (!valor) {
    return "";
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return valor.slice(0, 4);
  }

  return valor;
}

// Construye un mapa de valores normalizados para cada columna de Excel.
function buildExcelValueMap(registro) {
  const extintor = registro.extintor || {};
  const tipo = (extintor.tipo || "").toUpperCase();
  const condiciones = extintor.condiciones || {};
  const general = registro.general || {};
  const camilla = registro.camilla || {};
  const condicionesCamilla = camilla.condiciones || {};
  const senalizacion = registro.senalizacion || {};
  const equipoTecnologico = registro.equipoTecnologico || {};
  const botiquin = registro.botiquin || {};
  const botiquinItem = registro.botiquinItem || {};


  // Construye el objeto final con todos los campos requeridos para la fila de Excel.
  return {
    inspeccionId: general.inspeccionId || "",
    no: registro.no || general.no || "",
    fechaInspeccion: general.fecha || "",
    sedeOperacion: general.sedeOperacion || "",
    areaTrabajo: general.areaTrabajo || "",
    jefeResponsable: general.jefeResponsable || "",
    cargoJefe: general.cargoJefe || "",
    responsableInspeccion: general.responsableInspeccion || "",
    cargoResponsable: general.cargoResponsable || "",
    numeroDeExtintor: extintor.numero || "",
    ubicacionArea: extintor.ubicacion || "",
    tipoSolkaflan: tipoMarca(tipo, "SOLKAFLAM"),
    tipoCo2: tipoMarca(tipo, "CO2"),
    tipoMultiproposito: tipoMarca(tipo, "MULTIPROPOSITO"),
    tipoAgua: tipoMarca(tipo, "AGUA"),
    capacidad: extintor.capacidad || "",
    mesRecarga: extintor.mesRecarga || "",
    anoRecarga: extraerAnio(extintor.anioRecarga),
    acceso: condiciones.acceso,
    visibilidad: condiciones.visibilidad,
    senalizacion: condiciones.senalizacion,
    paredAltura: condiciones.paredAltura,
    piso: condiciones.piso,
    limpieza: condiciones.limpieza,
    rotulo: condiciones.rotulo,
    cilindro: condiciones.cilindro,
    manometro: condiciones.manometro,
    presion: condiciones.presion,
    pin: condiciones.pin,
    manguera: condiciones.manguera,
    boquilla: condiciones.boquilla,
    corneta: condiciones.corneta,
    pintura: condiciones.pintura,
    manija: condiciones.manija,
    sello: condiciones.sello,
    llaveSpanner: condiciones.llaveSpanner,
    otros: condiciones.otros,
    observaciones: extintor.observaciones || "",
    evidenciaArchivo: extintor.evidenciaArchivo || "",
    evidenciaRuta: extintor.evidenciaRuta || "",
    numeroCamilla: camilla.numero || "",
    ubicacionCamilla: camilla.ubicacion || "",
    senalizacionCamilla: condicionesCamilla.senalizacion || "",
    accesoCamilla: condicionesCamilla.acceso || "",
    estadoSoporteCamilla: condicionesCamilla.estadoSoporte || "",
    instalacionParedCamilla: condicionesCamilla.instalacionPared || "",
    correasSeguridadCamilla: condicionesCamilla.correasSeguridad || "",
    limpiezaCamilla: condicionesCamilla.limpieza || "",
    inmovilizadorCamilla: condicionesCamilla.inmovilizador || "",
    observacionesCamilla: camilla.observaciones || "",
    afectacionProductividadCamilla: camilla.afectacionProductividad || "",
    evidenciaCamilla: camilla.evidenciaArchivo || "",
    tipoSenalizacion: senalizacion.tipo || "",
    ubicacionSenalizacion: senalizacion.ubicacion || "",
    cantidadSenalizacion: senalizacion.cantidad || "",
    estadoSenalizacion: senalizacion.estado || "",
    aseoSenalizacion: senalizacion.aseo || "",
    observacionesSenalizacion: senalizacion.observaciones || "",
    evidenciaSenalizacion: senalizacion.evidenciaArchivo || "",
    equipoTecnologico: equipoTecnologico.equipoTecnologico || "",
    ubicacionTecnologica: equipoTecnologico.ubicacion || "",
    cantidadTecnologica: equipoTecnologico.cantidad || "",
    estadoTecnologico: equipoTecnologico.estado || "",
    mantenimientoTecnologico: equipoTecnologico.mantenimiento || "",
    observacionesTecnologicas: equipoTecnologico.observaciones || "",
    afectacionServicioTecnologica: equipoTecnologico.afectacionServicio || "",
    evidenciaTecnologica: equipoTecnologico.evidenciaArchivo || "",
    evidenciaRutaTecnologica: equipoTecnologico.evidenciaRuta || "",
    numeroBotiquin: botiquin.numero || "",
    ubicacionBotiquin: botiquin.ubicacion || "",
    noBotiquinItem: botiquinItem.no || "",
    itemBotiquin: botiquinItem.item || "",
    cantidadIdealBotiquin: botiquinItem.cantidadIdeal || "",
    cantidadRealBotiquin: botiquinItem.cantidadReal || "",
    integridadEmpaqueBotiquin: botiquinItem.integridadEmpaque || "",
    fechaVencimientoBotiquin: botiquinItem.fechaVencimiento || "",
    planIntervencionBotiquin: botiquinItem.planIntervencion || "",
    fechaIntervencionBotiquin: botiquinItem.fechaIntervencion || "",
    cumplimientoBotiquin: botiquinItem.cumplimiento || "",
    observacionesBotiquin: botiquin.observacionGeneral || botiquinItem.observaciones || "",
    afectacionServicioBotiquin: botiquinItem.afectacionServicio || "",
    evidenciaBotiquin: botiquin.evidenciaArchivo || botiquinItem.evidenciaArchivo || "",
    evidenciaRutaBotiquin: botiquin.evidenciaRuta || botiquinItem.evidenciaRuta || "",
    numInspeccion: registro.numInspeccion ?? ""
  };
}

// Normaliza el nombre de la columna para comparaciones (quita acentos, espacios y caracteres especiales).
function normalizeColumnName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();
}

// Mapea columnas reales de Excel a las claves internas del registro.
function buildExcelRow(tableColumns, registro, tableNameEnv) {
  const valueMap = buildExcelValueMap(registro);
  const aliasesBase = {
    inspeccionid: "inspeccionId",
    idinspeccion: "inspeccionId",
    numinspeccion: "numInspeccion",
    numeroinspeccion: "numInspeccion",
    no: "no",
    fecha: "fechaInspeccion",
    fechainspeccion: "fechaInspeccion",
    fechadeinspeccion: "fechaInspeccion",
    sede: "sedeOperacion",
    sedeoperacion: "sedeOperacion",
    sededeoperacion: "sedeOperacion",
    area: "areaTrabajo",
    areatrabajo: "areaTrabajo",
    areadetrabajo: "areaTrabajo",
    jeferesponsable: "jefeResponsable",
    nombrejefesresponsable: "jefeResponsable",
    nombredeljeferesponsable: "jefeResponsable",
    cargojefe: "cargoJefe",
    cargodeljefe: "cargoJefe",
    responsableinspeccion: "responsableInspeccion",
    responsabledelainspeccion: "responsableInspeccion",
    nombreresponsableinspeccion: "responsableInspeccion",
    nombredelresponsabledeinspeccion: "responsableInspeccion",
    cargoresponsable: "cargoResponsable",
    cargodelresponsable: "cargoResponsable",
    ndeextintor: "numeroDeExtintor",
    numerodeextintor: "numeroDeExtintor",
    ubicacionarea: "ubicacionArea",
    tiposolkaflan: "tipoSolkaflan",
    tiposolkaflam: "tipoSolkaflan",
    tipoco2: "tipoCo2",
    tipomultiproposito: "tipoMultiproposito",
    tipoagua: "tipoAgua",
    capacidad: "capacidad",
    mesrecarga: "mesRecarga",
    anorecarga: "anoRecarga",
    acceso: "acceso",
    visibilidad: "visibilidad",
    senalizacion: "senalizacion",
    paredaltura: "paredAltura",
    piso: "piso",
    limpieza: "limpieza",
    rotulo: "rotulo",
    cilindro: "cilindro",
    manometro: "manometro",
    presion: "presion",
    pin: "pin",
    manguera: "manguera",
    boquilla: "boquilla",
    corneta: "corneta",
    pintura: "pintura",
    manija: "manija",
    sello: "sello",
    llavespanner: "llaveSpanner",
    otros: "otros",
    observaciones: "observaciones",
    evidenciaarchivo: "evidenciaArchivo",
    evidenciaruta: "evidenciaRuta",
    ndecamilla: "numeroCamilla",
    numerodecamilla: "numeroCamilla",
    ubicacioncamilla: "ubicacionCamilla",
    senalizacioncamilla: "senalizacionCamilla",
    accesocamilla: "accesoCamilla",
    estadodelsoportecamilla: "estadoSoporteCamilla",
    instalacionaparedcamilla: "instalacionParedCamilla",
    correasdeseguridadcamilla: "correasSeguridadCamilla",
    limpiezacamilla: "limpiezaCamilla",
    inmovilizadorcamilla: "inmovilizadorCamilla",
    observacionescamilla: "observacionesCamilla",
    existeafectacionenlaproductividadcamilla: "afectacionProductividadCamilla",
    evidenciacamilla: "evidenciaCamilla"
  };

  // Mapeo de alias para la sección de señalización.
  const aliasesSenalizacion = {
    tipodesenalizacion: "tipoSenalizacion",
    ubicacion: "ubicacionSenalizacion",
    cantidad: "cantidadSenalizacion",
    estado: "estadoSenalizacion",
    aseo: "aseoSenalizacion",
    observaciones: "observacionesSenalizacion",
    observacionessenalizacion: "observacionesSenalizacion",
    evidenciasenalizacion: "evidenciaSenalizacion"
  };

  // Mapeo de alias para la sección de equipos tecnológicos.
  const aliasesTecnologicos = {
    no: "no",
    equipotecnologico: "equipoTecnologico",
    equipotecnologicodeatenciondeemergencia: "equipoTecnologico",
    ubicacion: "ubicacionTecnologica",
    cantidad: "cantidadTecnologica",
    estado: "estadoTecnologico",
    mantenimiento: "mantenimientoTecnologico",
    observaciones: "observacionesTecnologicas",
    afectacionalservicio: "afectacionServicioTecnologica",
    evidenciatecnologica: "evidenciaTecnologica",
    evidenciarutatecnologica: "evidenciaRutaTecnologica"
  };

  // Mapeo de alias para la sección de botiquines.
  const aliasesBotiquin = {
    no: "noBotiquinItem",
    noitem: "noBotiquinItem",
    nbotiquin: "numeroBotiquin",
    numerodebotiquin: "numeroBotiquin",
    ubicacion: "ubicacionBotiquin",
    ubicacionbotiquin: "ubicacionBotiquin",
    item: "itemBotiquin",
    cantidadideal: "cantidadIdealBotiquin",
    cantidadreal: "cantidadRealBotiquin",
    integridaddelempaque: "integridadEmpaqueBotiquin",
    integridadempaque: "integridadEmpaqueBotiquin",
    integridad: "integridadEmpaqueBotiquin",
    fechavencimiento: "fechaVencimientoBotiquin",
    plandeintervencion: "planIntervencionBotiquin",
    planintervencion: "planIntervencionBotiquin",
    fechaintervencion: "fechaIntervencionBotiquin",
    cumplimiento: "cumplimientoBotiquin",
    observaciones: "observacionesBotiquin",
    afectacionalservicio: "afectacionServicioBotiquin",
    evidenciabotiquin: "evidenciaBotiquin",
    evidencia: "evidenciaBotiquin",
    evidenciarutabotiquin: "evidenciaRutaBotiquin"
  };

  // Combina los alias base con los específicos según la tabla.
  const aliases = tableNameEnv === "ONEDRIVE_TABLE_NAME_SENALIZACION"
    ? { ...aliasesBase, ...aliasesSenalizacion }
    : tableNameEnv === "ONEDRIVE_TABLE_NAME_EQUIPO_TECNOLOGICO"
      ? { ...aliasesBase, ...aliasesTecnologicos }
    : tableNameEnv === "ONEDRIVE_TABLE_NAME_BOTIQUIN"
      ? { ...aliasesBase, ...aliasesBotiquin }
    : aliasesBase;

  return tableColumns.map((columnName) => {
    const normalized = normalizeColumnName(columnName);
    const key = aliases[normalized];
    return key ? valueMap[key] ?? "" : "";
  });
}

// Lee las filas existentes de una tabla y devuelve sus valores como arrays.
async function getTableRows(oneDriveUser, normalizedPath, tableName, token) {
  const url = `${GRAPH_BASE}/users/${encodeURIComponent(oneDriveUser)}/drive/root:${encodeURI(normalizedPath)}:/workbook/tables('${encodeURIComponent(tableName)}')/rows?$top=2000`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = {}; }
  if (!response.ok || !Array.isArray(data?.value)) return [];
  return data.value.map(r => (Array.isArray(r.values) && Array.isArray(r.values[0]) ? r.values[0] : []));
}

// A partir de filas existentes construye un mapa inspeccionId→numInspeccion y el máximo actual.
function buildSequenceMap(rows, idIdx, seqIdx) {
  const map = {};
  let max = 0;
  for (const row of rows) {
    const id = String(row[idIdx] ?? "").trim();
    const seq = Number(row[seqIdx]);
    if (id && Number.isFinite(seq) && seq > 0) {
      if (!map[id]) map[id] = seq;
      if (seq > max) max = seq;
    }
  }
  return { map, max };
}

// Lee las columnas de una tabla de Excel en OneDrive usando Microsoft Graph API.
async function getTableColumns(oneDriveUser, normalizedPath, tableName, token) {
  if (_columnsCache.has(tableName)) return _columnsCache.get(tableName);

  const url = `${GRAPH_BASE}/users/${encodeURIComponent(oneDriveUser)}/drive/root:${encodeURI(normalizedPath)}:/workbook/tables('${encodeURIComponent(tableName)}')/columns`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const text = await response.text();
  let data;

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    const detail = data?.error?.message || data?.raw || "No se pudieron leer las columnas de la tabla";
    throw new Error(`Error OneDrive/Graph leyendo columnas: ${detail}`);
  }

  const columns = Array.isArray(data?.value) ? data.value.map((column) => column.name) : [];
  _columnsCache.set(tableName, columns);
  return columns;
}

// Valida datos de formulario y retorna una salida normalizada para controlador.
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
  if (!jefeResponsable) errores.push("Nombre del jefe responsable es obligatorio");
  if (!cargoJefe) errores.push("Cargo del jefe es obligatorio");
  if (!responsableInspeccion) errores.push("Nombre del responsable de inspeccion es obligatorio");
  if (!cargoResponsable) errores.push("Cargo del responsable es obligatorio");


  // Normaliza cada sección del payload para validación.
  const extintores = normalizarExtintoresSeccion(payload);
  const camillas = normalizarCamillasSeccion(payload);
  const senalizaciones = normalizarSenalizacionesSeccion(payload);
  const equiposTecnologicos = normalizarEquiposTecnologicosSeccion(payload);
  const botiquines = normalizarBotiquinesSeccion(payload);

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

  // Valida cada sección y acumula errores.
  const extintoresValidados = validarExtintores(extintores, errores);
  const camillasValidadas = validarCamillas(camillas, errores);
  const senalizacionesValidadas = validarSenalizaciones(senalizaciones, errores);
  const equiposTecnologicosValidados = validarEquiposTecnologicos(equiposTecnologicos, errores);
  const botiquinesValidados = validarBotiquines(botiquines, errores);

  // Retorna errores si los hay, o la data normalizada.
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
        cargoResponsable
      },
      extintores: extintoresValidados,
      camillas: camillasValidadas,
      camilla: camillasValidadas[0] || null,
      senalizaciones: senalizacionesValidadas,
      senalizacion: senalizacionesValidadas[0] || null,
      equiposTecnologicos: equiposTecnologicosValidados,
      equipoTecnologico: equiposTecnologicosValidados[0] || null,
      botiquines: botiquinesValidados,
      botiquin: botiquinesValidados[0] || null
    }
  };
}

// Limpia el nombre del archivo para que sea seguro usarlo en OneDrive.
function limpiarNombreArchivo(valor) {
  return String(valor || "").replace(/[^a-zA-Z0-9._-]/g, "_");
}

function getEvidenceFolderPath() {
  const configuredPath = process.env.ONEDRIVE_EVIDENCIAS_PATH;

  if (configuredPath) {
    return configuredPath.startsWith("/") ? configuredPath : `/${configuredPath}`;
  }

  const excelPath = getRequiredEnv("ONEDRIVE_EXCEL_PATH");
  const normalizedExcelPath = excelPath.startsWith("/") ? excelPath : `/${excelPath}`;
  const lastSlashIndex = normalizedExcelPath.lastIndexOf("/");
  const parentPath = lastSlashIndex > 0 ? normalizedExcelPath.slice(0, lastSlashIndex) : "";

  return `${parentPath}/EVIDENCIAS`;
}

// Extrae el código aleatorio del inspeccionId (ej: "INSP-20250630-K7X9" → "K7X9").
function extraerCodigoInspeccion(inspeccionId) {
  const partes = String(inspeccionId || "").split("-");
  return limpiarNombreArchivo(partes[partes.length - 1] || "") || "SINCOD";
}

// Carga la evidencia del formulario a OneDrive y retorna la ruta creada.
// Nombre del archivo: {PREFIJO}_{indice}_{codigoInspeccion}.ext (ej: EXT_1_K7X9.jpg).
// Si se pasa subIndice (item con más de una foto), se agrega al nombre: {PREFIJO}_{indice}_{subIndice}_{codigoInspeccion}.ext.
async function uploadEvidenceToOneDrive(file, prefijo, indice, inspeccionId, subIndice = null) {
  if (!file) {
    return "";
  }

  const oneDriveUser = getRequiredEnv("ONEDRIVE_USER_ID");
  const token = await getAccessToken();
  const evidenceFolderPath = getEvidenceFolderPath();
  const extension = pathExtension(file.originalname);
  const codigoInspeccion = extraerCodigoInspeccion(inspeccionId);
  const fileName = subIndice != null
    ? `${prefijo}_${indice}_${subIndice}_${codigoInspeccion}${extension}`
    : `${prefijo}_${indice}_${codigoInspeccion}${extension}`;
  const evidencePath = `${evidenceFolderPath}/${fileName}`;
  const url = `${GRAPH_BASE}/users/${encodeURIComponent(oneDriveUser)}/drive/root:${encodeURI(evidencePath)}:/content?@microsoft.graph.conflictBehavior=replace`;

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": file.mimetype || "application/octet-stream"
    },
    body: file.buffer
  });

  const text = await response.text();
  let data;

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    const detail = data?.error?.message || data?.raw || "No se pudo subir la evidencia";
    throw new Error(`Error OneDrive/Graph al subir evidencia: ${detail}`);
  }

  return evidencePath;
}

// Extrae la extensión del archivo y la limpia para usarla en el nombre del archivo en OneDrive.
function pathExtension(fileName) {
  const safeName = String(fileName || "");
  const lastDotIndex = safeName.lastIndexOf(".");

  if (lastDotIndex === -1) {
    return "";
  }

  return limpiarNombreArchivo(safeName.slice(lastDotIndex));
}

// Agrega múltiples filas a una tabla de Excel en una sola llamada HTTP.
// forcedNumInspeccion: si se pasa, se usa directamente sin leer filas existentes (optimización).
async function appendMultipleRowsToOneDrive(inspecciones, tableNameEnv, forcedNumInspeccion = null) {
  if (!inspecciones.length) return;

  const oneDriveUser = getRequiredEnv("ONEDRIVE_USER_ID");
  const excelPath = getRequiredEnv("ONEDRIVE_EXCEL_PATH");
  const tableName = getRequiredEnv(tableNameEnv);
  const normalizedPath = excelPath.startsWith("/") ? excelPath : `/${excelPath}`;
  const token = await getAccessToken();
  const tableColumns = await getTableColumns(oneDriveUser, normalizedPath, tableName, token);
  const url = `${GRAPH_BASE}/users/${encodeURIComponent(oneDriveUser)}/drive/root:${encodeURI(normalizedPath)}:/workbook/tables('${encodeURIComponent(tableName)}')/rows/add`;

  // Si la tabla tiene columna NumInspeccion, asignar secuencia.
  let sequenceMap = null;
  const seqColIdx = tableColumns.findIndex(c => normalizeColumnName(c) === "numinspeccion" || normalizeColumnName(c) === "numeroinspeccion");
  if (seqColIdx !== -1) {
    if (forcedNumInspeccion != null) {
      // Secuencia ya calculada: asignarla directamente sin leer filas
      sequenceMap = {};
      for (const insp of inspecciones) {
        const id = String(insp.general?.inspeccionId || "").trim();
        if (id) sequenceMap[id] = forcedNumInspeccion;
      }
    } else {
      const idColIdx = tableColumns.findIndex(c => {
        const n = normalizeColumnName(c);
        return n === "inspeccionid" || n === "idinspeccion";
      });
      if (idColIdx !== -1) {
        const existingRows = await getTableRows(oneDriveUser, normalizedPath, tableName, token);
        const { map, max } = buildSequenceMap(existingRows, idColIdx, seqColIdx);
        let next = max;
        sequenceMap = {};
        for (const insp of inspecciones) {
          const id = String(insp.general?.inspeccionId || "").trim();
          if (!id) continue;
          if (map[id]) {
            sequenceMap[id] = map[id];
          } else if (!sequenceMap[id]) {
            next += 1;
            sequenceMap[id] = next;
            map[id] = next;
          }
        }
      }
    }
  }

  const values = inspecciones.map(inspeccion => {
    const id = String(inspeccion.general?.inspeccionId || "").trim();
    const withSeq = sequenceMap && id ? { ...inspeccion, numInspeccion: sequenceMap[id] ?? "" } : inspeccion;
    return buildExcelRow(tableColumns, withSeq, tableNameEnv);
  });

  const firstId = String(inspecciones[0]?.general?.inspeccionId || "").trim();
  const resolvedNumInspeccion = (sequenceMap && firstId) ? (sequenceMap[firstId] ?? null) : null;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ values })
  });

  const text = await response.text();
  let data;

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    const detail = data?.error?.message || data?.raw || "No se pudieron anexar las filas en Excel";
    throw new Error(`Error OneDrive/Graph: ${detail}`);
  }

  return { ...data, resolvedNumInspeccion };
}

// Exporta funciones y constantes para uso en el controlador.
module.exports = {
  CAMPOS_CONDICION,
  validarInspeccion,
  appendMultipleRowsToOneDrive,
  uploadEvidenceToOneDrive
};
