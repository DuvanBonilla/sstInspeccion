const path = require("node:path");
const PDFDocument = require("pdfkit");

const { construirEvidenciasDesdeOneDrive } = require("./evidencia.service");

const { resolverFechaEvidencia } = require("../utils/fechaEvidencia");

const CONFIG_EVIDENCIA_SST = {
  // Cajas normales de evidencia
  altoCaja: 130,
  padding: 5,

  // Las horizontales se muestran más pequeñas
  escalaHorizontal: 0.5,
};

function dibujarIdInspeccion(doc, general, y) {
  const id = general.inspeccionId || "";
  if (!id) return;
  const num =
    general.numInspeccion != null
      ? `Inspección N.° ${general.numInspeccion}  ·  `
      : "";
  doc
    .font("Helvetica")
    .fontSize(7)
    .fillColor("#9ca3af")
    .text(`${num}${id}`, 25, y + 4, { width: 545, align: "right" })
    .fillColor("black");
}

function dibujarImagenAjustada(doc, file, x, y, width, height, fontSize = 9) {
  try {
    if (!file?.buffer?.length) {
      throw new Error("La evidencia no contiene una imagen válida.");
    }

    const img = doc.openImage(file.buffer);

    if (!img?.width || !img?.height) {
      throw new Error("No fue posible obtener las dimensiones de la imagen.");
    }

    // =====================================================
    // ESPACIO DISPONIBLE
    // =====================================================

    const padding = 5;

    const availableWidth = Math.max(1, width - padding * 2);

    const availableHeight = Math.max(1, height - padding * 2);

    // =====================================================
    // RELACIÓN DE ASPECTO
    // =====================================================

    const imageRatio = img.width / img.height;

    const containerRatio = availableWidth / availableHeight;

    const esHorizontal = img.width > img.height;

    let finalWidth;
    let finalHeight;

    // =====================================================
    // IMAGEN HORIZONTAL
    // =====================================================

    if (esHorizontal) {
      /*
       * Las evidencias horizontales no necesitan ocupar
       * todo el ancho de la caja.
       *
       * Se limita su tamaño visual al 65 % del ancho
       * disponible y se conserva la proporción.
       */
      const maxHorizontalWidth = availableWidth * 0.55;

      finalWidth = maxHorizontalWidth;
      finalHeight = finalWidth / imageRatio;

      /*
       * Protección adicional:
       * si por alguna relación de aspecto especial la
       * altura resultara mayor que el espacio disponible,
       * se limita por altura.
       */
      if (finalHeight > availableHeight) {
        finalHeight = availableHeight;
        finalWidth = finalHeight * imageRatio;
      }
    }

    // =====================================================
    // IMAGEN VERTICAL O CUADRADA
    // =====================================================
    else {
      /*
       * Conservamos exactamente el comportamiento anterior
       * para fotografías verticales/cuadradas.
       */
      if (imageRatio > containerRatio) {
        finalWidth = availableWidth;
        finalHeight = finalWidth / imageRatio;
      } else {
        finalHeight = availableHeight;
        finalWidth = finalHeight * imageRatio;
      }
    }

    // =====================================================
    // CENTRAR EN LA CAJA
    // =====================================================

    const finalX = x + (width - finalWidth) / 2;

    const finalY = y + (height - finalHeight) / 2;

    doc.image(file.buffer, finalX, finalY, {
      width: finalWidth,
      height: finalHeight,
    });
  } catch (error) {
    console.error(
      "[PDF SST] Error renderizando evidencia:",
      error?.message || error,
    );

    doc
      .font("Helvetica")
      .fontSize(fontSize)
      .fillColor("#666666")
      .text(
        "No fue posible renderizar la evidencia.",
        x + 5,
        y + height / 2 - fontSize,
        {
          width: Math.max(1, width - 10),
          align: "center",
        },
      )
      .fillColor("black");
  }
}

function dibujarEvidenciasEnCaja(doc, files, x, y, width, height, opts = {}) {
  const {
    fontSize = 9,
    colorVacio = "black",
    textoVacio = "Sin evidencia adjunta.",
  } = opts;
  const lista = Array.isArray(files)
    ? files.filter((f) => f?.buffer?.length)
    : [];

  if (lista.length === 0) {
    doc
      .font("Helvetica")
      .fontSize(fontSize)
      .fillColor(colorVacio)
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

function renderPaginasEvidenciasExtra(
  doc,
  general,
  titulo,
  subtitulo,
  files,
  opts = {},
) {
  const { dibujarIdEnUltima = true } = opts;

  const extra = Array.isArray(files)
    ? files.filter((f) => f?.buffer?.length).slice(2)
    : [];

  if (extra.length === 0) {
    return null;
  }

  const porPagina = 4;
  const gap = 8;

  let lastY = null;

  for (let inicio = 0; inicio < extra.length; inicio += porPagina) {
    doc.addPage();

    let y = 25;

    // =====================================================
    // TÍTULO
    // =====================================================

    doc
      .font("Helvetica-Bold")
      .fontSize(13)
      .text("EVIDENCIAS ADICIONALES", 25, y, {
        width: 545,
        align: "center",
      });

    y += 20;

    doc
      .font("Helvetica")
      .fontSize(10)
      .text(`${titulo}${subtitulo ? " — " + subtitulo : ""}`, 25, y, {
        width: 545,
        align: "center",
      });

    y += 30;

    // =====================================================
    // LOTE ACTUAL
    // =====================================================

    const lote = extra.slice(inicio, inicio + porPagina);

    const esUltimoLote = inicio + porPagina >= extra.length;

    let finGrid;

    // =====================================================
    // 1 FOTO
    // =====================================================

    if (lote.length === 1) {
      const celdaW = 400;

      // Antes: 400
      // Reducimos altura para evitar tanto espacio vacío.
      const celdaH = 300;

      const xInicio = 25 + (545 - celdaW) / 2;

      doc.rect(xInicio, y, celdaW, celdaH).stroke();

      dibujarImagenAjustada(doc, lote[0], xInicio, y, celdaW, celdaH, 8);

      finGrid = y + celdaH;
    }

    // =====================================================
    // 2 FOTOS
    // =====================================================
    else if (lote.length === 2) {
      const celdaW = (545 - gap) / 2;

      const celdaH = 300;

      lote.forEach((file, i) => {
        const cx = 25 + i * (celdaW + gap);

        doc.rect(cx, y, celdaW, celdaH).stroke();

        dibujarImagenAjustada(doc, file, cx, y, celdaW, celdaH, 8);
      });

      finGrid = y + celdaH;
    }

    // =====================================================
    // 3 O 4 FOTOS
    // =====================================================
    else {
      const celdaW = (545 - gap) / 2;

      const celdaH = 220;

      lote.forEach((file, i) => {
        const col = i % 2;

        const row = Math.floor(i / 2);

        const cx = 25 + col * (celdaW + gap);

        const cy = y + row * (celdaH + gap);

        doc.rect(cx, cy, celdaW, celdaH).stroke();

        dibujarImagenAjustada(
          doc,
          file,
          cx + 5,
          cy + 5,
          celdaW - 10,
          celdaH - 10,
          8,
        );
      });

      const filas = Math.ceil(lote.length / 2);

      finGrid = y + filas * celdaH + Math.max(0, filas - 1) * gap;
    }

    // =====================================================
    // PIE
    // =====================================================

    if (esUltimoLote) {
      lastY = finGrid;

      if (dibujarIdEnUltima) {
        dibujarIdInspeccion(doc, general, finGrid + gap);
      }
    } else {
      dibujarIdInspeccion(doc, general, finGrid + gap);
    }
  }

  return {
    lastY,
  };
}

async function extraerFechasArchivos(fileMapa, body, prefijo) {
  const fechas = new Map();

  for (const [idx, archivos] of fileMapa) {
    const file = archivos?.[0];
    const lastmod = body?.[`${prefijo}-${idx}-0-lastmod`];

    const fecha = await resolverFechaEvidencia(file, lastmod);

    if (fecha) fechas.set(idx, fecha);
  }

  return fechas;
}

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
    mapa.set(
      idx,
      arr.map((x) => x.file),
    );
  }

  return mapa;
}

function renderPaginaCamilla(
  doc,
  general,
  camilla,
  idx,
  evidenciasCamillaPorIndex,
  fechaExif,
) {
  const condiciones = camilla.condiciones || {};
  let y = 25;

  doc.rect(25, y, 545, 70).stroke();
  doc.rect(25, y, 150, 70).stroke();
  doc.image(path.resolve(__dirname, "../../views/img/Cargo.png"), 27, y + 3, {
    fit: [146, 64],
    align: "center",
    valign: "center",
  });
  doc.rect(175, y, 245, 70).stroke();
  doc
    .font("Helvetica-Bold")
    .fontSize(15)
    .text("INSPECCIÓN DE CAMILLA\nEMERGENCIA", 175, y + 15, {
      width: 245,
      align: "center",
    });
  doc.rect(420, y, 150, 23).stroke();
  doc.rect(420, y + 23, 150, 23).stroke();
  doc.rect(420, y + 46, 150, 24).stroke();
  doc
    .font("Helvetica")
    .fontSize(9)
    .text("CODIGO: ST-FST 25", 425, y + 7)
    .text("VERSIÓN: 01", 425, y + 30)
    .text("FECHA DE VERSIÓN: 4/6/2026", 425, y + 53);

  y += 70;

  doc.rect(25, y, 272.5, 25).stroke();
  doc.rect(297.5, y, 272.5, 25).stroke();
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .text("FECHA DE INSPECCIÓN:", 30, y + 8);
  doc
    .font("Helvetica")
    .fontSize(9)
    .text(general.fecha || "", 155, y + 8);
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .text("SEDE:", 302, y + 8);
  doc
    .font("Helvetica")
    .fontSize(9)
    .text(general.sedeOperacion || "", 332, y + 8, { width: 230 });

  y += 25;

  doc.rect(25, y, 272.5, 25).stroke();
  doc.rect(297.5, y, 272.5, 25).stroke();
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .text("AREA DE TRABAJO:", 30, y + 8);
  doc
    .font("Helvetica")
    .fontSize(9)
    .text(general.areaTrabajo || "", 130, y + 8, { width: 160 });
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .text("RESPONSABLE INSPECCIÓN:", 302, y + 8);
  doc
    .font("Helvetica")
    .fontSize(9)
    .text(general.responsableInspeccion || "", 445, y + 8, { width: 120 });

  y += 25;

  doc.rect(25, y, 380, 25).stroke();
  doc.rect(405, y, 165, 25).stroke();
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .text("RESPONSABLE DEL AREA A INSPECCIONAR:", 30, y + 8);
  doc
    .font("Helvetica")
    .fontSize(9)
    .text(general.jefeResponsable || "", 240, y + 8, { width: 155 });
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .text("N° DE CAMILLA:", 410, y + 8);
  doc
    .font("Helvetica")
    .fontSize(9)
    .text(camilla.numero || "", 490, y + 8);

  y += 25;

  doc.rect(25, y, 545, 40).stroke();
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .text("DETALLE DE LAS CONDICIONES DE LA CAMILLA.", 25, y + 5, {
      width: 545,
      align: "center",
    });
  doc
    .font("Helvetica")
    .fontSize(8)
    .text(
      "CONVENCIONES: B: Bueno   R: Regular   M: Malo   NC: No contiene   NA: No aplica",
      25,
      y + 20,
      { width: 545, align: "center" },
    );

  y += 40;

  const columnas = [430, 115];
  let x = 25;
  ["ELEMENTO", "ESTADO"].forEach((titulo, i) => {
    doc.rect(x, y, columnas[i], 25).stroke();
    doc
      .font("Helvetica-Bold")
      .fontSize(8)
      .text(titulo, x, y + 7, { width: columnas[i], align: "center" });
    x += columnas[i];
  });

  y += 25;

  const elementos = [
    ["Señalización", condiciones.senalizacion || ""],
    ["Acceso", condiciones.acceso || ""],
    [
      "Estado del soporte",
      condiciones.estadoSoporte || condiciones.soporte || "",
    ],
    ["Instalación a pared", condiciones.instalacionPared || ""],
    [
      "Correas de seguridad",
      condiciones.correasSeguridad || condiciones.correas || "",
    ],
    ["Limpieza", condiciones.limpieza || ""],
    ["Inmovilizador", condiciones.inmovilizador || ""],
  ];

  const rowHeight = 28;
  elementos.forEach((fila) => {
    let xx = 25;
    fila.forEach((valor, i) => {
      doc.rect(xx, y, columnas[i], rowHeight).stroke();
      doc
        .font("Helvetica")
        .fontSize(8)
        .text(valor, xx + 5, y + 8, { width: columnas[i] - 10 });
      xx += columnas[i];
    });
    y += rowHeight;
  });

  doc.rect(25, y, 545, 25).stroke();
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .text("OBSERVACIONES", 25, y + 7, { width: 545, align: "center" });
  y += 25;

  doc.rect(25, y, 545, 35).stroke();
  doc
    .font("Helvetica")
    .fontSize(9)
    .text(camilla.observaciones || "", 30, y + 8, { width: 535 });
  y += 35;

  doc.rect(25, y, 545, 20).stroke();
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .text("EVIDENCIAS", 30, y + 6);
  if (fechaExif)
    doc
      .font("Helvetica")
      .fontSize(7)
      .fillColor("#555555")
      .text(`Fecha: ${fechaExif}`, 30, y + 7, { width: 535, align: "right" })
      .fillColor("black");
  y += 20;


  const evidenciaArchivos = evidenciasCamillaPorIndex.get(idx) || [];

  // Caja de evidencia más compacta.
  const altoCajaEvidencia = 130;
  const paddingEvidencia = 5;

  doc.rect(25, y, 545, altoCajaEvidencia).stroke();

  dibujarEvidenciasEnCaja(
    doc,
    evidenciaArchivos,
    30,
    y + paddingEvidencia,
    535,
    altoCajaEvidencia - paddingEvidencia * 2,
  );

  y += altoCajaEvidencia;
  const extra = renderPaginasEvidenciasExtra(
    doc,
    general,
    "CAMILLA",
    camilla.numero,
    evidenciaArchivos,
    {
      dibujarIdEnUltima: false,
    },
  );

  if (extra) {
    return {
      lastY: extra.lastY,
      tienePaginaExtra: true,
    };
  }

  return {
    lastY: y,
    tienePaginaExtra: false,
  };
}

function renderPaginaSenalizacion(
  doc,
  general,
  senalizacion,
  idx,
  evidenciasSenalizacionPorIndex,
  fechaExif,
) {
  let y = 25;

  doc.rect(25, y, 545, 70).stroke();
  doc.rect(25, y, 150, 70).stroke();
  doc.image(path.resolve(__dirname, "../../views/img/Cargo.png"), 27, y + 3, {
    fit: [146, 64],
    align: "center",
    valign: "center",
  });
  doc.rect(175, y, 245, 70).stroke();
  doc
    .font("Helvetica-Bold")
    .fontSize(15)
    .text("INSPECCIÓN DE\nSEÑALIZACIÓN", 175, y + 15, {
      width: 245,
      align: "center",
    });
  doc.rect(420, y, 150, 23).stroke();
  doc.rect(420, y + 23, 150, 23).stroke();
  doc.rect(420, y + 46, 150, 24).stroke();
  doc
    .font("Helvetica")
    .fontSize(9)
    .text("CODIGO: ST-FST 25", 425, y + 7)
    .text("VERSIÓN: 01", 425, y + 30)
    .text("FECHA DE VERSIÓN: 4/6/2026", 425, y + 53);

  y += 70;

  doc.rect(25, y, 272.5, 25).stroke();
  doc.rect(297.5, y, 272.5, 25).stroke();
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .text("FECHA DE INSPECCIÓN:", 30, y + 8);
  doc
    .font("Helvetica")
    .fontSize(9)
    .text(general.fecha || "", 155, y + 8);
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .text("SEDE:", 302, y + 8);
  doc
    .font("Helvetica")
    .fontSize(9)
    .text(general.sedeOperacion || "", 332, y + 8);
  y += 25;

  doc.rect(25, y, 272.5, 25).stroke();
  doc.rect(297.5, y, 272.5, 25).stroke();
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .text("AREA DE TRABAJO:", 30, y + 8);
  doc
    .font("Helvetica")
    .fontSize(9)
    .text(general.areaTrabajo || "", 130, y + 8);
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .text("RESPONSABLE INSPECCIÓN:", 302, y + 8);
  doc
    .font("Helvetica")
    .fontSize(9)
    .text(general.responsableInspeccion || "", 445, y + 8);
  y += 25;

  doc.rect(25, y, 545, 25).stroke();
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .text("RESPONSABLE DEL AREA A INSPECCIONAR:", 30, y + 8);
  doc
    .font("Helvetica")
    .fontSize(9)
    .text(general.jefeResponsable || "", 240, y + 8, { width: 320 });
  y += 25;

  doc.rect(25, y, 272.5, 25).stroke();
  doc.rect(297.5, y, 272.5, 25).stroke();
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .text("UBICACIÓN:", 30, y + 8);
  doc
    .font("Helvetica")
    .fontSize(9)
    .text(senalizacion.ubicacion || "", 95, y + 8);
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .text("TIPO DE SEÑALIZACIÓN:", 302, y + 8);
  doc
    .font("Helvetica")
    .fontSize(9)
    .text(senalizacion.tipo || "", 420, y + 8, { width: 140 });
  y += 25;

  doc.rect(25, y, 545, 40).stroke();
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .text("DETALLE DE LAS CONDICIONES DE LA SEÑALIZACIÓN", 25, y + 5, {
      width: 545,
      align: "center",
    });
  doc
    .font("Helvetica")
    .fontSize(8)
    .text(
      "CONVENCIONES: B: Bueno   R: Regular   M: Malo   NC: No contiene   NA: No aplica",
      25,
      y + 20,
      { width: 545, align: "center" },
    );
  y += 40;

  const columnas = [400, 145];
  let x = 25;
  ["ELEMENTO", "ESTADO"].forEach((titulo, i) => {
    doc.rect(x, y, columnas[i], 25).stroke();
    doc
      .font("Helvetica-Bold")
      .fontSize(8)
      .text(titulo, x, y + 7, { width: columnas[i], align: "center" });
    x += columnas[i];
  });
  y += 25;

  const elementos = [
    ["Cantidad", senalizacion.cantidad || ""],
    ["Estado", senalizacion.estado || ""],
    ["Aseo", senalizacion.aseo || ""],
  ];

  const rowHeight = 30;
  elementos.forEach((fila) => {
    let xx = 25;
    fila.forEach((valor, i) => {
      doc.rect(xx, y, columnas[i], rowHeight).stroke();
      doc
        .font("Helvetica")
        .fontSize(8)
        .text(valor, xx + 5, y + 8, { width: columnas[i] - 10 });
      xx += columnas[i];
    });
    y += rowHeight;
  });

  doc.rect(25, y, 545, 25).stroke();
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .text("OBSERVACIONES", 25, y + 7, { width: 545, align: "center" });
  y += 25;
  doc.rect(25, y, 545, 35).stroke();
  doc
    .font("Helvetica")
    .fontSize(9)
    .text(senalizacion.observaciones || "", 30, y + 8, { width: 535 });
  y += 35;

  doc.rect(25, y, 545, 20).stroke();
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .text("EVIDENCIAS", 30, y + 6);
  if (fechaExif)
    doc
      .font("Helvetica")
      .fontSize(7)
      .fillColor("#555555")
      .text(`Fecha: ${fechaExif}`, 30, y + 7, { width: 535, align: "right" })
      .fillColor("black");
  y += 20;
  doc.rect(25, y, 545, 180).stroke();

  const evidenciaArchivos = evidenciasSenalizacionPorIndex.get(idx) || [];

  dibujarEvidenciasEnCaja(doc, evidenciaArchivos, 30, y + 5, 535, 170);

  y += 180;

  const extra = renderPaginasEvidenciasExtra(
    doc,
    general,
    "SEÑALIZACIÓN",
    senalizacion.tipo,
    evidenciaArchivos,
    {
      dibujarIdEnUltima: false,
    },
  );

  if (extra) {
    return {
      lastY: extra.lastY,
      tienePaginaExtra: true,
    };
  }

  return {
    lastY: y,
    tienePaginaExtra: false,
  };
}

function renderPaginaEquiposTecnologicos(
  doc,
  general,
  equiposTecnologicos,
  evidenciasEquipoPorIndex = new Map(),
  exifEquipos = new Map(),
) {
  let y = 25;

  doc.rect(25, y, 545, 70).stroke();
  doc.rect(25, y, 150, 70).stroke();
  doc.image(path.resolve(__dirname, "../../views/img/Cargo.png"), 27, y + 3, {
    fit: [146, 64],
    align: "center",
    valign: "center",
  });
  doc.rect(175, y, 245, 70).stroke();
  doc
    .font("Helvetica-Bold")
    .fontSize(15)
    .text(
      "INSPECCIÓN DE\nEQUIPO TECNOLÓGICO DE\nATENCIÓN DE EMERGENCIA",
      175,
      y + 15,
      { width: 245, align: "center" },
    );
  doc.rect(420, y, 150, 23).stroke();
  doc.rect(420, y + 23, 150, 23).stroke();
  doc.rect(420, y + 46, 150, 24).stroke();
  doc
    .font("Helvetica")
    .fontSize(9)
    .text("CODIGO: ST-FST 25", 425, y + 7)
    .text("VERSIÓN: 01", 425, y + 30)
    .text("FECHA DE VERSIÓN: 4/6/2026", 425, y + 53);

  y += 70;

  doc.rect(25, y, 272.5, 25).stroke();
  doc.rect(297.5, y, 272.5, 25).stroke();
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .text("FECHA DE INSPECCIÓN:", 30, y + 8);
  doc
    .font("Helvetica")
    .fontSize(9)
    .text(general.fecha || "", 155, y + 8);
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .text("SEDE:", 302, y + 8);
  doc
    .font("Helvetica")
    .fontSize(9)
    .text(general.sedeOperacion || "", 332, y + 8);
  y += 25;

  doc.rect(25, y, 272.5, 25).stroke();
  doc.rect(297.5, y, 272.5, 25).stroke();
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .text("AREA DE TRABAJO:", 30, y + 8);
  doc
    .font("Helvetica")
    .fontSize(9)
    .text(general.areaTrabajo || "", 130, y + 8);
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .text("RESPONSABLE INSPECCIÓN:", 302, y + 8);
  doc
    .font("Helvetica")
    .fontSize(9)
    .text(general.responsableInspeccion || "", 445, y + 8);
  y += 25;

  doc.rect(25, y, 545, 25).stroke();
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .text("RESPONSABLE DEL AREA A INSPECCIONAR:", 30, y + 8);
  doc
    .font("Helvetica")
    .fontSize(9)
    .text(general.jefeResponsable || "", 240, y + 8, { width: 320 });
  y += 25;

  doc.rect(25, y, 545, 25).stroke();
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .text("DETALLE DE CONDICIONES - EQUIPOS TECNOLÓGICOS", 25, y + 7, {
      width: 545,
      align: "center",
    });
  y += 25;

  doc.rect(25, y, 545, 20).stroke();
  doc
    .font("Helvetica")
    .fontSize(7)
    .text(
      "CONVENCIONES: B: Bueno   R: Regular   M: Malo   NC: No contiene   NA: No aplica",
      25,
      y + 5,
      { width: 545, align: "center" },
    );
  y += 20;

  const columnas = [140, 70, 70, 90, 90, 85];
  let x = 25;
  [
    "TIPO",
    "UBICACIÓN",
    "CANTIDAD",
    "ESTADO",
    "MANTENIMIENTO",
    "AFECTACIÓN",
  ].forEach((titulo, i) => {
    doc.rect(x, y, columnas[i], 20).stroke();
    doc
      .font("Helvetica-Bold")
      .fontSize(7)
      .text(titulo, x + 2, y + 5, { width: columnas[i] - 4, align: "center" });
    x += columnas[i];
  });
  y += 20;

  const rowHeight = 18;

  if (equiposTecnologicos && equiposTecnologicos.length > 0) {
    equiposTecnologicos.forEach((equipo) => {
      let xx = 25;
      const fila = [
        equipo.tipo || "",
        equipo.ubicacion || "",
        equipo.cantidad || "",
        equipo.estado || "",
        equipo.mantenimiento || "",
        equipo.afectacionServicio || "",
      ];

      fila.forEach((valor, i) => {
        doc.rect(xx, y, columnas[i], rowHeight).stroke();
        doc
          .font("Helvetica")
          .fontSize(7)
          .text(valor, xx + 2, y + 5, { width: columnas[i] - 4 });
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
      if (i === 0)
        doc
          .font("Helvetica")
          .fontSize(7)
          .text("Sin equipos registrados", x + 2, y + 5);
      x += col;
    });
    y += rowHeight;
  }

  y += 10;
  doc.rect(25, y, 545, 20).stroke();
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .text("OBSERVACIONES DETALLADAS", 25, y + 6, {
      width: 545,
      align: "center",
    });
  y += 20;

  let observacionesText = "";
  if (equiposTecnologicos && equiposTecnologicos.length > 0) {
    observacionesText = equiposTecnologicos
      .map(
        (equipo) =>
          `${equipo.tipo || "Equipo sin tipo"}: ${equipo.observaciones || "Sin observaciones"}`,
      )
      .join("\n\n");
  } else {
    observacionesText = "Sin observaciones registradas.";
  }

  doc.rect(25, y, 545, 130).stroke();
  doc
    .font("Helvetica")
    .fontSize(8)
    .text(observacionesText, 30, y + 5, { width: 535 });
  y += 130;
  doc.rect(25, y, 545, 20).stroke();
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .text("EVIDENCIAS", 25, y + 6, { width: 545, align: "center" });
  y += 20;

  const celdaW = 272.5;
  const celdaH = 130;
  const labelH = 16;

  for (let i = 0; i < 4; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cx = 25 + col * celdaW;
    const cy = y + row * (celdaH + labelH);

    const equipo = equiposTecnologicos[i];
    const nombre = equipo ? equipo.tipo || `Equipo ${i + 1}` : "";
    const evidenciasEquipo = evidenciasEquipoPorIndex.get(i) || [];

    // Etiqueta con nombre y fecha EXIF
    const fechaExifEquipo = exifEquipos.get(i);
    doc.rect(cx, cy, celdaW, labelH).stroke();
    doc
      .font("Helvetica-Bold")
      .fontSize(7)
      .text(nombre, cx + 3, cy + 4, {
        width: fechaExifEquipo ? celdaW / 2 - 6 : celdaW - 6,
        ellipsis: true,
      });
    if (fechaExifEquipo)
      doc
        .font("Helvetica")
        .fontSize(6)
        .fillColor("#555555")
        .text(`Foto: ${fechaExifEquipo}`, cx + 3, cy + 5, {
          width: celdaW - 6,
          align: "right",
        })
        .fillColor("black");

    // Caja de imagen
    doc.rect(cx, cy + labelH, celdaW, celdaH).stroke();
    dibujarEvidenciasEnCaja(
      doc,
      evidenciasEquipo,
      cx + 3,
      cy + labelH + 3,
      celdaW - 6,
      celdaH - 6,
      {
        fontSize: 7,
        colorVacio: "#aaaaaa",
        textoVacio: "Sin evidencia.",
      },
    );
  }
  // =====================================================
  // POSICIÓN FINAL DEL GRID FIJO DE EVIDENCIAS
  // =====================================================

  const finGrid = y + 2 * (labelH + celdaH);

  dibujarIdInspeccion(doc, general, finGrid);

  let ultimaPosicion = {
    lastY: finGrid,
    tienePaginaExtra: false,
  };

  // =====================================================
  // EVIDENCIAS ADICIONALES
  // =====================================================

  for (let i = 0; i < 4; i++) {
    const equipo = equiposTecnologicos[i];

    const nombre = equipo
      ? equipo.tipo || `Equipo ${i + 1}`
      : `Equipo ${i + 1}`;

    const evidenciasEquipo = evidenciasEquipoPorIndex.get(i) || [];

    const extra = renderPaginasEvidenciasExtra(
      doc,
      general,
      "EQUIPO TECNOLÓGICO",
      nombre,
      evidenciasEquipo,
      {
        dibujarIdEnUltima: false,
      },
    );

    if (extra?.lastY) {
      ultimaPosicion = {
        lastY: extra.lastY,
        tienePaginaExtra: true,
      };
    }
  }

  return ultimaPosicion;
}

function renderPaginaBotiquin(
  doc,
  general,
  botiquin,
  idx,
  evidenciasBotiquinPorIndex = new Map(),
  fechaExif,
  esUltimo = false,
  aprobaciones = null,
) {
  let y = 25;

  doc.rect(25, y, 545, 70).stroke();
  doc.rect(25, y, 150, 70).stroke();
  doc.image(path.resolve(__dirname, "../../views/img/Cargo.png"), 27, y + 3, {
    fit: [146, 64],
    align: "center",
    valign: "center",
  });
  doc.rect(175, y, 245, 70).stroke();
  doc
    .font("Helvetica-Bold")
    .fontSize(15)
    .text("INSPECCION DE BOTIQUIN", 175, y + 24, {
      width: 245,
      align: "center",
    });
  doc.rect(420, y, 150, 23).stroke();
  doc.rect(420, y + 23, 150, 23).stroke();
  doc.rect(420, y + 46, 150, 24).stroke();
  doc
    .font("Helvetica")
    .fontSize(9)
    .text("CODIGO: ST-FST 25", 425, y + 7)
    .text("VERSION: 01", 425, y + 30)
    .text("FECHA DE VERSION: 4/6/2026", 425, y + 53);

  y += 70;

  doc.rect(25, y, 272.5, 25).stroke();
  doc.rect(297.5, y, 272.5, 25).stroke();
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .text("FECHA DE INSPECCION:", 30, y + 8, { width: 120 });
  doc
    .font("Helvetica")
    .fontSize(9)
    .text(general.fecha || "", 155, y + 8, { width: 130 });
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .text("SEDE:", 302, y + 8, { width: 30 });
  doc
    .font("Helvetica")
    .fontSize(9)
    .text(general.sedeOperacion || "", 335, y + 8, { width: 227 });
  y += 25;

  doc.rect(25, y, 272.5, 25).stroke();
  doc.rect(297.5, y, 272.5, 25).stroke();
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .text("AREA DE TRABAJO:", 30, y + 8, { width: 90 });
  doc
    .font("Helvetica")
    .fontSize(9)
    .text(general.areaTrabajo || "", 123, y + 8, { width: 167 });
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .text("RESPONSABLE INSPECCION:", 302, y + 8, { width: 140 });
  doc
    .font("Helvetica")
    .fontSize(9)
    .text(general.responsableInspeccion || "", 445, y + 8, { width: 120 });
  y += 25;

  doc.rect(25, y, 545, 25).stroke();
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .text("RESPONSABLE DEL AREA A INSPECCIONAR:", 30, y + 8, { width: 230 });
  doc
    .font("Helvetica")
    .fontSize(9)
    .text(general.jefeResponsable || "", 265, y + 8, { width: 300 });
  y += 25;

  doc.rect(25, y, 272.5, 25).stroke();
  doc.rect(297.5, y, 272.5, 25).stroke();
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .text("N. DE BOTIQUIN:", 30, y + 8, { width: 90 });
  doc
    .font("Helvetica")
    .fontSize(9)
    .text(botiquin?.numero || "", 123, y + 8, { width: 162 });
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .text("UBICACION:", 302, y + 8, { width: 65 });
  doc
    .font("Helvetica")
    .fontSize(9)
    .text(botiquin?.ubicacion || "", 370, y + 8, { width: 195 });
  y += 25;

  doc.rect(25, y, 545, 20).stroke();
  doc
    .font("Helvetica")
    .fontSize(8)
    .text(
      "CONVENCIONES: B: Bueno   R: Regular   M: Malo   NC: No Contiene   NA: No Aplica",
      25,
      y + 5,
      { width: 545, align: "center" },
    );
  y += 20;

  const columnas = [20, 180, 32, 32, 42, 52, 52, 42, 35, 58];
  const encabezados = [
    "No",
    "ITEM",
    "IDEAL",
    "REAL",
    "INTEG.",
    "VENCE",
    "PLAN",
    "FECHA",
    "CUMP.",
    "AFECTAC.",
  ];

  const dibujarCabeceraTabla = (yc) => {
    let xc = 25;
    encabezados.forEach((titulo, i) => {
      doc.rect(xc, yc, columnas[i], 16).stroke();
      doc
        .font("Helvetica-Bold")
        .fontSize(6.5)
        .text(titulo, xc + 1, yc + 4, {
          width: columnas[i] - 2,
          align: "center",
        });
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
        item?.fechaIntervencion ||
          (item?.planIntervencion === "Ninguna" ? "-" : ""),
        item?.cumplimiento || (item?.planIntervencion === "Ninguna" ? "-" : ""),
        item?.afectacionServicio ||
          (item?.planIntervencion === "Ninguna" ? "-" : ""),
      ];

      fila.forEach((valor, i) => {
        doc.rect(xx, y, columnas[i], rowH).stroke();
        const align = i === 1 ? "left" : "center";
        const textY = i === 1 ? y + 3 : y + Math.max(3, (rowH - 8) / 2);
        doc
          .font("Helvetica")
          .fontSize(6.5)
          .text(valor, xx + 2, textY, {
            width: columnas[i] - 4,
            align,
            lineBreak: i === 1,
          });
        xx += columnas[i];
      });

      y += rowH;
    });
  } else {
    let xs = 25;
    columnas.forEach((col, i) => {
      doc.rect(xs, y, col, 14).stroke();
      if (i === 1)
        doc
          .font("Helvetica")
          .fontSize(6.5)
          .text("Sin items registrados", xs + 2, y + 3, { width: col - 4 });
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
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .text("OBSERVACION GENERAL", 25, y + 6, { width: 545, align: "center" });
  y += 20;

  const observacionGeneral =
    botiquin?.observacionGeneral ||
    items.find((item) => String(item?.observaciones || "").trim())
      ?.observaciones ||
    "Sin observacion registrada.";

  doc.rect(25, y, 545, 35).stroke();
  doc
    .font("Helvetica")
    .fontSize(8)
    .text(observacionGeneral, 30, y + 6, { width: 535 });
  y += 35;

  if (y + 20 + 115 + aprobacionesH > 817) {
    doc.addPage();
    y = 25;
  }

  doc.rect(25, y, 545, 20).stroke();
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .text("EVIDENCIA GENERAL", 30, y + 6);
  if (fechaExif)
    doc
      .font("Helvetica")
      .fontSize(7)
      .fillColor("#555555")
      .text(`Fecha: ${fechaExif}`, 30, y + 7, { width: 535, align: "right" })
      .fillColor("black");
  y += 20;

  doc.rect(25, y, 545, 115).stroke();
  const evidenciaArchivos = evidenciasBotiquinPorIndex.get(idx) || [];
  dibujarEvidenciasEnCaja(doc, evidenciaArchivos, 29, y + 5, 537, 105, {
    textoVacio: "Sin evidencia general adjunta.",
  });
  y += 115;

  if (!esUltimo) {
    dibujarIdInspeccion(doc, general, y);
    renderPaginasEvidenciasExtra(
      doc,
      general,
      "BOTIQUÍN",
      botiquin?.numero,
      evidenciaArchivos,
    );
    return;
  }

  const extra = renderPaginasEvidenciasExtra(
    doc,
    general,
    "BOTIQUÍN",
    botiquin?.numero,
    evidenciaArchivos,
    { dibujarIdEnUltima: false },
  );

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

function renderAprobaciones(doc, y, aprobaciones = null) {
  doc.save();
  doc.lineWidth(0.5);
  const colW = 545 / 3;
  const boxH = 60;
  doc.rect(25, y, 545, boxH).stroke();

  const roles = [
    { key: "inspector", label: "APROBADO POR INSPECTOR" },
    { key: "jefe", label: "APROBADO POR JEFE DE AREA" },
    { key: "copasst", label: "APROBADO POR COPASST" },
  ];

  roles.forEach(({ key, label }, i) => {
    const fx = 25 + i * colW;
    if (i > 0)
      doc
        .moveTo(fx, y)
        .lineTo(fx, y + boxH)
        .stroke();

    const lineY = y + 32;
    const aprobacion = aprobaciones?.[key];

    if (aprobacion?.nombre) {
      doc
        .font("Helvetica-Bold")
        .fontSize(8)
        .text(aprobacion.nombre, fx + 4, y + 6, {
          width: colW - 8,
          align: "center",
        });
    }

    doc
      .moveTo(fx + 12, lineY)
      .lineTo(fx + colW - 12, lineY)
      .stroke();
    doc
      .font("Helvetica-Bold")
      .fontSize(6.5)
      .text(label, fx, lineY + 4, { width: colW, align: "center" });
  });

  doc.restore();
}

async function crearPdfInspeccionExtintor(
  data,
  evidenciasPorIndex = new Map(),
  evidenciasCamillaPorIndex = new Map(),
  evidenciasSenalizacionPorIndex = new Map(),
  evidenciasEquipoTecnologicoPorIndex = new Map(),
  evidenciasBotiquinPorIndex = new Map(),
  body = {},
  opts = {},
) {
  const { aprobaciones = null, fechasPrecomputadas = null } = opts;

  const [
    exifExtintores,
    exifCamillas,
    exifSenalizaciones,
    exifEquipos,
    exifBotiquines,
  ] = fechasPrecomputadas
    ? [
        fechasPrecomputadas.extintores || new Map(),
        fechasPrecomputadas.camillas || new Map(),
        fechasPrecomputadas.senalizaciones || new Map(),
        fechasPrecomputadas.equipos || new Map(),
        fechasPrecomputadas.botiquines || new Map(),
      ]
    : await Promise.all([
        extraerFechasArchivos(evidenciasPorIndex, body, "evidencia"),
        extraerFechasArchivos(
          evidenciasCamillaPorIndex,
          body,
          "evidencia-camilla",
        ),
        extraerFechasArchivos(
          evidenciasSenalizacionPorIndex,
          body,
          "evidencia-senalizacion",
        ),
        extraerFechasArchivos(
          evidenciasEquipoTecnologicoPorIndex,
          body,
          "equipo-tecnologico-evidencia",
        ),
        extraerFechasArchivos(
          evidenciasBotiquinPorIndex,
          body,
          "botiquin-evidencia",
        ),
      ]);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 25 });
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const general = data || {};

    let primeraPaginaUsada = false;
    function nuevaPagina() {
      if (primeraPaginaUsada) {
        doc.addPage();
      } else {
        primeraPaginaUsada = true;
      }
    }

    const extintores = Array.isArray(general.extintores)
      ? general.extintores
      : [];
    const camillas =
      Array.isArray(general.camillas) && general.camillas.length > 0
        ? general.camillas
        : [];
    const senalizaciones =
      Array.isArray(general.senalizaciones) && general.senalizaciones.length > 0
        ? general.senalizaciones
        : [];
    const equiposTecnologicos =
      Array.isArray(general.equiposTecnologicos) &&
      general.equiposTecnologicos.length > 0
        ? general.equiposTecnologicos
        : [];
    const botiquines =
      Array.isArray(general.botiquines) && general.botiquines.length > 0
        ? general.botiquines
        : [];

    extintores.forEach((extintor, idx) => {
      nuevaPagina();

      const condiciones = extintor.condiciones || {};
      let y = 25;

      doc.rect(25, y, 545, 70).stroke();
      doc.rect(25, y, 150, 70).stroke();
      doc.image(
        path.resolve(__dirname, "../../views/img/Cargo.png"),
        27,
        y + 3,
        { fit: [146, 64], align: "center", valign: "center" },
      );
      doc.rect(175, y, 245, 70).stroke();
      doc
        .font("Helvetica-Bold")
        .fontSize(16)
        .text("INSPECCIÓN DE\nEXTINTORES\nEMERGENCIA", 175, y + 8, {
          width: 245,
          align: "center",
          lineGap: 2,
        });
      doc.rect(420, y, 150, 23).stroke();
      doc.rect(420, y + 23, 150, 23).stroke();
      doc.rect(420, y + 46, 150, 24).stroke();
      doc
        .font("Helvetica")
        .fontSize(9)
        .text("CODIGO: ST-FST 25", 425, y + 7)
        .text("VERSIÓN: 01", 425, y + 30)
        .text("FECHA DE VERSIÓN: 4/6/2026", 425, y + 53);

      y += 70;

      doc.rect(25, y, 272.5, 25).stroke();
      doc.rect(297.5, y, 272.5, 25).stroke();
      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .text("FECHA DE INSPECCIÓN:", 30, y + 8);
      doc
        .font("Helvetica")
        .fontSize(9)
        .text(general.fecha || "", 155, y + 8);
      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .text("SEDE:", 302, y + 8);
      doc
        .font("Helvetica")
        .fontSize(9)
        .text(general.sedeOperacion || "", 332, y + 8, { width: 230 });
      y += 25;

      doc.rect(25, y, 272.5, 25).stroke();
      doc.rect(297.5, y, 272.5, 25).stroke();
      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .text("AREA DE TRABAJO:", 30, y + 8);
      doc
        .font("Helvetica")
        .fontSize(9)
        .text(general.areaTrabajo || "", 130, y + 8, { width: 160 });
      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .text("RESPONSABLE INSPECCIÓN:", 302, y + 8);
      doc
        .font("Helvetica")
        .fontSize(9)
        .text(general.responsableInspeccion || "", 445, y + 8, { width: 120 });
      y += 25;

      doc.rect(25, y, 545, 25).stroke();
      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .text("RESPONSABLE DEL AREA:", 30, y + 8);
      doc
        .font("Helvetica")
        .fontSize(9)
        .text(
          (general.jefeResponsable || "") +
            (general.cargoJefe ? "  —  " + general.cargoJefe : ""),
          175,
          y + 8,
          { width: 390 },
        );
      y += 25;

      const datosExtintor = [
        ["N° DE EXTINTOR:", extintor.numero || ""],
        ["TIPO DE EXTINTOR:", extintor.tipo || ""],
        ["CAPACIDAD:", extintor.capacidad || ""],
        [
          "PRÓXIMA RECARGA:",
          `Mes: ${extintor.mesRecarga || ""}   Año: ${extintor.anioRecarga || ""}`,
        ],
      ];

      datosExtintor.forEach(([label, valor]) => {
        doc.rect(25, y, 545, 22).stroke();

        doc
          .font("Helvetica-Bold")
          .fontSize(9)
          .text(label, 30, y + 6, { continued: true, width: 535 })
          .font("Helvetica")
          .fontSize(9)
          .text(valor, { continued: false, width: 535 });

        y += 22;
      });

      doc.rect(25, y, 545, 40).stroke();
      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .text("DETALLE DE LAS CONDICIONES DEL EXTINTOR.", 25, y + 5, {
          width: 545,
          align: "center",
        });
      doc
        .font("Helvetica")
        .fontSize(8)
        .text(
          "CONVENCIONES: B: Bueno   R: Regular   M: Malo   NC: No contiene   NA: No aplica",
          25,
          y + 20,
          { width: 545, align: "center" },
        );
      y += 40;

      const columnas = [190, 82.5, 190, 82.5];
      let x = 25;
      ["ELEMENTO", "ESTADO", "ELEMENTO", "ESTADO"].forEach((titulo, i) => {
        doc.rect(x, y, columnas[i], 25).stroke();
        doc
          .font("Helvetica-Bold")
          .fontSize(8)
          .text(titulo, x, y + 7, { width: columnas[i], align: "center" });
        x += columnas[i];
      });
      y += 25;

      const elementos = [
        [
          "Acceso",
          condiciones.acceso || "",
          "Presión",
          condiciones.presion || "",
        ],
        [
          "Visibilidad",
          condiciones.visibilidad || "",
          "Pin de seguridad",
          condiciones.pin || "",
        ],
        [
          "Señalización",
          condiciones.senalizacion || "",
          "Manguera",
          condiciones.manguera || "",
        ],
        [
          "Pared altura\n1.50m",
          condiciones.paredAltura || "",
          "Boquilla",
          condiciones.boquilla || "",
        ],
        [
          "Piso base",
          condiciones.piso || "",
          "Corneta",
          condiciones.corneta || "",
        ],
        [
          "Limpieza",
          condiciones.limpieza || "",
          "Pintura",
          condiciones.pintura || "",
        ],
        [
          "Rotulo",
          condiciones.rotulo || "",
          "Manija de transporte",
          condiciones.manija || "",
        ],
        [
          "Cilindro",
          condiciones.cilindro || "",
          "Sello de garantía",
          condiciones.sello || "",
        ],
        [
          "Manómetro",
          condiciones.manometro || "",
          "Llave spanner",
          condiciones.llaveSpanner || "",
        ],
      ];

      const rowHeight = 24;
      elementos.forEach((fila) => {
        let xx = 25;
        fila.forEach((valor, i) => {
          doc.rect(xx, y, columnas[i], rowHeight).stroke();
          doc
            .font("Helvetica")
            .fontSize(8)
            .text(valor, xx + 5, y + 8, {
              width: columnas[i] - 10,
              align: "left",
            });
          xx += columnas[i];
        });
        y += rowHeight;
      });

      const observacionesHeaderHeight = 25;
      const observacionesBoxHeight = 30;

      doc.rect(25, y, 545, observacionesHeaderHeight).stroke();
      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .text("OBSERVACIONES", 25, y + 7, { width: 545, align: "center" });
      y += observacionesHeaderHeight;
      doc.rect(25, y, 545, observacionesBoxHeight).stroke();
      doc
        .font("Helvetica")
        .fontSize(9)
        .text(extintor.observaciones || "", 30, y + 8, { width: 535 });
      y += observacionesBoxHeight;

      const evidenciaHeaderHeight = 20;
      const evidenciaBoxHeight = CONFIG_EVIDENCIA_SST.altoCaja;

      doc.rect(25, y, 545, evidenciaHeaderHeight).stroke();
      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .text("EVIDENCIAS", 30, y + 6);
      const fechaExifExt = exifExtintores.get(idx);
      if (fechaExifExt) {
        doc
          .font("Helvetica")
          .fontSize(7)
          .fillColor("#555555")
          .text(`Fecha: ${fechaExifExt}`, 30, y + 7, {
            width: 535,
            align: "right",
          })
          .fillColor("black");
      }
      y += evidenciaHeaderHeight;

      const altoCajaEvidencia = evidenciaBoxHeight;
      doc.rect(25, y, 545, altoCajaEvidencia).stroke();

      const evidenciaArchivos = evidenciasPorIndex.get(idx) || [];
      const evidenciaX = 30;
      const evidenciaY = y + 5;
      const evidenciaWidth = 535;
      const evidenciaHeight = Math.max(100, altoCajaEvidencia - 10);

      dibujarEvidenciasEnCaja(
        doc,
        evidenciaArchivos,
        evidenciaX,
        evidenciaY,
        evidenciaWidth,
        evidenciaHeight,
      );
      y += altoCajaEvidencia;
      dibujarIdInspeccion(doc, general, y);

      renderPaginasEvidenciasExtra(
        doc,
        general,
        "EXTINTOR",
        extintor.numero,
        evidenciaArchivos,
      );
    });

    let ultimaPosicion = null;

    camillas.forEach((camilla, idx) => {
      nuevaPagina();

      ultimaPosicion = renderPaginaCamilla(
        doc,
        general,
        camilla,
        idx,
        evidenciasCamillaPorIndex,
        exifCamillas.get(idx),
      );
    });

    senalizaciones.forEach((senalizacion, idx) => {
      nuevaPagina();

      ultimaPosicion = renderPaginaSenalizacion(
        doc,
        general,
        senalizacion,
        idx,
        evidenciasSenalizacionPorIndex,
        exifSenalizaciones.get(idx),
      );
    });

    if (equiposTecnologicos.length > 0) {
      nuevaPagina();

      ultimaPosicion = renderPaginaEquiposTecnologicos(
        doc,
        general,
        equiposTecnologicos,
        evidenciasEquipoTecnologicoPorIndex,
        exifEquipos,
      );
    }

    if (botiquines.length > 0) {
      botiquines.forEach((botiquin, idx) => {
        nuevaPagina();

        renderPaginaBotiquin(
          doc,
          general,
          botiquin,
          idx,
          evidenciasBotiquinPorIndex,
          exifBotiquines.get(idx),
          idx === botiquines.length - 1,
          aprobaciones,
        );
      });
    } else {
      const ALTO_TITULO = 40;
      const ALTO_APROBACIONES = 60;
      const ESPACIO_INFERIOR = 25;

      const espacioNecesario =
        ALTO_TITULO + ALTO_APROBACIONES + ESPACIO_INFERIOR;

      let yAprobaciones;

      if (
        ultimaPosicion &&
        ultimaPosicion.lastY &&
        ultimaPosicion.lastY + espacioNecesario <= 817
      ) {
        yAprobaciones = ultimaPosicion.lastY + 20;
      } else {
        nuevaPagina();

        yAprobaciones = 25;
      }

      doc
        .font("Helvetica-Bold")
        .fontSize(13)
        .text("APROBACIÓN DE LA INSPECCIÓN", 25, yAprobaciones, {
          width: 545,
          align: "center",
        });

      yAprobaciones += 40;

      renderAprobaciones(doc, yAprobaciones, aprobaciones);

      dibujarIdInspeccion(doc, general, yAprobaciones + 60 + 4);
    }

    doc.end();
  });
}

function construirDatosGenerales(row) {
  return {
    inspeccionId: row.inspeccion_id,
    numInspeccion: Number(row.num_inspeccion),
    fecha: row.fecha,
    sedeOperacion: row.sede_operacion,
    areaTrabajo: row.area_trabajo,
    jefeResponsable: row.jefe_responsable,
    cargoJefe: row.cargo_jefe,
    responsableInspeccion: row.responsable_inspeccion,
    cargoResponsable: row.cargo_responsable,
  };
}

async function generarPdfSstAprobacion(completa, row, aprobaciones) {
  const [ext, cam, sen, eqp, bot] = await Promise.all([
    construirEvidenciasDesdeOneDrive(completa.extintores),
    construirEvidenciasDesdeOneDrive(completa.camillas),
    construirEvidenciasDesdeOneDrive(completa.senalizaciones),
    construirEvidenciasDesdeOneDrive(completa.equiposTecnologicos),
    construirEvidenciasDesdeOneDrive(completa.botiquines),
  ]);

  const data = {
    ...construirDatosGenerales(row),

    extintores: completa.extintores,
    camillas: completa.camillas,
    senalizaciones: completa.senalizaciones,
    equiposTecnologicos: completa.equiposTecnologicos,
    botiquines: completa.botiquines,
  };

  return crearPdfInspeccionExtintor(
    data,
    ext.evidenciasPorIndex,
    cam.evidenciasPorIndex,
    sen.evidenciasPorIndex,
    eqp.evidenciasPorIndex,
    bot.evidenciasPorIndex,
    {},
    {
      aprobaciones,

      fechasPrecomputadas: {
        extintores: ext.fechas,
        camillas: cam.fechas,
        senalizaciones: sen.fechas,
        equipos: eqp.fechas,
        botiquines: bot.fechas,
      },
    },
  );
}

module.exports = {
  dibujarIdInspeccion,
  dibujarImagenAjustada,
  dibujarEvidenciasEnCaja,
  renderPaginasEvidenciasExtra,
  extraerFechasArchivos,
  extraerEvidenciasPorIndex,
  renderPaginaCamilla,
  renderPaginaSenalizacion,
  renderPaginaEquiposTecnologicos,
  renderPaginaBotiquin,
  renderAprobaciones,
  crearPdfInspeccionExtintor,
  generarPdfSstAprobacion,
};
