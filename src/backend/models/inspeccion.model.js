/*
  inspeccion.model.js — Modelo principal de la inspección SST (capa de datos/negocio).

  Qué hace:
  - validarInspeccion(): valida el payload completo recibido del frontend.
    Delega la validación de cada sección a los modelos específicos:
      extintores.model.js, camillas.model.js, senalizaciones.model.js,
      equiposTecnologicos.model.js, botiquines.model.js
  - uploadEvidenceToOneDrive(): sube un archivo de imagen a la carpeta de
    evidencias en OneDrive usando Microsoft Graph API y devuelve la ruta.
  - descargarEvidenciaOneDrive(): descarga el contenido de una evidencia ya
    subida (se usa al regenerar el PDF una vez las 3 aprobaciones están completas).
  - guardarInspeccionEnDB(): guarda la inspección completa en Neon (Postgres):
    la fila general en `inspecciones` y cada sección en su propia tabla
    (extintores, camillas, senalizaciones, equipos_tecnologicos, botiquines +
    botiquin_items), todo en una transacción. Devuelve el número de inspección
    y los tokens de aprobación generados.
  - obtenerInspeccionCompleta(): reconstruye una inspección completa (fila
    general + las 5 secciones) desde esas tablas, en la misma forma anidada
    que espera el generador de PDF. Se usa al completar las 3 aprobaciones.

  Cómo interactúa:
  - Es llamado por inspeccion.controller.js y aprobaciones.controller.js.
  - Requiere variables de entorno en .env:
      MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET, ONEDRIVE_USER_ID,
      ONEDRIVE_EXCEL_PATH (solo para ubicar la carpeta de evidencias), DATABASE_URL.
  - Importa los modelos de sección para normalización y validación.
  - La data estructurada de cada inspección vive en Neon (varias tablas,
    ver backend/db/migrate.js); OneDrive queda solo para los binarios (fotos de
    evidencia y PDF final).
*/
const GRAPH_BASE = "https://graph.microsoft.com/v1.0";
const { query, pool } = require("../db/pool");

// Caché de token OAuth (evita una llamada de autenticación por cada operación)
let _cachedToken = null;
let _tokenExpiresAt = 0;

const {
  normalizarExtintores: normalizarExtintoresSeccion,
  validarExtintores,
} = require("./extintores.model");
const {
  normalizarCamillas: normalizarCamillasSeccion,
  validarCamillas,
} = require("./camillas.model");
const {
  normalizarSenalizaciones: normalizarSenalizacionesSeccion,
  validarSenalizaciones,
} = require("./senalizaciones.model");
const {
  normalizarEquiposTecnologicos: normalizarEquiposTecnologicosSeccion,
  validarEquiposTecnologicos,
} = require("./equiposTecnologicos.model");
const {
  normalizarBotiquines: normalizarBotiquinesSeccion,
  validarBotiquines,
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
  "otros",
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
    scope: "https://graph.microsoft.com/.default",
  });

  // Realiza la solicitud POST para obtener el token.
  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  // Lee la respuesta y parsea JSON.
  const data = await response.json();

  if (!response.ok || !data.access_token) {
    const detail =
      data?.error_description || data?.error || "No se pudo obtener token";
    throw new Error(`Error autenticando en Microsoft Graph: ${detail}`);
  }

  _cachedToken = data.access_token;
  _tokenExpiresAt = Date.now() + (data.expires_in || 3600) * 1000;
  return _cachedToken;
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
  if (!jefeResponsable)
    errores.push("Nombre del jefe responsable es obligatorio");
  if (!cargoJefe) errores.push("Cargo del jefe es obligatorio");
  if (!responsableInspeccion)
    errores.push("Nombre del responsable de inspeccion es obligatorio");
  if (!cargoResponsable) errores.push("Cargo del responsable es obligatorio");

  // Normaliza cada sección del payload para validación.
  const extintores = normalizarExtintoresSeccion(payload);
  const camillas = normalizarCamillasSeccion(payload);
  const senalizaciones = normalizarSenalizacionesSeccion(payload);
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
  const extintoresValidados = validarExtintores(extintores, errores);
  const camillasValidadas = validarCamillas(camillas, errores);
  const senalizacionesValidadas = validarSenalizaciones(
    senalizaciones,
    errores,
  );
  const equiposTecnologicosValidados = validarEquiposTecnologicos(
    equiposTecnologicos,
    errores,
  );
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
        cargoResponsable,
      },
      extintores: extintoresValidados,
      camillas: camillasValidadas,
      camilla: camillasValidadas[0] || null,
      senalizaciones: senalizacionesValidadas,
      senalizacion: senalizacionesValidadas[0] || null,
      equiposTecnologicos: equiposTecnologicosValidados,
      equipoTecnologico: equiposTecnologicosValidados[0] || null,
      botiquines: botiquinesValidados,
      botiquin: botiquinesValidados[0] || null,
    },
  };
}

// Limpia el nombre del archivo para que sea seguro usarlo en OneDrive.
function limpiarNombreArchivo(valor) {
  return String(valor || "").replace(/[^a-zA-Z0-9._-]/g, "_");
}

function getEvidenceFolderPath() {
  const configuredPath = process.env.ONEDRIVE_EVIDENCIAS_PATH;

  if (configuredPath) {
    return configuredPath.startsWith("/")
      ? configuredPath
      : `/${configuredPath}`;
  }

  const excelPath = getRequiredEnv("ONEDRIVE_EXCEL_PATH");
  const normalizedExcelPath = excelPath.startsWith("/")
    ? excelPath
    : `/${excelPath}`;
  const lastSlashIndex = normalizedExcelPath.lastIndexOf("/");
  const parentPath =
    lastSlashIndex > 0 ? normalizedExcelPath.slice(0, lastSlashIndex) : "";

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
async function uploadEvidenceToOneDrive(
  file,
  prefijo,
  indice,
  inspeccionId,
  subIndice = null,
) {
  if (!file) {
    return "";
  }

  const oneDriveUser = getRequiredEnv("ONEDRIVE_USER_ID");
  const token = await getAccessToken();
  const evidenceFolderPath = getEvidenceFolderPath();
  const extension = pathExtension(file.originalname);
  const codigoInspeccion = extraerCodigoInspeccion(inspeccionId);
  const fileName =
    subIndice != null
      ? `${prefijo}_${indice}_${subIndice}_${codigoInspeccion}${extension}`
      : `${prefijo}_${indice}_${codigoInspeccion}${extension}`;
  const evidencePath = `${evidenceFolderPath}/${fileName}`;
  const url = `${GRAPH_BASE}/users/${encodeURIComponent(oneDriveUser)}/drive/root:${encodeURI(evidencePath)}:/content?@microsoft.graph.conflictBehavior=replace`;

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": file.mimetype || "application/octet-stream",
    },
    body: file.buffer,
  });

  const text = await response.text();
  let data;

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    const detail =
      data?.error?.message || data?.raw || "No se pudo subir la evidencia";
    throw new Error(`Error OneDrive/Graph al subir evidencia: ${detail}`);
  }

  return evidencePath;
}

// Descarga una evidencia ya subida a OneDrive por su ruta. Devuelve un Buffer o null si falla.
// Se usa solo al regenerar el PDF final, una vez las 3 firmas están completas.
async function descargarEvidenciaOneDrive(evidencePath) {
  if (!evidencePath) {
    return null;
  }

  const oneDriveUser = getRequiredEnv("ONEDRIVE_USER_ID");
  const token = await getAccessToken();
  const normalizedPath = evidencePath.startsWith("/")
    ? evidencePath
    : `/${evidencePath}`;
  const url = `${GRAPH_BASE}/users/${encodeURIComponent(oneDriveUser)}/drive/root:${encodeURI(normalizedPath)}:/content`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    return null;
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
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

// Guarda la inspección completa: la fila general en `inspecciones` y cada
// sección en su propia tabla (extintores, camillas, senalizaciones,
// equipos_tecnologicos, botiquines + botiquin_items), todas con FK a la
// inspección. El Inspector queda aprobado de una vez (nombre de la
// info general); Jefe y COPASST aprueban después con su link. Todo dentro de
// una transacción: o se guarda completa, o no se guarda nada. Devuelve el
// número de inspección (autoincremental, sin condición de carrera) y los 3
// tokens (el de inspector no se usa como link, pero queda en la fila).
async function guardarInspeccionEnDB(data) {
  const general = data?.general || {};
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // El Inspector es quien diligencia el formulario: su aprobación queda
    // registrada de una vez con los datos de la info general (nombre),
    // sin necesidad de generarle un link aparte como a Jefe de Área y COPASST.
    const { rows } = await client.query(
      `INSERT INTO inspecciones (
        inspeccion_id, fecha, sede_operacion, area_trabajo,
        jefe_responsable, cargo_jefe, responsable_inspeccion, cargo_responsable,
        aprobacion_inspector_nombre, aprobacion_inspector_cedula, aprobacion_inspector_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())
      RETURNING id, num_inspeccion, token_inspector, token_jefe, token_copasst`,
      [
        general.inspeccionId || "",
        general.fecha || "",
        general.sedeOperacion || "",
        general.areaTrabajo || "",
        general.jefeResponsable || "",
        general.cargoJefe || "",
        general.responsableInspeccion || "",
        general.cargoResponsable || "",
        general.responsableInspeccion || "",
        "",
      ],
    );
    const inspeccion = rows[0];
    const pk = inspeccion.id;

    for (const [idx, e] of (data?.extintores || []).entries()) {
      await client.query(
        `INSERT INTO extintores (inspeccion_pk, idx, numero, ubicacion, tipo, capacidad, mes_recarga, ano_recarga, observaciones, evidencia_ruta, evidencia_archivo, evidencia_fecha, condiciones)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [
          pk,
          idx,
          e.numero || "",
          e.ubicacion || "",
          e.tipo || "",
          e.capacidad || "",
          e.mesRecarga || "",
          e.anioRecarga || "",
          e.observaciones || "",
          e.evidenciaRuta || "",
          e.evidenciaArchivo || "",
          e.evidenciaFecha || null,
          JSON.stringify(e.condiciones || {}),
        ],
      );
    }

    for (const [idx, c] of (data?.camillas || []).entries()) {
      await client.query(
        `INSERT INTO camillas (inspeccion_pk, idx, numero, ubicacion, observaciones, afectacion_productividad, evidencia_ruta, evidencia_archivo, evidencia_fecha, condiciones)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          pk,
          idx,
          c.numero || "",
          c.ubicacion || "",
          c.observaciones || "",
          c.afectacionProductividad || "",
          c.evidenciaRuta || "",
          c.evidenciaArchivo || "",
          c.evidenciaFecha || null,
          JSON.stringify(c.condiciones || {}),
        ],
      );
    }

    for (const [idx, s] of (data?.senalizaciones || []).entries()) {
      await client.query(
        `INSERT INTO senalizaciones (inspeccion_pk, idx, tipo, ubicacion, cantidad, estado, aseo, observaciones, evidencia_ruta, evidencia_archivo, evidencia_fecha)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          pk,
          idx,
          s.tipo || "",
          s.ubicacion || "",
          s.cantidad || "",
          s.estado || "",
          s.aseo || "",
          s.observaciones || "",
          s.evidenciaRuta || "",
          s.evidenciaArchivo || "",
          s.evidenciaFecha || null,
        ],
      );
    }

    for (const [idx, eq] of (data?.equiposTecnologicos || []).entries()) {
      await client.query(
        `INSERT INTO equipos_tecnologicos (inspeccion_pk, idx, no, equipo_tecnologico, ubicacion, cantidad, estado, mantenimiento, observaciones, afectacion_servicio, evidencia_ruta, evidencia_archivo, evidencia_fecha)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [
          pk,
          idx,
          eq.no || "",
          eq.equipoTecnologico || "",
          eq.ubicacion || "",
          eq.cantidad || "",
          eq.estado || "",
          eq.mantenimiento || "",
          eq.observaciones || "",
          eq.afectacionServicio || "",
          eq.evidenciaRuta || "",
          eq.evidenciaArchivo || "",
          eq.evidenciaFecha || null,
        ],
      );
    }

    for (const [idx, b] of (data?.botiquines || []).entries()) {
      const { rows: botRows } = await client.query(
        `INSERT INTO botiquines (inspeccion_pk, idx, numero, ubicacion, observacion_general, evidencia_ruta, evidencia_archivo, evidencia_fecha)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
        [
          pk,
          idx,
          b.numero || "",
          b.ubicacion || "",
          b.observacionGeneral || "",
          b.evidenciaRuta || "",
          b.evidenciaArchivo || "",
          b.evidenciaFecha || null,
        ],
      );
      const botiquinId = botRows[0].id;

      for (const [itemIdx, item] of (b.items || []).entries()) {
        await client.query(
          `INSERT INTO botiquin_items (botiquin_id, idx, no, item, cantidad_ideal, cantidad_real, integridad_empaque, fecha_vencimiento, plan_intervencion, fecha_intervencion, cumplimiento, observaciones, afectacion_servicio)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
          [
            botiquinId,
            itemIdx,
            item.no || "",
            item.item || "",
            item.cantidadIdeal || "",
            item.cantidadReal || "",
            item.integridadEmpaque || "",
            item.fechaVencimiento || "",
            item.planIntervencion || "",
            item.fechaIntervencion || "",
            item.cumplimiento || "",
            item.observaciones || "",
            item.afectacionServicio || "",
          ],
        );
      }
    }

    await client.query("COMMIT");

    return {
      inspeccionId: general.inspeccionId || "",
      numInspeccion: Number(inspeccion.num_inspeccion),
      tokens: {
        inspector: inspeccion.token_inspector,
        jefe: inspeccion.token_jefe,
        copasst: inspeccion.token_copasst,
      },
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// Lee una inspección completa desde Neon (fila general + las 5 secciones,
// reconstruidas en la misma forma anidada que usa el generador de PDF).
// Se usa al completar las 3 firmas, para regenerar el PDF sin depender del
// request original de envío. Devuelve null si no existe.
async function obtenerInspeccionCompleta(inspeccionId) {
  const { rows } = await query(
    `SELECT * FROM inspecciones WHERE inspeccion_id = $1`,
    [inspeccionId],
  );

  const inspeccion = rows[0];

  if (!inspeccion) {
    return null;
  }

  const pk = inspeccion.id;

  /* =====================================================
     INSPECCIÓN EPP
  ===================================================== */

  if (inspeccion.tipo_inspeccion === "EPP") {
    const { rows: trabajadoresRows } = await query(
      `
      SELECT *
      FROM trabajadores_epp
      WHERE inspeccion_pk = $1
      ORDER BY idx
      `,
      [pk],
    );

    const trabajadores = await Promise.all(
      trabajadoresRows.map(async (trabajador) => {
        const { rows: evaluacionesRows } = await query(
          `
          SELECT *
          FROM evaluaciones_epp
          WHERE trabajador_epp_id = $1
          ORDER BY idx
          `,
          [trabajador.id],
        );

        return {
          id: trabajador.id,
          idx: trabajador.idx,

          nombre: trabajador.nombre || "",
          codigo: trabajador.codigo || "",
          cargo: trabajador.cargo || "",

          planAccion: trabajador.plan_accion || "",
          observaciones: trabajador.observaciones || "",

          evidenciaRuta: trabajador.evidencia_ruta || "",
          evidenciaArchivo: trabajador.evidencia_archivo || "",
          evidenciaFecha: trabajador.evidencia_fecha || null,

          elementos: evaluacionesRows.map((evaluacion) => ({
            idx: evaluacion.idx,
            elemento: evaluacion.elemento || "",
            condicion: evaluacion.condicion || "",
            uso: evaluacion.uso || "",
          })),
        };
      }),
    );

    return {
      inspeccion,
      tipoInspeccion: "EPP",
      trabajadores,
    };
  }

  /* =====================================================
     INSPECCIÓN SST
     Se mantiene el comportamiento actual
  ===================================================== */

  const [extRes, camRes, senRes, eqpRes, botRes] = await Promise.all([
    query(
      `SELECT * FROM extintores
         WHERE inspeccion_pk = $1
         ORDER BY idx`,
      [pk],
    ),

    query(
      `SELECT * FROM camillas
         WHERE inspeccion_pk = $1
         ORDER BY idx`,
      [pk],
    ),

    query(
      `SELECT * FROM senalizaciones
         WHERE inspeccion_pk = $1
         ORDER BY idx`,
      [pk],
    ),

    query(
      `SELECT * FROM equipos_tecnologicos
         WHERE inspeccion_pk = $1
         ORDER BY idx`,
      [pk],
    ),

    query(
      `SELECT * FROM botiquines
         WHERE inspeccion_pk = $1
         ORDER BY idx`,
      [pk],
    ),
  ]);

  const botiquines = await Promise.all(
    botRes.rows.map(async (b) => {
      const { rows: items } = await query(
        `
        SELECT *
        FROM botiquin_items
        WHERE botiquin_id = $1
        ORDER BY idx
        `,
        [b.id],
      );

      return {
        numero: b.numero || "",
        ubicacion: b.ubicacion || "",
        observacionGeneral: b.observacion_general || "",
        evidenciaRuta: b.evidencia_ruta || "",
        evidenciaArchivo: b.evidencia_archivo || "",
        evidenciaFecha: b.evidencia_fecha || null,

        items: items.map((it) => ({
          no: it.no || "",
          item: it.item || "",
          cantidadIdeal: it.cantidad_ideal || "",
          cantidadReal: it.cantidad_real || "",
          integridadEmpaque: it.integridad_empaque || "",
          fechaVencimiento: it.fecha_vencimiento || "",
          planIntervencion: it.plan_intervencion || "",
          fechaIntervencion: it.fecha_intervencion || "",
          cumplimiento: it.cumplimiento || "",
          observaciones: it.observaciones || "",
          afectacionServicio: it.afectacion_servicio || "",
        })),
      };
    }),
  );

  return {
    inspeccion,

    tipoInspeccion: "SST",

    extintores: extRes.rows.map((e) => ({
      numero: e.numero || "",
      ubicacion: e.ubicacion || "",
      tipo: e.tipo || "",
      capacidad: e.capacidad || "",
      mesRecarga: e.mes_recarga || "",
      anioRecarga: e.ano_recarga || "",
      observaciones: e.observaciones || "",
      evidenciaRuta: e.evidencia_ruta || "",
      evidenciaArchivo: e.evidencia_archivo || "",
      evidenciaFecha: e.evidencia_fecha || null,
      condiciones: e.condiciones || {},
    })),

    camillas: camRes.rows.map((c) => ({
      numero: c.numero || "",
      ubicacion: c.ubicacion || "",
      observaciones: c.observaciones || "",
      afectacionProductividad: c.afectacion_productividad || "",
      evidenciaRuta: c.evidencia_ruta || "",
      evidenciaArchivo: c.evidencia_archivo || "",
      evidenciaFecha: c.evidencia_fecha || null,
      condiciones: c.condiciones || {},
    })),

    senalizaciones: senRes.rows.map((s) => ({
      tipo: s.tipo || "",
      ubicacion: s.ubicacion || "",
      cantidad: s.cantidad || "",
      estado: s.estado || "",
      aseo: s.aseo || "",
      observaciones: s.observaciones || "",
      evidenciaRuta: s.evidencia_ruta || "",
      evidenciaArchivo: s.evidencia_archivo || "",
      evidenciaFecha: s.evidencia_fecha || null,
    })),

    equiposTecnologicos: eqpRes.rows.map((eq) => ({
      no: eq.no || "",
      equipoTecnologico: eq.equipo_tecnologico || "",
      ubicacion: eq.ubicacion || "",
      cantidad: eq.cantidad || "",
      estado: eq.estado || "",
      mantenimiento: eq.mantenimiento || "",
      observaciones: eq.observaciones || "",
      afectacionServicio: eq.afectacion_servicio || "",
      evidenciaRuta: eq.evidencia_ruta || "",
      evidenciaArchivo: eq.evidencia_archivo || "",
      evidenciaFecha: eq.evidencia_fecha || null,
    })),

    botiquines,
  };
}

function construirFiltrosInspecciones({
  fechaDesde,
  fechaHasta,
  sedeOperacion,
  estado,
  q,
}) {
  const condiciones = ["1=1"];
  const valores = [];

  if (fechaDesde) {
    valores.push(fechaDesde);
    condiciones.push(`i.created_at::date >= $${valores.length}`);
  }

  if (fechaHasta) {
    valores.push(fechaHasta);
    condiciones.push(`i.created_at::date <= $${valores.length}`);
  }

  if (sedeOperacion) {
    valores.push(sedeOperacion);
    condiciones.push(`i.sede_operacion = $${valores.length}`);
  }

  if (estado) {
    valores.push(estado);
    condiciones.push(`i.estado = $${valores.length}`);
  }

  if (q) {
    valores.push(`%${q}%`);
    condiciones.push(`(
      i.inspeccion_id ILIKE $${valores.length}
      OR i.responsable_inspeccion ILIKE $${valores.length}
      OR i.jefe_responsable ILIKE $${valores.length}
      OR i.area_trabajo ILIKE $${valores.length}
    )`);
  }

  return {
    whereSql: condiciones.join(" AND "),
    valores,
  };
}

async function obtenerResumenEstadisticas(filtros = {}) {
  const { whereSql, valores } = construirFiltrosInspecciones(filtros);

  const resumenSql = `
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE i.estado = 'pendiente_aprobacion')::int AS pendientes,
      COUNT(*) FILTER (WHERE i.estado = 'aprobada')::int AS aprobadas,
      COUNT(*) FILTER (WHERE i.estado = 'enviada')::int AS enviadas,
      COUNT(*) FILTER (WHERE i.created_at >= date_trunc('month', now()))::int AS este_mes
    FROM inspecciones i
    WHERE ${whereSql}
  `;

  const sedesSql = `
    SELECT
      COALESCE(NULLIF(TRIM(i.sede_operacion), ''), 'Sin sede') AS sede,
      COUNT(*)::int AS cantidad
    FROM inspecciones i
    WHERE ${whereSql}
    GROUP BY 1
    ORDER BY cantidad DESC, sede ASC
    LIMIT 8
  `;

  const [resResumen, resSedes] = await Promise.all([
    query(resumenSql, valores),
    query(sedesSql, valores),
  ]);

  return {
    total: Number(resResumen.rows?.[0]?.total || 0),
    pendientes: Number(resResumen.rows?.[0]?.pendientes || 0),
    aprobadas: Number(resResumen.rows?.[0]?.aprobadas || 0),
    enviadas: Number(resResumen.rows?.[0]?.enviadas || 0),
    esteMes: Number(resResumen.rows?.[0]?.este_mes || 0),
    porSede: resSedes.rows || [],
  };
}

async function listarInspeccionesConFiltros(filtros = {}, paginacion = {}) {
  const page = Math.max(1, Number(paginacion.page) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, Number(paginacion.pageSize) || 10),
  );
  const offset = (page - 1) * pageSize;
  const sortBy = paginacion.sortBy;
  const sortOrder = paginacion.sortOrder === "desc" ? "DESC" : "ASC";

  const columnasOrdenables = {
    numero: "i.num_inspeccion",
    codigo: "i.inspeccion_id",
    registro: "i.created_at",
    sedeOperacion: "i.sede_operacion",
    area: "i.area_trabajo",
    responsable: "i.responsable_inspeccion",
    estado: "i.estado",
    items: `
    (
      COALESCE(ext.cantidad,0) +
      COALESCE(cam.cantidad,0) +
      COALESCE(sen.cantidad,0) +
      COALESCE(eqp.cantidad,0) +
      COALESCE(bot.cantidad,0)
    )
  `,
  };

  const columnaOrden = columnasOrdenables[sortBy] || "i.created_at";
  const { whereSql, valores } = construirFiltrosInspecciones(filtros);

  const totalSql = `SELECT COUNT(*)::int AS total FROM inspecciones i WHERE ${whereSql}`;

  const datosSql = `
    SELECT
      i.inspeccion_id,
      i.num_inspeccion,
      i.fecha,
      i.created_at,
      i.sede_operacion,
      i.area_trabajo,
      i.jefe_responsable,
      i.responsable_inspeccion,
      i.estado,
      COALESCE(ext.cantidad, 0)::int AS extintores,
      COALESCE(cam.cantidad, 0)::int AS camillas,
      COALESCE(sen.cantidad, 0)::int AS senalizaciones,
      COALESCE(eqp.cantidad, 0)::int AS equipos,
      COALESCE(bot.cantidad, 0)::int AS botiquines
    FROM inspecciones i
    LEFT JOIN (
      SELECT inspeccion_pk, COUNT(*)::int AS cantidad FROM extintores GROUP BY inspeccion_pk
    ) ext ON ext.inspeccion_pk = i.id
    LEFT JOIN (
      SELECT inspeccion_pk, COUNT(*)::int AS cantidad FROM camillas GROUP BY inspeccion_pk
    ) cam ON cam.inspeccion_pk = i.id
    LEFT JOIN (
      SELECT inspeccion_pk, COUNT(*)::int AS cantidad FROM senalizaciones GROUP BY inspeccion_pk
    ) sen ON sen.inspeccion_pk = i.id
    LEFT JOIN (
      SELECT inspeccion_pk, COUNT(*)::int AS cantidad FROM equipos_tecnologicos GROUP BY inspeccion_pk
    ) eqp ON eqp.inspeccion_pk = i.id
    LEFT JOIN (
      SELECT inspeccion_pk, COUNT(*)::int AS cantidad FROM botiquines GROUP BY inspeccion_pk
    ) bot ON bot.inspeccion_pk = i.id
    WHERE ${whereSql}
    ORDER BY ${columnaOrden} ${sortOrder}
    LIMIT $${valores.length + 1}
    OFFSET $${valores.length + 2}
  `;

  const [resTotal, resDatos] = await Promise.all([
    query(totalSql, valores),
    query(datosSql, [...valores, pageSize, offset]),
  ]);

  const total = Number(resTotal.rows?.[0]?.total || 0);

  return {
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    items: resDatos.rows || [],
  };
}

async function obtenerLinksInspeccion(inspeccionId) {
  const { rows } = await query(
    `SELECT
      inspeccion_id,
      num_inspeccion,

      token_inspector,
      token_jefe,
      token_copasst,

      aprobacion_inspector_nombre,
      aprobacion_jefe_nombre,
      aprobacion_copasst_nombre

     FROM inspecciones
     WHERE inspeccion_id = $1`,
    [inspeccionId],
  );

  if (!rows.length) {
    return null;
  }

  const inspeccion = rows[0];

  const baseUrl = process.env.APP_URL || "http://localhost:3000";

  // Enlaces para compartir
  const links = {};

  // El jefe solo aparece si aún no ha aprobado
  if (!inspeccion.aprobacion_jefe_nombre) {
    links.jefe = `${baseUrl}/aprobar/${inspeccion.token_jefe}`;
  }

  // El COPASST solo aparece si aún no ha aprobado
  if (!inspeccion.aprobacion_copasst_nombre) {
    links.copasst = `${baseUrl}/aprobar/${inspeccion.token_copasst}`;
  }

  return {
    inspeccionId: inspeccion.inspeccion_id,
    numInspeccion: inspeccion.num_inspeccion,

    // Token exclusivo para generar el PDF
    previewToken: inspeccion.token_inspector,

    // Enlaces que se muestran al usuario
    links,
  };
}

// Exporta funciones y constantes para uso en el controlador.
module.exports = {
  CAMPOS_CONDICION,
  validarInspeccion,
  uploadEvidenceToOneDrive,
  descargarEvidenciaOneDrive,
  guardarInspeccionEnDB,
  obtenerInspeccionCompleta,
  obtenerResumenEstadisticas,
  listarInspeccionesConFiltros,
  obtenerLinksInspeccion,
};
