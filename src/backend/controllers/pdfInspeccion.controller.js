/*
  pdfInspeccion.controller.js — Controlador de generación de PDF y envío por correo.

  Qué hace:
  - generarPdfPrueba (POST /pdf-prueba):
      Recibe el FormData con el payload y las evidencias, genera un PDF con PDFKit
      y lo devuelve como descarga directa al navegador.
  - enviarPdfPruebaCorreo (POST /enviar-pdf-prueba-correo):
      Genera el mismo PDF y lo envía como adjunto por correo electrónico usando
      Microsoft Graph API (autenticación client_credentials con tenant/client/secret).

  Estructura del PDF (una página por sección):
    Pág. 1+  → Extintores (una página por extintor)
    Pág. n+  → Camillas (una página por camilla)
    Pág. n+  → Señalizaciones (una página por señalización)
    Pág. n+1 → Equipos tecnológicos (tabla única con los 4 equipos)
    Pág. n+  → Botiquines (una página por botiquín con tabla de 28 ítems)

  Cómo interactúa:
  - Es registrado en app.js como handler de /pdf-prueba y /enviar-pdf-prueba-correo.
  - Lee las credenciales de Microsoft Graph desde variables de entorno (.env):
      MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET, ONEDRIVE_USER_ID, GRAPH_EMAIL_TO_TEST
  - El frontend (inspeccion-sst.js) llama a /enviar-pdf-prueba-correo después
    de un envío exitoso a OneDrive; también puede llamarse de forma independiente.
  - No depende de extintor.model.js; trabaja directamente sobre el payload recibido.
*/



const path = require("node:path");
const PDFDocument = require("pdfkit");
const { extraerFechaExif, formatearFechaMs } = require("../utils/fechaEvidencia");
const { optimizarPdf } = require("../utils/pdfOptimizer");

const LOGO_URL = "https://sstinspeccion.onrender.com/img/Cargo.png";

// ===== Utilidades =====
function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta variable de entorno requerida: ${name}`);
  }
  return value;
}

const PDF_DESTINOS_POR_SEDE = new Map([
  ["uraba", "Respuestas_PDF/URABÁ"],
  ["santa marta", "Respuestas_PDF/STM"],
]);

function normalizarSedeParaRuta(sedeOperacion) {
  return String(sedeOperacion || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function resolverCarpetaDestinoPdf(sedeOperacion) {
  const sede = normalizarSedeParaRuta(sedeOperacion);

  for (const [clave, carpeta] of PDF_DESTINOS_POR_SEDE) {
    if (sede.includes(clave)) return carpeta;
  }

  return "Respuestas_PDF";
}

// Extrae el payload del body de la request, parseando JSON si viene como string.
function leerPayload(req) {
  if (typeof req.body?.payload === "string") {
    return JSON.parse(req.body.payload);
  }
  return req.body || {};
}

// Extrae un Map<index, file[]> de los archivos subidos, según el prefijo del fieldname.
// El fieldname esperado es "{prefix}-{index}-{photoIndex}"; las fotos de un mismo índice
// se devuelven ordenadas por photoIndex.
function extraerEvidenciasPorIndex(files, prefix = "evidencia") {
  const temp = new Map();
  const lista = Array.isArray(files) ? files : [];
  const patron = new RegExp(`^${prefix}-(\\d+)-(\\d+)$`);

  for (const file of lista) {
    const match = patron.exec(file.fieldname || "");
    if (!match) continue;
    const idx = Number(match[1]);
    const photoIdx = Number(match[2]);
    if (!temp.has(idx)) temp.set(idx, []);
    temp.get(idx).push({ photoIdx, file });
  }

  const mapa = new Map();
  for (const [idx, arr] of temp) {
    arr.sort((a, b) => a.photoIdx - b.photoIdx);
    mapa.set(idx, arr.map((x) => x.file));
  }

  return mapa;
}

// Construye un Map<index, fechaString> a partir de la primera foto de cada índice:
// intenta EXIF, si no usa lastModified del body.
async function extraerFechasArchivos(fileMapa, body, prefijo) {
  const fechas = new Map();
  for (const [idx, archivos] of fileMapa) {
    const file = archivos?.[0];
    let fecha = await extraerFechaExif(file?.buffer);
    if (!fecha) {
      const lastmod = body?.[`${prefijo}-${idx}-0-lastmod`];
      if (lastmod) fecha = formatearFechaMs(lastmod);
    }
    if (fecha) fechas.set(idx, fecha);
  }
  return fechas;
}

// ===== GRAPH API PARA CORREO =====
let _cachedToken = null;
let _tokenExpiresAt = 0;

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

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });

  const data = await response.json();

  if (!response.ok || !data.access_token) {
    const detail = data?.error_description || data?.error || "No se pudo obtener token";
    throw new Error(`Error autenticando en Microsoft Graph: ${detail}`);
  }

  _cachedToken = data.access_token;
  _tokenExpiresAt = Date.now() + (data.expires_in || 3600) * 1000;
  return _cachedToken;
}

// Envía un correo con adjunto PDF usando Microsoft Graph API.
async function enviarCorreoPorGraph({ to, subject, html, pdfBuffer, nombre = "inspeccion-sst.pdf" }) {
  const token = await getAccessToken();
  const remitente = getRequiredEnv("ONEDRIVE_USER_ID");

  const emailBody = {
    message: {
      subject,
      body: {
        contentType: "HTML",
        content: html
      },
      toRecipients: (Array.isArray(to) ? to : to.split(","))
        .map(addr => addr.trim())
        .filter(Boolean)
        .map(addr => ({ emailAddress: { address: addr } })),
      attachments: [
        {
          "@odata.type": "#microsoft.graph.fileAttachment",
          name: nombre,
          contentBytes: pdfBuffer.toString("base64")
        }
      ]
    },
    saveToSentItems: true
  };

  // Enviar correo
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(remitente)}/sendMail`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(emailBody)
    }
  );

  // Manejo de errores
  if (!response.ok) {
    const errorData = await response.json();
    const detail = errorData?.error?.message || `HTTP ${response.status}`;
    throw new Error(`Error enviando correo por Graph: ${detail}`);
  }
}

// ===== ================ PDF =====================

// Dibuja el ID de inspección en la esquina inferior derecha, debajo del bloque de evidencia.
function dibujarIdInspeccion(doc, general, y) {
  const id = general.inspeccionId || "";
  if (!id) return;
  const num = general.numInspeccion != null ? `Inspección N.° ${general.numInspeccion}  ·  ` : "";
  doc.font("Helvetica").fontSize(7).fillColor("#9ca3af")
    .text(`${num}${id}`, 25, y + 4, { width: 545, align: "right" })
    .fillColor("black");
}

// Ajusta y centra una imagen dentro de una caja (x,y,width,height). Si falla, muestra un aviso.
function dibujarImagenAjustada(doc, file, x, y, width, height, fontSize = 9) {
  try {
    const img = doc.openImage(file.buffer);
    const ratio = Math.min(width / img.width, height / img.height);
    const scaledW = img.width * ratio;
    const scaledH = img.height * ratio;
    const cx = x + (width - scaledW) / 2;
    const cy = y + (height - scaledH) / 2;
    doc.image(file.buffer, cx, cy, { width: scaledW, height: scaledH });
  } catch {
    doc.font("Helvetica").fontSize(fontSize).text("No fue posible renderizar la evidencia.", x + 3, y + 5, { width: width - 6 });
  }
}

// Dibuja hasta 2 evidencias lado a lado dentro de una caja (x,y,width,height).
// Las fotos 3+ de un mismo ítem no se dibujan aquí: se listan aparte con renderPaginasEvidenciasExtra.
function dibujarEvidenciasEnCaja(doc, files, x, y, width, height, opts = {}) {
  const { fontSize = 9, colorVacio = "black", textoVacio = "Sin evidencia adjunta." } = opts;
  const lista = Array.isArray(files) ? files.filter((f) => f?.buffer?.length) : [];

  if (lista.length === 0) {
    doc.font("Helvetica").fontSize(fontSize).fillColor(colorVacio)
      .text(textoVacio, x + 3, y + 5, { width: width - 6 })
      .fillColor("black");
    return;
  }

  const mostrar = lista.slice(0, 2);
  const gap = 6;
  const cellW = mostrar.length > 1 ? (width - gap) / 2 : width;

  mostrar.forEach((file, i) => {
    const cellX = x + i * (cellW + gap);
    dibujarImagenAjustada(doc, file, cellX, y, cellW, height, fontSize);
  });
}

// Renderiza páginas de continuación con las evidencias que no caben en la caja principal
// (a partir de la 3ra foto). Si en una página caben 1 o 2 fotos, se centran en cajas grandes
// para no dejar la página casi en blanco; con 3 o 4 se usa una grilla 2x2 a todo el ancho.
// Devuelve { lastY } con la posición justo debajo del último contenido dibujado (o null si no había
// evidencias extra), para que el llamador pueda seguir agregando contenido sin dejar huecos.
// opts.dibujarIdEnUltima (default true) controla si se dibuja el pie de ID en la última página
// generada aquí; pásalo en false cuando el llamador vaya a agregar más contenido debajo (p.ej. aprobaciones).
function renderPaginasEvidenciasExtra(doc, general, titulo, subtitulo, files, opts = {}) {
  const { dibujarIdEnUltima = true } = opts;
  const extra = Array.isArray(files) ? files.filter((f) => f?.buffer?.length).slice(2) : [];
  if (extra.length === 0) return null;

  const porPagina = 4;
  const gap = 8;
  let lastY = null;

  for (let inicio = 0; inicio < extra.length; inicio += porPagina) {
    doc.addPage();
    let y = 25;
    doc.font("Helvetica-Bold").fontSize(13).text("EVIDENCIAS ADICIONALES", 25, y, { width: 545, align: "center" });
    y += 20;
    doc.font("Helvetica").fontSize(10).text(`${titulo}${subtitulo ? " — " + subtitulo : ""}`, 25, y, { width: 545, align: "center" });
    y += 30;

    const lote = extra.slice(inicio, inicio + porPagina);
    const esUltimoLote = inicio + porPagina >= extra.length;
    let finGrid;

    if (lote.length <= 2) {
      // Pocas fotos: cajas grandes y centradas en vez de una grilla 2x2 con huecos.
      const celdaW = 340;
      const celdaH = 400;
      const anchoTotal = lote.length * celdaW + (lote.length - 1) * gap;
      const xInicio = 25 + (545 - anchoTotal) / 2;
      lote.forEach((file, i) => {
        const cx = xInicio + i * (celdaW + gap);
        doc.rect(cx, y, celdaW, celdaH).stroke();
        dibujarImagenAjustada(doc, file, cx + 5, y + 5, celdaW - 10, celdaH - 10, 8);
      });
      finGrid = y + celdaH;
    } else {
      const celdaW = (545 - gap) / 2;
      const celdaH = 220;
      lote.forEach((file, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const cx = 25 + col * (celdaW + gap);
        const cy = y + row * (celdaH + gap);
        doc.rect(cx, cy, celdaW, celdaH).stroke();
        dibujarImagenAjustada(doc, file, cx + 5, cy + 5, celdaW - 10, celdaH - 10, 8);
      });
      finGrid = y + 2 * celdaH + gap;
    }

    if (esUltimoLote) {
      lastY = finGrid;
      if (dibujarIdEnUltima) dibujarIdInspeccion(doc, general, finGrid + gap);
    } else {
      dibujarIdInspeccion(doc, general, finGrid + gap);
    }
  }

  return { lastY };
}

//PAGINA 1 (EXTINTOR)
// opts.aprobaciones: { inspector: {nombre}, jefe: {...}, copasst: {...} } — si no se pasa, quedan en blanco.
// opts.fechasPrecomputadas: { extintores, camillas, senalizaciones, equipos, botiquines } (Maps ya calculados) —
//   se usa al regenerar el PDF tras las 3 aprobaciones, cuando las evidencias vienen de OneDrive y no del request original.
async function crearPdfInspeccionExtintor(data, evidenciasPorIndex = new Map(), evidenciasCamillaPorIndex = new Map(), evidenciasSenalizacionPorIndex = new Map(), evidenciasEquipoTecnologicoPorIndex = new Map(), evidenciasBotiquinPorIndex = new Map(), body = {}, opts = {}) {
  const { aprobaciones = null, fechasPrecomputadas = null } = opts;

  // Pre-extraer fechas (EXIF → fallback a lastModified enviado desde el navegador),
  // salvo que ya vengan precalculadas (regeneración post-aprobación).
  const [exifExtintores, exifCamillas, exifSenalizaciones, exifEquipos, exifBotiquines] = fechasPrecomputadas
    ? [
      fechasPrecomputadas.extintores || new Map(),
      fechasPrecomputadas.camillas || new Map(),
      fechasPrecomputadas.senalizaciones || new Map(),
      fechasPrecomputadas.equipos || new Map(),
      fechasPrecomputadas.botiquines || new Map()
    ]
    : await Promise.all([
      extraerFechasArchivos(evidenciasPorIndex, body, "evidencia"),
      extraerFechasArchivos(evidenciasCamillaPorIndex, body, "evidencia-camilla"),
      extraerFechasArchivos(evidenciasSenalizacionPorIndex, body, "evidencia-senalizacion"),
      extraerFechasArchivos(evidenciasEquipoTecnologicoPorIndex, body, "equipo-tecnologico-evidencia"),
      extraerFechasArchivos(evidenciasBotiquinPorIndex, body, "botiquin-evidencia"),
    ]);

  // Crear PDF con PDFKit
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 25 });
    const chunks = [];

    doc.on("data", chunk => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const general = data || {};

    // PDFKit abre la página 1 automáticamente al crear el doc. Como cualquier
    // sección puede venir vacía (secciones opcionales, ver sede Urabá), no se
    // puede asumir que "extintores" siempre dibuja esa primera página: la
    // primera sección con contenido reutiliza la página inicial, y solo las
    // siguientes llaman addPage(). Así nunca queda una página en blanco al inicio.
    let primeraPaginaUsada = false;
    function nuevaPagina() {
      if (primeraPaginaUsada) {
        doc.addPage();
      } else {
        primeraPaginaUsada = true;
      }
    }

    const extintores = Array.isArray(general.extintores) ? general.extintores : [];
    const camillas = Array.isArray(general.camillas) && general.camillas.length > 0
      ? general.camillas
      : [];
    const senalizaciones = Array.isArray(general.senalizaciones) && general.senalizaciones.length > 0
      ? general.senalizaciones
      : [];
    const equiposTecnologicos = Array.isArray(general.equiposTecnologicos) && general.equiposTecnologicos.length > 0
      ? general.equiposTecnologicos
      : [];
    const botiquines = Array.isArray(general.botiquines) && general.botiquines.length > 0
      ? general.botiquines
      : [];

    extintores.forEach((extintor, idx) => {
      nuevaPagina();

      const condiciones = extintor.condiciones || {};
      let y = 25;

      // ===== ENCABEZADO =====
      doc.rect(25, y, 545, 70).stroke();
      doc.rect(25, y, 150, 70).stroke();
      doc.image(path.resolve(__dirname, "../../views/img/Cargo.png"), 27, y + 3, { fit: [146, 64], align: "center", valign: "center" });
      doc.rect(175, y, 245, 70).stroke();
      doc.font("Helvetica-Bold").fontSize(16).text("INSPECCIÓN DE\nEXTINTORES\nEMERGENCIA", 175, y + 8, { width: 245, align: "center", lineGap: 2 });
      doc.rect(420, y, 150, 23).stroke();
      doc.rect(420, y + 23, 150, 23).stroke();
      doc.rect(420, y + 46, 150, 24).stroke();
      doc.font("Helvetica").fontSize(9)
        .text("CODIGO: ST-FST 25", 425, y + 7)
        .text("VERSIÓN: 01", 425, y + 30)
        .text("FECHA DE VERSIÓN: 4/6/2026", 425, y + 53);

      y += 70;

      // ===== DATOS GENERALES =====
      doc.rect(25, y, 272.5, 25).stroke();
      doc.rect(297.5, y, 272.5, 25).stroke();
      doc.font("Helvetica-Bold").fontSize(9).text("FECHA DE INSPECCIÓN:", 30, y + 8);
      doc.font("Helvetica").fontSize(9).text(general.fecha || "", 155, y + 8);
      doc.font("Helvetica-Bold").fontSize(9).text("SEDE:", 302, y + 8);
      doc.font("Helvetica").fontSize(9).text(general.sedeOperacion || "", 332, y + 8, { width: 230 });
      y += 25;

      doc.rect(25, y, 272.5, 25).stroke();
      doc.rect(297.5, y, 272.5, 25).stroke();
      doc.font("Helvetica-Bold").fontSize(9).text("AREA DE TRABAJO:", 30, y + 8);
      doc.font("Helvetica").fontSize(9).text(general.areaTrabajo || "", 130, y + 8, { width: 160 });
      doc.font("Helvetica-Bold").fontSize(9).text("RESPONSABLE INSPECCIÓN:", 302, y + 8);
      doc.font("Helvetica").fontSize(9).text(general.responsableInspeccion || "", 445, y + 8, { width: 120 });
      y += 25;

      doc.rect(25, y, 545, 25).stroke();
      doc.font("Helvetica-Bold").fontSize(9).text("RESPONSABLE DEL AREA:", 30, y + 8);
      doc.font("Helvetica").fontSize(9).text(
        (general.jefeResponsable || "") + (general.cargoJefe ? "  —  " + general.cargoJefe : ""),
        175, y + 8, { width: 390 }
      );
      y += 25;

      // ===== DATOS DEL EXTINTOR =====
      const datosExtintor = [
        ["N° DE EXTINTOR:", extintor.numero || ""],
        ["TIPO DE EXTINTOR:", extintor.tipo || ""],
        ["CAPACIDAD:", extintor.capacidad || ""],
        ["PRÓXIMA RECARGA:", `Mes: ${extintor.mesRecarga || ""}   Año: ${extintor.anioRecarga || ""}`]
      ];

      datosExtintor.forEach(([label, valor]) => {
        doc.rect(25, y, 545, 22).stroke();

        // Texto combinado: etiqueta en negrita, valor normal
        doc.font("Helvetica-Bold")
          .fontSize(9)
          .text(label, 30, y + 6, { continued: true, width: 535 })
          .font("Helvetica")
          .fontSize(9)
          .text(valor, { continued: false, width: 535 });

        y += 22;
      });
      // ===== DETALLE CONDICIONES =====
      doc.rect(25, y, 545, 40).stroke();
      doc.font("Helvetica-Bold").fontSize(9).text("DETALLE DE LAS CONDICIONES DEL EXTINTOR.", 25, y + 5, { width: 545, align: "center" });
      doc.font("Helvetica").fontSize(8).text("CONVENCIONES: B: Bueno   R: Regular   M: Malo   NC: No contiene   NA: No aplica", 25, y + 20, { width: 545, align: "center" });
      y += 40;

      // ===== TABLA =====
      const columnas = [190, 82.5, 190, 82.5];
      let x = 25;
      ["ELEMENTO", "ESTADO", "ELEMENTO", "ESTADO"].forEach((titulo, i) => {
        doc.rect(x, y, columnas[i], 25).stroke();
        doc.font("Helvetica-Bold").fontSize(8).text(titulo, x, y + 7, { width: columnas[i], align: "center" });
        x += columnas[i];
      });
      y += 25;

      const elementos = [
        ["Acceso", condiciones.acceso || "", "Presión", condiciones.presion || ""],
        ["Visibilidad", condiciones.visibilidad || "", "Pin de seguridad", condiciones.pin || ""],
        ["Señalización", condiciones.senalizacion || "", "Manguera", condiciones.manguera || ""],
        ["Pared altura\n1.50m", condiciones.paredAltura || "", "Boquilla", condiciones.boquilla || ""],
        ["Piso base", condiciones.piso || "", "Corneta", condiciones.corneta || ""],
        ["Limpieza", condiciones.limpieza || "", "Pintura", condiciones.pintura || ""],
        ["Rotulo", condiciones.rotulo || "", "Manija de transporte", condiciones.manija || ""],
        ["Cilindro", condiciones.cilindro || "", "Sello de garantía", condiciones.sello || ""],
        ["Manómetro", condiciones.manometro || "", "Llave spanner", condiciones.llaveSpanner || ""]
      ];

      const rowHeight = 24;
      elementos.forEach(fila => {
        let xx = 25;
        fila.forEach((valor, i) => {
          doc.rect(xx, y, columnas[i], rowHeight).stroke();
          doc.font("Helvetica").fontSize(8).text(valor, xx + 5, y + 8, { width: columnas[i] - 10, align: "left" });
          xx += columnas[i];
        });
        y += rowHeight;
      });

      // ===== OBSERVACIONES =====
      const observacionesHeaderHeight = 25;
      const observacionesBoxHeight = 30;

      doc.rect(25, y, 545, observacionesHeaderHeight).stroke();
      doc.font("Helvetica-Bold").fontSize(9).text("OBSERVACIONES", 25, y + 7, { width: 545, align: "center" });
      y += observacionesHeaderHeight;
      doc.rect(25, y, 545, observacionesBoxHeight).stroke();
      doc.font("Helvetica").fontSize(9).text(extintor.observaciones || "", 30, y + 8, { width: 535 });
      y += observacionesBoxHeight;

      // ===== EVIDENCIAS =====
      const evidenciaHeaderHeight = 20;
      const evidenciaBoxHeight = 180;

      doc.rect(25, y, 545, evidenciaHeaderHeight).stroke();
      doc.font("Helvetica-Bold").fontSize(9).text("EVIDENCIAS", 30, y + 6);
      const fechaExifExt = exifExtintores.get(idx);
      if (fechaExifExt) {
        doc.font("Helvetica").fontSize(7).fillColor("#555555").text(`Fecha: ${fechaExifExt}`, 30, y + 7, { width: 535, align: "right" }).fillColor("black");
      }
      y += evidenciaHeaderHeight;

      const altoCajaEvidencia = evidenciaBoxHeight;
      doc.rect(25, y, 545, altoCajaEvidencia).stroke();

      const evidenciaArchivos = evidenciasPorIndex.get(idx) || [];
      const evidenciaX = 30;
      const evidenciaY = y + 5;
      const evidenciaWidth = 535;
      const evidenciaHeight = Math.max(100, altoCajaEvidencia - 10);

      dibujarEvidenciasEnCaja(doc, evidenciaArchivos, evidenciaX, evidenciaY, evidenciaWidth, evidenciaHeight);
      y += altoCajaEvidencia;
      dibujarIdInspeccion(doc, general, y);

      renderPaginasEvidenciasExtra(doc, general, "EXTINTOR", extintor.numero, evidenciaArchivos);
    });

    // ===== PAGINAS DE CAMILLAS, SEÑALIZACIONES, EQUIPOS TECNOLÓGICOS Y BOTIQUINES =====
    camillas.forEach((camilla, idx) => {
      nuevaPagina();
      renderPaginaCamilla(doc, general, camilla, idx, evidenciasCamillaPorIndex, exifCamillas.get(idx));
    });

    senalizaciones.forEach((senalizacion, idx) => {
      nuevaPagina();
      renderPaginaSenalizacion(doc, general, senalizacion, idx, evidenciasSenalizacionPorIndex, exifSenalizaciones.get(idx));
    });

    if (equiposTecnologicos.length > 0) {
      nuevaPagina();
      renderPaginaEquiposTecnologicos(doc, general, equiposTecnologicos, evidenciasEquipoTecnologicoPorIndex, exifEquipos);
    }

    if (botiquines.length > 0) {
      botiquines.forEach((botiquin, idx) => {
        nuevaPagina();
        renderPaginaBotiquin(doc, general, botiquin, idx, evidenciasBotiquinPorIndex, exifBotiquines.get(idx), idx === botiquines.length - 1, aprobaciones);
      });
    } else {
      // Sección de botiquín vacía (opcional): renderPaginaBotiquin es quien normalmente
      // dibuja el bloque de aprobación en su última página. Sin botiquines no hay
      // dónde colgarlo, así que se dibuja aquí en una página dedicada.
      nuevaPagina();
      let y = 25;
      doc.font("Helvetica-Bold").fontSize(13).text("APROBACIÓN DE LA INSPECCIÓN", 25, y, { width: 545, align: "center" });
      y += 40;
      renderAprobaciones(doc, y, aprobaciones);
      dibujarIdInspeccion(doc, general, y + 60 + 4);
    }

    doc.end();
  });
}

// PAGINA 2 (CAMILLA)
function renderPaginaCamilla(doc, general, camilla, idx, evidenciasCamillaPorIndex, fechaExif) {
  const condiciones = camilla.condiciones || {};
  let y = 25;

  doc.rect(25, y, 545, 70).stroke();
  doc.rect(25, y, 150, 70).stroke();
  doc.image(path.resolve(__dirname, "../../views/img/Cargo.png"), 27, y + 3, { fit: [146, 64], align: "center", valign: "center" });
  doc.rect(175, y, 245, 70).stroke();
  doc.font("Helvetica-Bold").fontSize(15).text("INSPECCIÓN DE CAMILLA\nEMERGENCIA", 175, y + 15, { width: 245, align: "center" });
  doc.rect(420, y, 150, 23).stroke();
  doc.rect(420, y + 23, 150, 23).stroke();
  doc.rect(420, y + 46, 150, 24).stroke();
  doc.font("Helvetica").fontSize(9)
    .text("CODIGO: ST-FST 25", 425, y + 7)
    .text("VERSIÓN: 01", 425, y + 30)
    .text("FECHA DE VERSIÓN: 4/6/2026", 425, y + 53);

  y += 70;

  doc.rect(25, y, 272.5, 25).stroke();
  doc.rect(297.5, y, 272.5, 25).stroke();
  doc.font("Helvetica-Bold").fontSize(9).text("FECHA DE INSPECCIÓN:", 30, y + 8);
  doc.font("Helvetica").fontSize(9).text(general.fecha || "", 155, y + 8);
  doc.font("Helvetica-Bold").fontSize(9).text("SEDE:", 302, y + 8);
  doc.font("Helvetica").fontSize(9).text(general.sedeOperacion || "", 332, y + 8, { width: 230 });

  y += 25;

  doc.rect(25, y, 272.5, 25).stroke();
  doc.rect(297.5, y, 272.5, 25).stroke();
  doc.font("Helvetica-Bold").fontSize(9).text("AREA DE TRABAJO:", 30, y + 8);
  doc.font("Helvetica").fontSize(9).text(general.areaTrabajo || "", 130, y + 8, { width: 160 });
  doc.font("Helvetica-Bold").fontSize(9).text("RESPONSABLE INSPECCIÓN:", 302, y + 8);
  doc.font("Helvetica").fontSize(9).text(general.responsableInspeccion || "", 445, y + 8, { width: 120 });

  y += 25;

  doc.rect(25, y, 380, 25).stroke();
  doc.rect(405, y, 165, 25).stroke();
  doc.font("Helvetica-Bold").fontSize(9).text("RESPONSABLE DEL AREA A INSPECCIONAR:", 30, y + 8);
  doc.font("Helvetica").fontSize(9).text(general.jefeResponsable || "", 240, y + 8, { width: 155 });
  doc.font("Helvetica-Bold").fontSize(9).text("N° DE CAMILLA:", 410, y + 8);
  doc.font("Helvetica").fontSize(9).text(camilla.numero || "", 490, y + 8);

  y += 25;

  doc.rect(25, y, 545, 40).stroke();
  doc.font("Helvetica-Bold").fontSize(9).text("DETALLE DE LAS CONDICIONES DE LA CAMILLA.", 25, y + 5, { width: 545, align: "center" });
  doc.font("Helvetica").fontSize(8).text("CONVENCIONES: B: Bueno   R: Regular   M: Malo   NC: No contiene   NA: No aplica", 25, y + 20, { width: 545, align: "center" });

  y += 40;

  const columnas = [430, 115];
  let x = 25;
  ["ELEMENTO", "ESTADO"].forEach((titulo, i) => {
    doc.rect(x, y, columnas[i], 25).stroke();
    doc.font("Helvetica-Bold").fontSize(8).text(titulo, x, y + 7, { width: columnas[i], align: "center" });
    x += columnas[i];
  });

  y += 25;

  const elementos = [
    ["Señalización", condiciones.senalizacion || ""],
    ["Acceso", condiciones.acceso || ""],
    ["Estado del soporte", condiciones.estadoSoporte || condiciones.soporte || ""],
    ["Instalación a pared", condiciones.instalacionPared || ""],
    ["Correas de seguridad", condiciones.correasSeguridad || condiciones.correas || ""],
    ["Limpieza", condiciones.limpieza || ""],
    ["Inmovilizador", condiciones.inmovilizador || ""]
  ];

  const rowHeight = 28;
  elementos.forEach((fila) => {
    let xx = 25;
    fila.forEach((valor, i) => {
      doc.rect(xx, y, columnas[i], rowHeight).stroke();
      doc.font("Helvetica").fontSize(8).text(valor, xx + 5, y + 8, { width: columnas[i] - 10 });
      xx += columnas[i];
    });
    y += rowHeight;
  });

  doc.rect(25, y, 545, 25).stroke();
  doc.font("Helvetica-Bold").fontSize(9).text("OBSERVACIONES", 25, y + 7, { width: 545, align: "center" });
  y += 25;

  doc.rect(25, y, 545, 35).stroke();
  doc.font("Helvetica").fontSize(9).text(camilla.observaciones || "", 30, y + 8, { width: 535 });
  y += 35;

  doc.rect(25, y, 545, 20).stroke();
  doc.font("Helvetica-Bold").fontSize(9).text("EVIDENCIAS", 30, y + 6);
  if (fechaExif) doc.font("Helvetica").fontSize(7).fillColor("#555555").text(`Fecha: ${fechaExif}`, 30, y + 7, { width: 535, align: "right" }).fillColor("black");
  y += 20;
  doc.rect(25, y, 545, 180).stroke();

  const evidenciaArchivos = evidenciasCamillaPorIndex.get(idx) || [];
  dibujarEvidenciasEnCaja(doc, evidenciaArchivos, 30, y + 5, 535, 170);
  y += 180;
  dibujarIdInspeccion(doc, general, y);

  renderPaginasEvidenciasExtra(doc, general, "CAMILLA", camilla.numero, evidenciaArchivos);
}


//PAGINA 3 (señalizacion)
function renderPaginaSenalizacion(doc, general, senalizacion, idx, evidenciasSenalizacionPorIndex, fechaExif) {
  let y = 25;

  doc.rect(25, y, 545, 70).stroke();
  doc.rect(25, y, 150, 70).stroke();
  doc.image(path.resolve(__dirname, "../../views/img/Cargo.png"), 27, y + 3, { fit: [146, 64], align: "center", valign: "center" });
  doc.rect(175, y, 245, 70).stroke();
  doc.font("Helvetica-Bold").fontSize(15).text("INSPECCIÓN DE\nSEÑALIZACIÓN", 175, y + 15, { width: 245, align: "center" });
  doc.rect(420, y, 150, 23).stroke();
  doc.rect(420, y + 23, 150, 23).stroke();
  doc.rect(420, y + 46, 150, 24).stroke();
  doc.font("Helvetica").fontSize(9)
    .text("CODIGO: ST-FST 25", 425, y + 7)
    .text("VERSIÓN: 01", 425, y + 30)
    .text("FECHA DE VERSIÓN: 4/6/2026", 425, y + 53);

  y += 70;

  doc.rect(25, y, 272.5, 25).stroke();
  doc.rect(297.5, y, 272.5, 25).stroke();
  doc.font("Helvetica-Bold").fontSize(9).text("FECHA DE INSPECCIÓN:", 30, y + 8);
  doc.font("Helvetica").fontSize(9).text(general.fecha || "", 155, y + 8);
  doc.font("Helvetica-Bold").fontSize(9).text("SEDE:", 302, y + 8);
  doc.font("Helvetica").fontSize(9).text(general.sedeOperacion || "", 332, y + 8);
  y += 25;

  doc.rect(25, y, 272.5, 25).stroke();
  doc.rect(297.5, y, 272.5, 25).stroke();
  doc.font("Helvetica-Bold").fontSize(9).text("AREA DE TRABAJO:", 30, y + 8);
  doc.font("Helvetica").fontSize(9).text(general.areaTrabajo || "", 130, y + 8);
  doc.font("Helvetica-Bold").fontSize(9).text("RESPONSABLE INSPECCIÓN:", 302, y + 8);
  doc.font("Helvetica").fontSize(9).text(general.responsableInspeccion || "", 445, y + 8);
  y += 25;

  doc.rect(25, y, 545, 25).stroke();
  doc.font("Helvetica-Bold").fontSize(9).text("RESPONSABLE DEL AREA A INSPECCIONAR:", 30, y + 8);
  doc.font("Helvetica").fontSize(9).text(general.jefeResponsable || "", 240, y + 8, { width: 320 });
  y += 25;

  doc.rect(25, y, 272.5, 25).stroke();
  doc.rect(297.5, y, 272.5, 25).stroke();
  doc.font("Helvetica-Bold").fontSize(9).text("UBICACIÓN:", 30, y + 8);
  doc.font("Helvetica").fontSize(9).text(senalizacion.ubicacion || "", 95, y + 8);
  doc.font("Helvetica-Bold").fontSize(9).text("TIPO DE SEÑALIZACIÓN:", 302, y + 8);
  doc.font("Helvetica").fontSize(9).text(senalizacion.tipo || "", 420, y + 8, { width: 140 });
  y += 25;

  doc.rect(25, y, 545, 40).stroke();
  doc.font("Helvetica-Bold").fontSize(9).text("DETALLE DE LAS CONDICIONES DE LA SEÑALIZACIÓN", 25, y + 5, { width: 545, align: "center" });
  doc.font("Helvetica").fontSize(8).text("CONVENCIONES: B: Bueno   R: Regular   M: Malo   NC: No contiene   NA: No aplica", 25, y + 20, { width: 545, align: "center" });
  y += 40;

  const columnas = [400, 145];
  let x = 25;
  ["ELEMENTO", "ESTADO"].forEach((titulo, i) => {
    doc.rect(x, y, columnas[i], 25).stroke();
    doc.font("Helvetica-Bold").fontSize(8).text(titulo, x, y + 7, { width: columnas[i], align: "center" });
    x += columnas[i];
  });
  y += 25;

  // Elementos de la tabla de señalización
  const elementos = [
    ["Cantidad", senalizacion.cantidad || ""],
    ["Estado", senalizacion.estado || ""],
    ["Aseo", senalizacion.aseo || ""]
  ];

  // Altura de cada fila de la tabla
  const rowHeight = 30;
  elementos.forEach((fila) => {
    let xx = 25;
    fila.forEach((valor, i) => {
      doc.rect(xx, y, columnas[i], rowHeight).stroke();
      doc.font("Helvetica").fontSize(8).text(valor, xx + 5, y + 8, { width: columnas[i] - 10 });
      xx += columnas[i];
    });
    y += rowHeight;
  });

  doc.rect(25, y, 545, 25).stroke();
  doc.font("Helvetica-Bold").fontSize(9).text("OBSERVACIONES", 25, y + 7, { width: 545, align: "center" });
  y += 25;
  doc.rect(25, y, 545, 35).stroke();
  doc.font("Helvetica").fontSize(9).text(senalizacion.observaciones || "", 30, y + 8, { width: 535 });
  y += 35;

  doc.rect(25, y, 545, 20).stroke();
  doc.font("Helvetica-Bold").fontSize(9).text("EVIDENCIAS", 30, y + 6);
  if (fechaExif) doc.font("Helvetica").fontSize(7).fillColor("#555555").text(`Fecha: ${fechaExif}`, 30, y + 7, { width: 535, align: "right" }).fillColor("black");
  y += 20;
  doc.rect(25, y, 545, 180).stroke();

  // Renderizar evidencia(s) de señalización
  const evidenciaArchivos = evidenciasSenalizacionPorIndex.get(idx) || [];
  dibujarEvidenciasEnCaja(doc, evidenciaArchivos, 30, y + 5, 535, 170);
  y += 180;
  dibujarIdInspeccion(doc, general, y);

  renderPaginasEvidenciasExtra(doc, general, "SEÑALIZACIÓN", senalizacion.tipo, evidenciaArchivos);
}

//PAGINA 4 (EQUIPOS TECNOLOGICOS - TABLA UNICA)

function renderPaginaEquiposTecnologicos(doc, general, equiposTecnologicos, evidenciasEquipoPorIndex = new Map(), exifEquipos = new Map()) {
  let y = 25;

  doc.rect(25, y, 545, 70).stroke();
  doc.rect(25, y, 150, 70).stroke();
  doc.image(path.resolve(__dirname, "../../views/img/Cargo.png"), 27, y + 3, { fit: [146, 64], align: "center", valign: "center" });
  doc.rect(175, y, 245, 70).stroke();
  doc.font("Helvetica-Bold").fontSize(15).text("INSPECCIÓN DE\nEQUIPO TECNOLÓGICO DE\nATENCIÓN DE EMERGENCIA", 175, y + 15, { width: 245, align: "center" });
  doc.rect(420, y, 150, 23).stroke();
  doc.rect(420, y + 23, 150, 23).stroke();
  doc.rect(420, y + 46, 150, 24).stroke();
  doc.font("Helvetica").fontSize(9)
    .text("CODIGO: ST-FST 25", 425, y + 7)
    .text("VERSIÓN: 01", 425, y + 30)
    .text("FECHA DE VERSIÓN: 4/6/2026", 425, y + 53);

  y += 70;

  doc.rect(25, y, 272.5, 25).stroke();
  doc.rect(297.5, y, 272.5, 25).stroke();
  doc.font("Helvetica-Bold").fontSize(9).text("FECHA DE INSPECCIÓN:", 30, y + 8);
  doc.font("Helvetica").fontSize(9).text(general.fecha || "", 155, y + 8);
  doc.font("Helvetica-Bold").fontSize(9).text("SEDE:", 302, y + 8);
  doc.font("Helvetica").fontSize(9).text(general.sedeOperacion || "", 332, y + 8);
  y += 25;

  doc.rect(25, y, 272.5, 25).stroke();
  doc.rect(297.5, y, 272.5, 25).stroke();
  doc.font("Helvetica-Bold").fontSize(9).text("AREA DE TRABAJO:", 30, y + 8);
  doc.font("Helvetica").fontSize(9).text(general.areaTrabajo || "", 130, y + 8);
  doc.font("Helvetica-Bold").fontSize(9).text("RESPONSABLE INSPECCIÓN:", 302, y + 8);
  doc.font("Helvetica").fontSize(9).text(general.responsableInspeccion || "", 445, y + 8);
  y += 25;

  doc.rect(25, y, 545, 25).stroke();
  doc.font("Helvetica-Bold").fontSize(9).text("RESPONSABLE DEL AREA A INSPECCIONAR:", 30, y + 8);
  doc.font("Helvetica").fontSize(9).text(general.jefeResponsable || "", 240, y + 8, { width: 320 });
  y += 25;

  doc.rect(25, y, 545, 25).stroke();
  doc.font("Helvetica-Bold").fontSize(9).text("DETALLE DE CONDICIONES - EQUIPOS TECNOLÓGICOS", 25, y + 7, { width: 545, align: "center" });
  y += 25;

  doc.rect(25, y, 545, 20).stroke();
  doc.font("Helvetica").fontSize(7).text("CONVENCIONES: B: Bueno   R: Regular   M: Malo   NC: No contiene   NA: No aplica", 25, y + 5, { width: 545, align: "center" });
  y += 20;

  const columnas = [140, 70, 70, 90, 90, 85];
  let x = 25;
  ["TIPO", "UBICACIÓN", "CANTIDAD", "ESTADO", "MANTENIMIENTO", "AFECTACIÓN"].forEach((titulo, i) => {
    doc.rect(x, y, columnas[i], 20).stroke();
    doc.font("Helvetica-Bold").fontSize(7).text(titulo, x + 2, y + 5, { width: columnas[i] - 4, align: "center" });
    x += columnas[i];
  });
  y += 20;

  const rowHeight = 18;

  // Renderizar filas de equipos tecnológicos
  if (equiposTecnologicos && equiposTecnologicos.length > 0) {
    equiposTecnologicos.forEach((equipo) => {
      let xx = 25;
      const fila = [
        equipo.tipo || "",
        equipo.ubicacion || "",
        equipo.cantidad || "",
        equipo.estado || "",
        equipo.mantenimiento || "",
        equipo.afectacionServicio || ""
      ];

      fila.forEach((valor, i) => {
        doc.rect(xx, y, columnas[i], rowHeight).stroke();
        doc.font("Helvetica").fontSize(7).text(valor, xx + 2, y + 5, { width: columnas[i] - 4 });
        xx += columnas[i];
      });
      y += rowHeight;

      if (y > 750) {
        doc.addPage();
        y = 25;
      }
    });
  } else {
    x = 25;
    columnas.forEach((col, i) => {
      doc.rect(x, y, col, rowHeight).stroke();
      if (i === 0) doc.font("Helvetica").fontSize(7).text("Sin equipos registrados", x + 2, y + 5);
      x += col;
    });
    y += rowHeight;
  }

  y += 10;
  doc.rect(25, y, 545, 20).stroke();
  doc.font("Helvetica-Bold").fontSize(9).text("OBSERVACIONES DETALLADAS", 25, y + 6, { width: 545, align: "center" });
  y += 20;

  // Calcular altura de observaciones
  let observacionesText = "";
  if (equiposTecnologicos && equiposTecnologicos.length > 0) {
    observacionesText = equiposTecnologicos
      .map(equipo => `${equipo.tipo || "Equipo sin tipo"}: ${equipo.observaciones || "Sin observaciones"}`)
      .join("\n\n");
  } else {
    observacionesText = "Sin observaciones registradas.";
  }

  doc.rect(25, y, 545, 130).stroke();
  doc.font("Helvetica").fontSize(8).text(observacionesText, 30, y + 5, { width: 535 });
  y += 130;
  doc.rect(25, y, 545, 20).stroke();
  doc.font("Helvetica-Bold").fontSize(9).text("EVIDENCIAS", 25, y + 6, { width: 545, align: "center" });
  y += 20;

  const celdaW = 272.5;
  const celdaH = 130;
  const labelH = 16;

  // Renderizar evidencias de equipos tecnológicos (hasta 2 fotos por equipo en la celda)
  for (let i = 0; i < 4; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cx = 25 + col * celdaW;
    const cy = y + row * (celdaH + labelH);

    const equipo = equiposTecnologicos[i];
    const nombre = equipo ? (equipo.tipo || `Equipo ${i + 1}`) : "";
    const evidenciasEquipo = evidenciasEquipoPorIndex.get(i) || [];

    // Etiqueta con nombre y fecha EXIF
    const fechaExifEquipo = exifEquipos.get(i);
    doc.rect(cx, cy, celdaW, labelH).stroke();
    doc.font("Helvetica-Bold").fontSize(7).text(nombre, cx + 3, cy + 4, { width: fechaExifEquipo ? celdaW / 2 - 6 : celdaW - 6, ellipsis: true });
    if (fechaExifEquipo) doc.font("Helvetica").fontSize(6).fillColor("#555555").text(`Foto: ${fechaExifEquipo}`, cx + 3, cy + 5, { width: celdaW - 6, align: "right" }).fillColor("black");

    // Caja de imagen
    doc.rect(cx, cy + labelH, celdaW, celdaH).stroke();
    dibujarEvidenciasEnCaja(doc, evidenciasEquipo, cx + 3, cy + labelH + 3, celdaW - 6, celdaH - 6, {
      fontSize: 7,
      colorVacio: "#aaaaaa",
      textoVacio: "Sin evidencia."
    });
  }
  // ID debajo de la grilla de evidencias (2 filas × (labelH + celdaH))
  dibujarIdInspeccion(doc, general, y + 2 * (labelH + celdaH));

  // Páginas de continuación para los equipos que tengan más de 2 fotos
  for (let i = 0; i < 4; i++) {
    const equipo = equiposTecnologicos[i];
    const nombre = equipo ? (equipo.tipo || `Equipo ${i + 1}`) : `Equipo ${i + 1}`;
    const evidenciasEquipo = evidenciasEquipoPorIndex.get(i) || [];
    renderPaginasEvidenciasExtra(doc, general, "EQUIPO TECNOLÓGICO", nombre, evidenciasEquipo);
  }
}



// Renderizar el bloque de aprobación al final del documento.
// aprobaciones: { inspector: {nombre}, jefe: {...}, copasst: {...} }.
// No se dibuja ninguna firma manuscrita/biométrica (restricción legal): se
// imprime el nombre de quien aprobó cada rol. Si falta un rol, queda la línea
// en blanco (aprobación pendiente).
function renderAprobaciones(doc, y, aprobaciones = null) {
  doc.save();
  doc.lineWidth(0.5);
  const colW = 545 / 3;
  const boxH = 60;
  doc.rect(25, y, 545, boxH).stroke();

  const roles = [
    { key: "inspector", label: "APROBADO POR INSPECTOR" },
    { key: "jefe", label: "APROBADO POR JEFE DE AREA" },
    { key: "copasst", label: "APROBADO POR COPASST" }
  ];

  roles.forEach(({ key, label }, i) => {
    const fx = 25 + i * colW;
    if (i > 0) doc.moveTo(fx, y).lineTo(fx, y + boxH).stroke();

    const lineY = y + 32;
    const aprobacion = aprobaciones?.[key];

    if (aprobacion?.nombre) {
      doc.font("Helvetica-Bold").fontSize(8).text(aprobacion.nombre, fx + 4, y + 6, { width: colW - 8, align: "center" });
    }

    doc.moveTo(fx + 12, lineY).lineTo(fx + colW - 12, lineY).stroke();
    doc.font("Helvetica-Bold").fontSize(6.5).text(label, fx, lineY + 4, { width: colW, align: "center" });
  });

  doc.restore();
}

//PAGINA 5 (BOTIQUIN)
function renderPaginaBotiquin(doc, general, botiquin, idx, evidenciasBotiquinPorIndex = new Map(), fechaExif, esUltimo = false, aprobaciones = null) {
  let y = 25;

  doc.rect(25, y, 545, 70).stroke();
  doc.rect(25, y, 150, 70).stroke();
  doc.image(path.resolve(__dirname, "../../views/img/Cargo.png"), 27, y + 3, { fit: [146, 64], align: "center", valign: "center" });
  doc.rect(175, y, 245, 70).stroke();
  doc.font("Helvetica-Bold").fontSize(15).text("INSPECCION DE BOTIQUIN", 175, y + 24, { width: 245, align: "center" });
  doc.rect(420, y, 150, 23).stroke();
  doc.rect(420, y + 23, 150, 23).stroke();
  doc.rect(420, y + 46, 150, 24).stroke();
  doc.font("Helvetica").fontSize(9)
    .text("CODIGO: ST-FST 25", 425, y + 7)
    .text("VERSION: 01", 425, y + 30)
    .text("FECHA DE VERSION: 4/6/2026", 425, y + 53);

  y += 70;

  // Fila 1: FECHA | SEDE
  doc.rect(25, y, 272.5, 25).stroke();
  doc.rect(297.5, y, 272.5, 25).stroke();
  doc.font("Helvetica-Bold").fontSize(9).text("FECHA DE INSPECCION:", 30, y + 8, { width: 120 });
  doc.font("Helvetica").fontSize(9).text(general.fecha || "", 155, y + 8, { width: 130 });
  doc.font("Helvetica-Bold").fontSize(9).text("SEDE:", 302, y + 8, { width: 30 });
  doc.font("Helvetica").fontSize(9).text(general.sedeOperacion || "", 335, y + 8, { width: 227 });
  y += 25;

  // Fila 2: AREA | RESPONSABLE INSPECCION
  doc.rect(25, y, 272.5, 25).stroke();
  doc.rect(297.5, y, 272.5, 25).stroke();
  doc.font("Helvetica-Bold").fontSize(9).text("AREA DE TRABAJO:", 30, y + 8, { width: 90 });
  doc.font("Helvetica").fontSize(9).text(general.areaTrabajo || "", 123, y + 8, { width: 167 });
  doc.font("Helvetica-Bold").fontSize(9).text("RESPONSABLE INSPECCION:", 302, y + 8, { width: 140 });
  doc.font("Helvetica").fontSize(9).text(general.responsableInspeccion || "", 445, y + 8, { width: 120 });
  y += 25;

  // Fila 3: RESPONSABLE DEL AREA A INSPECCIONAR (ancho completo)
  doc.rect(25, y, 545, 25).stroke();
  doc.font("Helvetica-Bold").fontSize(9).text("RESPONSABLE DEL AREA A INSPECCIONAR:", 30, y + 8, { width: 230 });
  doc.font("Helvetica").fontSize(9).text(general.jefeResponsable || "", 265, y + 8, { width: 300 });
  y += 25;

  // Fila 4: N. BOTIQUIN | UBICACION
  doc.rect(25, y, 272.5, 25).stroke();
  doc.rect(297.5, y, 272.5, 25).stroke();
  doc.font("Helvetica-Bold").fontSize(9).text("N. DE BOTIQUIN:", 30, y + 8, { width: 90 });
  doc.font("Helvetica").fontSize(9).text(botiquin?.numero || "", 123, y + 8, { width: 162 });
  doc.font("Helvetica-Bold").fontSize(9).text("UBICACION:", 302, y + 8, { width: 65 });
  doc.font("Helvetica").fontSize(9).text(botiquin?.ubicacion || "", 370, y + 8, { width: 195 });
  y += 25;

  doc.rect(25, y, 545, 20).stroke();
  doc.font("Helvetica").fontSize(8).text("CONVENCIONES: B: Bueno   R: Regular   M: Malo   NC: No Contiene   NA: No Aplica", 25, y + 5, { width: 545, align: "center" });
  y += 20;

  // columnas: [No, ITEM, IDEAL, REAL, INTEG., VENCE, PLAN, FECHA, CUMP., AFECTAC.] = 545 total
  const columnas = [20, 180, 32, 32, 42, 52, 52, 42, 35, 58];
  const encabezados = ["No", "ITEM", "IDEAL", "REAL", "INTEG.", "VENCE", "PLAN", "FECHA", "CUMP.", "AFECTAC."];

  const dibujarCabeceraTabla = (yc) => {
    let xc = 25;
    encabezados.forEach((titulo, i) => {
      doc.rect(xc, yc, columnas[i], 16).stroke();
      doc.font("Helvetica-Bold").fontSize(6.5).text(titulo, xc + 1, yc + 4, { width: columnas[i] - 2, align: "center" });
      xc += columnas[i];
    });
    return yc + 16;
  };

  y = dibujarCabeceraTabla(y);

  const items = Array.isArray(botiquin?.items) ? botiquin.items : [];

  if (items.length > 0) {
    items.forEach((item, itemIndex) => {
      const itemText = item?.item || "";
      doc.font("Helvetica").fontSize(6.5);
      const itemH = doc.heightOfString(itemText, { width: columnas[1] - 4 });
      const rowH = Math.max(14, itemH + 6);

      if (y + rowH > 800) {
        doc.addPage();
        y = 25;
        y = dibujarCabeceraTabla(y);
      }

      let xx = 25;
      const fila = [
        String(item?.no || itemIndex + 1),
        itemText,
        String(item?.cantidadIdeal || ""),
        String(item?.cantidadReal || ""),
        item?.integridadEmpaque || "",
        item?.fechaVencimiento || "NA",
        item?.planIntervencion || "",
        item?.fechaIntervencion || (item?.planIntervencion === "Ninguna" ? "-" : ""),
        item?.cumplimiento || (item?.planIntervencion === "Ninguna" ? "-" : ""),
        item?.afectacionServicio || (item?.planIntervencion === "Ninguna" ? "-" : "")
      ];

      // Dibujar fila de la tabla
      fila.forEach((valor, i) => {
        doc.rect(xx, y, columnas[i], rowH).stroke();
        const align = i === 1 ? "left" : "center";
        const textY = i === 1 ? y + 3 : y + Math.max(3, (rowH - 8) / 2);
        doc.font("Helvetica").fontSize(6.5).text(valor, xx + 2, textY, {
          width: columnas[i] - 4,
          align,
          lineBreak: i === 1
        });
        xx += columnas[i];
      });

      y += rowH;
    });
  } else {
    let xs = 25;
    columnas.forEach((col, i) => {
      doc.rect(xs, y, col, 14).stroke();
      if (i === 1) doc.font("Helvetica").fontSize(6.5).text("Sin items registrados", xs + 2, y + 3, { width: col - 4 });
      xs += col;
    });
    y += 14;
  }

  y += 6;
  const aprobacionesH = esUltimo ? 80 : 0;
  if (y + 20 + 50 + 20 + 115 + aprobacionesH > 817) {
    doc.addPage();
    y = 25;
  }

  doc.rect(25, y, 545, 20).stroke();
  doc.font("Helvetica-Bold").fontSize(9).text("OBSERVACION GENERAL", 25, y + 6, { width: 545, align: "center" });
  y += 20;

  const observacionGeneral = botiquin?.observacionGeneral
    || items.find((item) => String(item?.observaciones || "").trim())?.observaciones
    || "Sin observacion registrada.";

  doc.rect(25, y, 545, 35).stroke();
  doc.font("Helvetica").fontSize(8).text(observacionGeneral, 30, y + 6, { width: 535 });
  y += 35;

  if (y + 20 + 115 + aprobacionesH > 817) {
    doc.addPage();
    y = 25;
  }

  doc.rect(25, y, 545, 20).stroke();
  doc.font("Helvetica-Bold").fontSize(9).text("EVIDENCIA GENERAL", 30, y + 6);
  if (fechaExif) doc.font("Helvetica").fontSize(7).fillColor("#555555").text(`Fecha: ${fechaExif}`, 30, y + 7, { width: 535, align: "right" }).fillColor("black");
  y += 20;

  doc.rect(25, y, 545, 115).stroke();
  const evidenciaArchivos = evidenciasBotiquinPorIndex.get(idx) || [];
  dibujarEvidenciasEnCaja(doc, evidenciaArchivos, 29, y + 5, 537, 105, { textoVacio: "Sin evidencia general adjunta." });
  y += 115;

  if (!esUltimo) {
    dibujarIdInspeccion(doc, general, y);
    renderPaginasEvidenciasExtra(doc, general, "BOTIQUÍN", botiquin?.numero, evidenciaArchivos);
    return;
  }

  // Último botiquín: las evidencias adicionales (si las hay) van antes del bloque de aprobación, nunca después.
  const extra = renderPaginasEvidenciasExtra(doc, general, "BOTIQUÍN", botiquin?.numero, evidenciaArchivos, { dibujarIdEnUltima: false });

  let yAprobaciones;
  if (extra) {
    const cabeEnLaMismaPagina = extra.lastY + 20 + 60 + 20 <= 817;
    if (cabeEnLaMismaPagina) {
      yAprobaciones = extra.lastY + 20;
    } else {
      dibujarIdInspeccion(doc, general, extra.lastY + 8);
      doc.addPage();
      yAprobaciones = 25;
    }
  } else {
    yAprobaciones = y + 20;
  }

  renderAprobaciones(doc, yAprobaciones, aprobaciones);
  dibujarIdInspeccion(doc, general, yAprobaciones + 60 + 4);
}



// ===== generar PDF =====
async function generarPdfPrueba(req, res) {
  try {
    const data = leerPayload(req);
    const evidenciasPorIndex = extraerEvidenciasPorIndex(req.files, "evidencia");
    const evidenciasCamillaPorIndex = extraerEvidenciasPorIndex(req.files, "evidencia-camilla");
    const evidenciasSenalizacionPorIndex = extraerEvidenciasPorIndex(req.files, "evidencia-senalizacion");
    const evidenciasEquipoTecnologicoPorIndex = extraerEvidenciasPorIndex(req.files, "equipo-tecnologico-evidencia");
    const evidenciasBotiquinPorIndex = extraerEvidenciasPorIndex(req.files, "botiquin-evidencia");
    const pdfGenerado = await crearPdfInspeccionExtintor(
      data,
      evidenciasPorIndex,
      evidenciasCamillaPorIndex,
      evidenciasSenalizacionPorIndex,
      evidenciasEquipoTecnologicoPorIndex,
      evidenciasBotiquinPorIndex,
      req.body
    );

    const nombrePdf = `${data?.inspeccionId || "inspeccion-sst"}.pdf`;

    const pdfFinal = await optimizarPdf(pdfGenerado, {
      profile: "inspection",
      fileName: nombrePdf
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${nombrePdf}"`
    );

    return res.status(200).send(pdfFinal);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="inspeccion-sst.pdf"');

    return res.status(200).send(pdfBuffer);
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : "Error generando PDF";
    return res.status(500).json({ ok: false, errores: [mensaje] });
  }
}

// ===== subir PDF a OneDrive (carpeta Respuestas_PDF) =====
async function subirPdfAOneDrive(pdfBuffer, inspeccionId, sedeOperacion = null) {
  const token = await getAccessToken();
  const userId = getRequiredEnv("ONEDRIVE_USER_ID");
  const excelPath = process.env.ONEDRIVE_EXCEL_PATH || "";
  const normalizado = excelPath.replace(/\\/g, "/").trim();
  const conSlash = normalizado.startsWith("/") ? normalizado : `/${normalizado}`;
  const carpetaPadre = conSlash.slice(0, conSlash.lastIndexOf("/"));
  const nombreArchivo = `${inspeccionId || "inspeccion"}.pdf`;
  const carpetaDestino = resolverCarpetaDestinoPdf(sedeOperacion);
  const rutaPdf = `${carpetaPadre}/${carpetaDestino}/${nombreArchivo}`;

  const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(userId)}/drive/root:${encodeURI(rutaPdf)}:/content`;

  const resp = await fetch(url, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/pdf" },
    body: pdfBuffer
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(`Error OneDrive/PDF: ${err?.error?.message || resp.status}`);
  }

  const item = await resp.json().catch(() => ({}));
  return item?.webUrl || null;
}

// Decide el correo destino según la sede (con fallback manual/GRAPH_EMAIL_TO_TEST).
function resolverCorreoDestino(sedeOperacion, correoManual) {
  const sede = (sedeOperacion || "").toLowerCase().trim();
  if (sede.includes("santa marta")) return "jmmontenegro201@gmail.com";
  if (sede.includes("urab")) return "cargobanolp@cargoban.com.co";
  return correoManual || process.env.GRAPH_EMAIL_TO_TEST;
}

// Arma el HTML del correo de notificación de inspección. Reutilizado tanto por
// el envío inmediato (enviarPdfPruebaCorreo) como por el envío tras completar
// las 3 aprobaciones (aprobaciones.controller.js).
function construirHtmlCorreo({ inspeccionId, numInspeccion, fecha, sedeOperacion, areaTrabajo, jefeResponsable, responsableInspeccion, cargoResponsable, webUrl, titulo = "Nueva inspección registrada" }) {
  const htmlCorreo = `<!DOCTYPE html>
<html lang="es">
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px;">
  <tr><td align="center">
    <table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;">

      <!-- TARJETA PRINCIPAL -->
      <tr>
        <td style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);">

          <!-- FRANJA SUPERIOR -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="background:#1a2e4a;height:6px;font-size:0;">&nbsp;</td></tr>
          </table>

          <!-- LOGO (dentro de la tarjeta) -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:28px 40px 0;text-align:center;">
                <img src="${LOGO_URL}" alt="Cargoban" style="height:60px;width:auto;" />
              </td>
            </tr>
          </table>

          <!-- ENCABEZADO -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:32px 40px 20px;">
                <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#6b7280;">Inspección SST</p>
                <h1 style="margin:0 0 14px;font-size:22px;font-weight:700;color:#111827;line-height:1.3;">${titulo}</h1>
                ${numInspeccion != null ? `<p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#1a2e4a;">Inspección N.° ${numInspeccion}</p>` : ""}
                <span style="display:inline-block;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:8px;padding:7px 14px;font-size:13px;font-weight:700;color:#1a2e4a;letter-spacing:.5px;font-family:monospace;">${inspeccionId || "-"}</span>
              </td>
            </tr>
          </table>

          <!-- DIVISOR -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="border-top:1px solid #f3f4f6;font-size:0;">&nbsp;</td></tr>
          </table>

          <!-- TABLA DATOS -->
          <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13.5px;">
            <tr>
              <td style="padding:14px 40px;color:#6b7280;font-weight:600;width:44%;border-bottom:1px solid #f3f4f6;">Fecha</td>
              <td style="padding:14px 40px 14px 0;color:#111827;border-bottom:1px solid #f3f4f6;">${fecha || "-"}</td>
            </tr>
            <tr style="background:#fafafa;">
              <td style="padding:14px 40px;color:#6b7280;font-weight:600;border-bottom:1px solid #f3f4f6;">Sede</td>
              <td style="padding:14px 40px 14px 0;color:#111827;border-bottom:1px solid #f3f4f6;">${sedeOperacion || "-"}</td>
            </tr>
            <tr>
              <td style="padding:14px 40px;color:#6b7280;font-weight:600;border-bottom:1px solid #f3f4f6;">Área de trabajo</td>
              <td style="padding:14px 40px 14px 0;color:#111827;border-bottom:1px solid #f3f4f6;">${areaTrabajo || "-"}</td>
            </tr>
            <tr style="background:#fafafa;">
              <td style="padding:14px 40px;color:#6b7280;font-weight:600;border-bottom:1px solid #f3f4f6;">Jefe del área</td>
              <td style="padding:14px 40px 14px 0;color:#111827;border-bottom:1px solid #f3f4f6;">${jefeResponsable || "-"}</td>
            </tr>
            <tr>
              <td style="padding:14px 40px;color:#6b7280;font-weight:600;border-bottom:1px solid #f3f4f6;">Responsable inspección</td>
              <td style="padding:14px 40px 14px 0;color:#111827;border-bottom:1px solid #f3f4f6;">${responsableInspeccion || "-"}</td>
            </tr>
            <tr style="background:#fafafa;">
              <td style="padding:14px 40px;color:#6b7280;font-weight:600;">Cargo</td>
              <td style="padding:14px 40px 14px 0;color:#111827;">${cargoResponsable || "-"}</td>
            </tr>
          </table>

          <!-- PDF + BOTÓN -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="border-top:1px solid #f3f4f6;font-size:0;">&nbsp;</td></tr>
            <tr>
              <td style="padding:24px 40px 28px;text-align:center;">
                <p style="margin:0 0 16px;font-size:13px;color:#6b7280;line-height:1.6;">El informe completo está <strong style="color:#111827;">adjunto en PDF</strong> a este correo.</p>
                {{LINK_ONEDRIVE}}
              </td>
            </tr>
          </table>

          <!-- FOOTER (dentro de la tarjeta) -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="border-top:1px solid #f3f4f6;font-size:0;">&nbsp;</td></tr>
            <tr>
              <td style="padding:14px 40px;text-align:center;">
                <p style="margin:0;font-size:11px;color:#9ca3af;">Este es un mensaje automático · Por favor no responder</p>
              </td>
            </tr>
          </table>

        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;

  const linkHtml = webUrl
    ? `<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center"><a href="${webUrl}" style="display:inline-block;padding:12px 28px;background:#1a2e4a;color:#ffffff;text-decoration:none;border-radius:8px;font-size:13px;font-weight:600;letter-spacing:.3px;">Ver documento en OneDrive</a></td></tr></table>`
    : "";

  return htmlCorreo.replace("{{LINK_ONEDRIVE}}", linkHtml);
}

// ===== enviar Correo =====
async function enviarPdfPruebaCorreo(req, res) {
  try {
    const data = leerPayload(req);
    const payloadData = data?.payload || data;

    const correoDestino = resolverCorreoDestino(
      payloadData?.sedeOperacion,
      data?.correoDestino
    );

    if (!correoDestino) {
      return res.status(400).json({
        ok: false,
        errores: [
          "No se pudo determinar el destinatario. " +
          "Verifique la sede o defina GRAPH_EMAIL_TO_TEST en .env"
        ]
      });
    }

    const evidenciasPorIndex = extraerEvidenciasPorIndex(
      req.files,
      "evidencia"
    );

    const evidenciasCamillaPorIndex = extraerEvidenciasPorIndex(
      req.files,
      "evidencia-camilla"
    );

    const evidenciasSenalizacionPorIndex = extraerEvidenciasPorIndex(
      req.files,
      "evidencia-senalizacion"
    );

    const evidenciasEquipoTecnologicoPorIndex =
      extraerEvidenciasPorIndex(
        req.files,
        "equipo-tecnologico-evidencia"
      );

    const evidenciasBotiquinPorIndex =
      extraerEvidenciasPorIndex(
        req.files,
        "botiquin-evidencia"
      );

    // 1. Generar PDF con PDFKit.
    const pdfGenerado = await crearPdfInspeccionExtintor(
      payloadData,
      evidenciasPorIndex,
      evidenciasCamillaPorIndex,
      evidenciasSenalizacionPorIndex,
      evidenciasEquipoTecnologicoPorIndex,
      evidenciasBotiquinPorIndex,
      req.body
    );

    const nombrePdf =
      `${payloadData?.inspeccionId || "inspeccion-sst"}.pdf`;

    // 2. Optimizar una sola vez con Ghostscript.
    // Si falla, optimizarPdf devuelve automáticamente el original.
    const pdfFinal = await optimizarPdf(pdfGenerado, {
      profile: "inspection",
      fileName: nombrePdf
    });

    const numInspeccionCorreo =
      payloadData?.numInspeccion ?? null;

    // 3. Subir el PDF final a OneDrive.
    const webUrl = await subirPdfAOneDrive(
      pdfFinal,
      payloadData?.inspeccionId,
      payloadData?.sedeOperacion
    );

    const htmlFinal = construirHtmlCorreo({
      inspeccionId: payloadData?.inspeccionId,
      numInspeccion: numInspeccionCorreo,
      fecha: payloadData?.fecha,
      sedeOperacion: payloadData?.sedeOperacion,
      areaTrabajo: payloadData?.areaTrabajo,
      jefeResponsable: payloadData?.jefeResponsable,
      responsableInspeccion: payloadData?.responsableInspeccion,
      cargoResponsable: payloadData?.cargoResponsable,
      webUrl
    });

    const subjectNum =
      numInspeccionCorreo != null
        ? `N.° ${numInspeccionCorreo} – `
        : "";

    // 4. Adjuntar el mismo PDF final al correo.
    await enviarCorreoPorGraph({
      to: correoDestino,
      subject:
        `Inspección SST ${subjectNum}` +
        `${payloadData?.inspeccionId || ""}`,
      html: htmlFinal,
      pdfBuffer: pdfFinal,
      nombre: nombrePdf
    });

    return res.status(200).json({
      ok: true,
      mensaje: `Correo enviado a ${correoDestino}`
    });
  } catch (error) {
    const mensaje =
      error instanceof Error
        ? error.message
        : "Error enviando correo";

    return res.status(500).json({
      ok: false,
      errores: [mensaje]
    });
  }
}
// ===== Exports =====
module.exports = {
  generarPdfPrueba,
  enviarPdfPruebaCorreo,
  crearPdfInspeccionExtintor,
  subirPdfAOneDrive,
  enviarCorreoPorGraph,
  resolverCorreoDestino,
  construirHtmlCorreo
};
