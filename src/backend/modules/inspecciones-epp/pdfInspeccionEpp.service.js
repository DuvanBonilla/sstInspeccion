const path = require("node:path");
const PDFDocument = require("pdfkit");

const MARGEN = 25;
const ANCHO = 545;
const LIMITE_INFERIOR = 800;

function texto(valor) {
  if (valor === null || valor === undefined) {
    return "";
  }

  return String(valor);
}

function formatearFecha(valor) {
  if (!valor) {
    return "";
  }

  if (valor instanceof Date) {
    const dia = String(valor.getUTCDate()).padStart(2, "0");
    const mes = String(valor.getUTCMonth() + 1).padStart(2, "0");
    const anio = valor.getUTCFullYear();

    return `${dia}/${mes}/${anio}`;
  }

  const fecha = String(valor).split("T")[0];

  const partes = fecha.split("-");

  if (partes.length === 3) {
    const [anio, mes, dia] = partes;

    return `${dia}/${mes}/${anio}`;
  }

  return String(valor);
}

function dibujarIdInspeccion(doc, general, y) {
  const inspeccionId = general?.inspeccionId || "";

  if (!inspeccionId) return;

  const num =
    general?.numInspeccion != null
      ? `Inspección N.° ${general.numInspeccion}  ·  `
      : "";

  doc
    .font("Helvetica")
    .fontSize(7)
    .fillColor("#9ca3af")
    .text(`${num}${inspeccionId}`, MARGEN, y + 4, {
      width: ANCHO,
      align: "right",
      height: 10,
      lineBreak: false,
    })
    .fillColor("black");
}

function dibujarImagenAjustada(
  doc,
  file,
  x,
  y,
  width,
  maxWidth,
  maxHeight,
  fontSize = 9,
) {
  try {
    if (!file?.buffer?.length) {
      throw new Error("Evidencia vacía");
    }

    const img = doc.openImage(file.buffer);

    // La imagen nunca podrá superar estos límites.
    // Mantiene siempre su proporción original.
    const ratio = Math.min(maxWidth / img.width, maxHeight / img.height, 1);

    const scaledW = img.width * ratio;
    const scaledH = img.height * ratio;

    // Centrar horizontalmente
    const cx = x + (width - scaledW) / 2;

    // Centrar verticalmente
    const cy = y + (maxHeight - scaledH) / 2;

    doc.image(file.buffer, cx, cy, {
      width: scaledW,
      height: scaledH,
    });

    return {
      width: scaledW,
      height: scaledH,
    };
  } catch (error) {
    console.error("Error al renderizar evidencia:", error);

    doc
      .font("Helvetica")
      .fontSize(fontSize)
      .fillColor("#666666")
      .text("No fue posible renderizar la evidencia.", x, y, {
        width: width,
        align: "center",
      })
      .fillColor("black");

    return {
      width: 0,
      height: 20,
    };
  }
}

function renderEncabezado(doc) {
  let y = MARGEN;

  doc.rect(MARGEN, y, ANCHO, 70).stroke();

  // Logo
  doc.rect(MARGEN, y, 150, 70).stroke();

  try {
    doc.image(path.resolve(__dirname, "../../../views/img/Cargo.png"), 27, y + 3, {
      fit: [146, 64],
      align: "center",
      valign: "center",
    });
  } catch {
    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .text("CARGOBAN", 27, y + 28, {
        width: 146,
        align: "center",
      });
  }

  // Título
  doc.rect(175, y, 245, 70).stroke();

  doc
    .font("Helvetica-Bold")
    .fontSize(14)
    .text("INSPECCIÓN DE ELEMENTOS\nDE PROTECCIÓN PERSONAL", 175, y + 18, {
      width: 245,
      align: "center",
      lineGap: 3,
    });

  // Información documental
  doc.rect(420, y, 150, 23).stroke();
  doc.rect(420, y + 23, 150, 23).stroke();
  doc.rect(420, y + 46, 150, 24).stroke();

  doc
    .font("Helvetica")
    .fontSize(9)
    .text("CÓDIGO: FPSST23", 425, y + 7)
    .text("VERSIÓN: 01", 425, y + 30)
    .text("FECHA DE VERSIÓN: 2026", 425, y + 53);

  return y + 70;
}

function renderInformacionGeneral(doc, general, y) {
  const mitad = ANCHO / 2;

  doc.rect(MARGEN, y, mitad, 25).stroke();
  doc.rect(MARGEN + mitad, y, mitad, 25).stroke();

  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .text("FECHA DE INSPECCIÓN:", 30, y + 8);

  doc
    .font("Helvetica")
    .fontSize(9)
    .text(texto(general.fecha), 155, y + 8);

  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .text("SEDE:", 302, y + 8);

  doc
    .font("Helvetica")
    .fontSize(9)
    .text(texto(general.sedeOperacion || general.sede), 335, y + 8, {
      width: 225,
    });

  y += 25;

  doc.rect(MARGEN, y, mitad, 25).stroke();
  doc.rect(MARGEN + mitad, y, mitad, 25).stroke();

  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .text("ÁREA DE TRABAJO:", 30, y + 8);

  doc
    .font("Helvetica")
    .fontSize(9)
    .text(texto(general.areaTrabajo || general.area), 130, y + 8, {
      width: 160,
    });

  doc
    .font("Helvetica-Bold")
    .fontSize(7.5)
    .text("RESPONSABLE DE LA INSPECCIÓN:", 302, y + 8, {
      width: 142,
      height: 12,
      lineBreak: false,
    });

  doc
    .font("Helvetica")
    .fontSize(8.5)
    .text(texto(general.responsableInspeccion), 448, y + 8, {
      width: 107,
      height: 12,
      lineBreak: false,
      ellipsis: true,
    });
  y += 25;

  doc.rect(MARGEN, y, ANCHO, 25).stroke();

  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .text("RESPONSABLE DEL ÁREA:", 30, y + 8);

  const jefe = general.jefeResponsable || general.jefeArea || "";

  const cargoJefe = general.cargoJefe || "";

  doc
    .font("Helvetica")
    .fontSize(9)
    .text(jefe + (cargoJefe ? ` — ${cargoJefe}` : ""), 165, y + 8, {
      width: 395,
    });

  y += 25;

  doc.rect(MARGEN, y, ANCHO, 25).stroke();

  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .text("INSPECTOR:", 30, y + 8);

  const responsable = general.responsableInspeccion || "";

  const cargoResponsable = general.cargoResponsable || "";

  doc
    .font("Helvetica")
    .fontSize(9)
    .text(
      responsable + (cargoResponsable ? ` — ${cargoResponsable}` : ""),
      95,
      y + 8,
      {
        width: 465,
      },
    );

  return y + 25;
}

function altoDatosTrabajador(doc, trabajador) {
  const columnas = [250, 120, 175];
  return 47 + Math.max(25, ...[trabajador.nombre, trabajador.codigo, trabajador.cargo]
    .map((valor, i) => altoTexto(doc, texto(valor), columnas[i] - 8) + 16));
}

function renderDatosTrabajador(doc, trabajador, numero, y) {
  const altoValores = altoDatosTrabajador(doc, trabajador) - 47;
  doc.rect(MARGEN, y, ANCHO, 25).stroke();

  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .text(`TRABAJADOR ${numero}`, MARGEN, y + 7, {
      width: ANCHO,
      align: "center",
    });

  y += 25;

  const columnas = [250, 120, 175];

  let x = MARGEN;

  const headers = ["NOMBRE Y APELLIDO", "CÓDIGO", "LABOR / CARGO"];

  headers.forEach((header, i) => {
    doc.rect(x, y, columnas[i], 22).stroke();

    doc
      .font("Helvetica-Bold")
      .fontSize(8)
      .text(header, x + 3, y + 7, {
        width: columnas[i] - 6,
        align: "center",
      });

    x += columnas[i];
  });

  y += 22;

  x = MARGEN;

  const valores = [trabajador.nombre, trabajador.codigo, trabajador.cargo];

  valores.forEach((valor, i) => {
    doc.rect(x, y, columnas[i], altoValores).stroke();

    doc
      .font("Helvetica")
      .fontSize(8)
      .text(texto(valor), x + 4, y + 8, {
        width: columnas[i] - 8,
        align: "center",
      });

    x += columnas[i];
  });

  return y + altoValores;
}

function renderTablaEpp(doc, trabajador, y, nuevaPagina) {
  const columnas = [365, 90, 90];
  const headers = ["ELEMENTO EPP", "CONDICIÓN", "USO"];
  const rowHeight = 22;

  function dibujarEncabezadoTabla(esContinuacion = false) {
    doc.rect(MARGEN, y, ANCHO, 38).stroke();

    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .text(
        esContinuacion
          ? "EVALUACIÓN DE EPP - CONTINUACIÓN"
          : "EVALUACIÓN DE ELEMENTOS DE PROTECCIÓN PERSONAL",
        MARGEN,
        y + 5,
        {
          width: ANCHO,
          align: "center",
        },
      );

    doc
      .font("Helvetica")
      .fontSize(7.5)
      .text(
        "CONVENCIONES: B: Bueno   R: Regular   M: Malo   NA: No aplica",
        MARGEN,
        y + 21,
        {
          width: ANCHO,
          align: "center",
        },
      );

    y += 38;

    let x = MARGEN;

    headers.forEach((header, i) => {
      doc.rect(x, y, columnas[i], 22).stroke();

      doc
        .font("Helvetica-Bold")
        .fontSize(8)
        .text(header, x, y + 7, {
          width: columnas[i],
          height: 12,
          align: "center",
          lineBreak: false,
        });

      x += columnas[i];
    });

    y += 22;
  }

  // Evitar encabezados solos al pie de página.
  const primeraFila = trabajador.elementos?.length ? rowHeight : 0;
  if (y + 60 + primeraFila > LIMITE_INFERIOR) {
    y = nuevaPagina(false);
  }

  dibujarEncabezadoTabla(false);

  const elementos = Array.isArray(trabajador.elementos)
    ? trabajador.elementos
    : [];

  elementos.forEach((elemento) => {
    // La fila completa pasa a la página siguiente.
    if (y + rowHeight > LIMITE_INFERIOR) {
      y = nuevaPagina(false);
      dibujarEncabezadoTabla(true);
    }

    let x = MARGEN;

    const fila = [elemento.elemento, elemento.condicion, elemento.uso];

    fila.forEach((valor, i) => {
      doc.rect(x, y, columnas[i], rowHeight).stroke();

      doc
        .font("Helvetica")
        .fontSize(8)
        .text(texto(valor), x + 5, y + 7, {
          width: columnas[i] - 10,
          height: rowHeight - 10,
          align: i === 0 ? "left" : "center",
          lineBreak: false,
          ellipsis: true,
        });

      x += columnas[i];
    });

    y += rowHeight;
  });

  return y;
}

// Medir con la misma fuente y tamaño usados al dibujar.
function altoTexto(doc, contenido, width) {
  return doc.font("Helvetica").fontSize(8).heightOfString(contenido, { width });
}

function dividirTexto(doc, contenido, width, maxHeight) {
  if (altoTexto(doc, contenido, width) <= maxHeight) {
    return [contenido, ""];
  }

  let inicio = 0;
  let fin = contenido.length;
  while (inicio < fin) {
    const mitad = Math.ceil((inicio + fin) / 2);
    if (altoTexto(doc, contenido.slice(0, mitad), width) <= maxHeight) {
      inicio = mitad;
    } else {
      fin = mitad - 1;
    }
  }

  // Preferir un corte entre palabras, sin perder el texto restante.
  const espacio = contenido.slice(0, inicio).search(/\s+\S*$/);
  const corte = espacio > 0 ? espacio : Math.max(1, inicio);
  return [contenido.slice(0, corte).trimEnd(), contenido.slice(corte).trimStart()];
}

function renderTextoBloque(doc, titulo, contenido, y, nuevaPagina) {
  let pendiente = texto(contenido).trim() || "Sin registro.";
  let continuacion = false;

  do {
    const minimo = 22 + altoTexto(doc, "Texto", ANCHO - 10) + 14;
    if (y + minimo > LIMITE_INFERIOR) y = nuevaPagina(false);

    const [parte, resto] = dividirTexto(
      doc, pendiente, ANCHO - 10, LIMITE_INFERIOR - y - 22 - 14,
    );
    const alto = Math.max(22, altoTexto(doc, parte, ANCHO - 10) + 14);

    doc.rect(MARGEN, y, ANCHO, 22).stroke();
    doc.font("Helvetica-Bold").fontSize(9).text(
      continuacion ? `${titulo} - CONTINUACIÓN` : titulo,
      MARGEN, y + 6, { width: ANCHO, align: "center" },
    );
    y += 22;
    doc.rect(MARGEN, y, ANCHO, alto).stroke();
    doc.font("Helvetica").fontSize(8).text(parte, MARGEN + 5, y + 7, {
      width: ANCHO - 10, height: alto - 14,
    });
    y += alto;
    pendiente = resto;
    if (pendiente) {
      y = nuevaPagina(false);
      continuacion = true;
    }
  } while (pendiente);

  return y;
}

function renderPlanAccion(doc, trabajador, y, nuevaPagina) {
  const elementos = Array.isArray(trabajador?.elementos)
    ? trabajador.elementos
    : [];

  const planes = elementos.filter(
    (elemento) =>
      String(elemento?.planAccion || "").trim() || elemento?.fechaPlanAccion,
  );

  const columnas = [180, 275, 90];
  const headers = ["ELEMENTO EPP", "PLAN DE ACCIÓN", "FECHA LÍMITE"];

  function dibujarEncabezadoTabla(esContinuacion = false) {
    doc.rect(MARGEN, y, ANCHO, 22).stroke();

    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .text(
        esContinuacion ? "PLAN DE ACCIÓN - CONTINUACIÓN" : "PLAN DE ACCIÓN",
        MARGEN,
        y + 6,
        {
          width: ANCHO,
          align: "center",
        },
      );

    y += 22;

    let x = MARGEN;

    headers.forEach((header, i) => {
      doc.rect(x, y, columnas[i], 22).stroke();

      doc
        .font("Helvetica-Bold")
        .fontSize(8)
        .text(header, x + 3, y + 7, {
          width: columnas[i] - 6,
          height: 12,
          align: "center",
          lineBreak: false,
        });

      x += columnas[i];
    });

    y += 22;
  }

  if (planes.length === 0) {
    return renderTextoBloque(doc, "PLAN DE ACCIÓN", "Sin registro.", y, nuevaPagina);
  }

  // Reservar también la primera fila; no dejar solo el encabezado.
  const primerPlan = planes[0];
  const altoPrimeraFila = Math.max(
    28,
    altoTexto(doc, texto(primerPlan.elemento), columnas[0] - 10) + 14,
    altoTexto(doc, texto(primerPlan.planAccion) || "Sin registro.", columnas[1] - 10) + 14,
    altoTexto(doc, formatearFecha(primerPlan.fechaPlanAccion) || "No aplica", columnas[2] - 10) + 14,
  );
  const altoPagina = LIMITE_INFERIOR - (MARGEN + 70) - 44;
  if (y + 44 + Math.min(altoPrimeraFila, altoPagina) > LIMITE_INFERIOR) {
    y = nuevaPagina(false);
  }

  dibujarEncabezadoTabla(false);

  planes.forEach((elemento) => {
    const nombreElemento = texto(elemento.elemento).trim() || "—";

    const planAccion = texto(elemento.planAccion).trim() || "Sin registro.";

    const fechaLimite = elemento.fechaPlanAccion
      ? formatearFecha(elemento.fechaPlanAccion)
      : "No aplica";

    let pendientes = [nombreElemento, planAccion, fechaLimite];
    const altoFila = (valores) => Math.max(
      28, ...valores.map((valor, i) => altoTexto(doc, valor, columnas[i] - 10) + 14),
    );
    let rowHeight = altoFila(pendientes);
    const altoPaginaCompleta = LIMITE_INFERIOR - (MARGEN + 70) - 44;

    // Una fila normal se mantiene completa; las mayores que una página
    // continúan sin truncar su contenido ni provocar saltos automáticos.
    if (y + Math.min(rowHeight, altoPaginaCompleta) > LIMITE_INFERIOR) {
      y = nuevaPagina(false);
      dibujarEncabezadoTabla(true);
    }

    do {
      const disponibles = LIMITE_INFERIOR - y;
      const fragmentos = pendientes.map((valor, i) => dividirTexto(
        doc, valor, columnas[i] - 10, disponibles - 14,
      ));
      const valores = fragmentos.map(([parte]) => parte);
      rowHeight = altoFila(valores);
      let x = MARGEN;

      valores.forEach((valor, i) => {
        doc.rect(x, y, columnas[i], rowHeight).stroke();
        doc.font("Helvetica").fontSize(8).text(valor, x + 5, y + 7, {
          width: columnas[i] - 10,
          height: rowHeight - 14,
          align: i === 2 ? "center" : "left",
        });
        x += columnas[i];
      });
      y += rowHeight;
      pendientes = fragmentos.map(([, resto]) => resto);
      if (pendientes.some(Boolean)) {
        y = nuevaPagina(false);
        dibujarEncabezadoTabla(true);
      }
    } while (pendientes.some(Boolean));
  });

  return y;
}

function altoEvidencia(doc, evidencia) {
  if (!evidencia?.buffer?.length) return 42;
  try {
    const img = doc.openImage(evidencia.buffer);
    return 20 + img.height * Math.min(300 / img.width, 100 / img.height, 1) + 10;
  } catch {
    return 50;
  }
}

function renderEvidencia(doc, evidencia, y) {
  // =========================================================
  // TAMAÑO MÁXIMO DE LA IMAGEN
  // =========================================================

  const MAX_ANCHO_IMAGEN = 300;
  const MAX_ALTO_IMAGEN = altoEvidencia(doc, evidencia) - 30;

  const PADDING = 5;

  // =========================================================
  // ENCABEZADO
  // =========================================================

  doc.rect(MARGEN, y, ANCHO, 20).stroke();

  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .text("EVIDENCIA DEL TRABAJADOR", MARGEN, y + 6, {
      width: ANCHO,
      align: "center",
    });

  y += 20;

  // =========================================================
  // SIN EVIDENCIA
  // =========================================================

  if (!evidencia?.buffer?.length) {
    const altoSinEvidencia = 22;

    doc.rect(MARGEN, y, ANCHO, altoSinEvidencia).stroke();

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#666666")
      .text("Sin evidencia adjunta.", MARGEN, y + 6, {
        width: ANCHO,
        align: "center",
      })
      .fillColor("black");

    return y + altoSinEvidencia;
  }

  // =========================================================
  // ÁREA COMPLETA DEL FORMULARIO
  // =========================================================

  const areaX = MARGEN + PADDING;
  const areaY = y + PADDING;
  const areaWidth = ANCHO - PADDING * 2;

  // =========================================================
  // DIBUJAR IMAGEN
  // =========================================================

  dibujarImagenAjustada(
    doc,
    evidencia,
    areaX,
    areaY,
    areaWidth,
    MAX_ANCHO_IMAGEN,
    MAX_ALTO_IMAGEN,
  );

  // =========================================================
  // CONTENEDOR DEL FORMULARIO
  // =========================================================

  /*
   * El ancho del formulario se mantiene COMPLETO.
   * Solamente la imagen es pequeña.
   */

  const altoBloque = MAX_ALTO_IMAGEN + PADDING * 2;

  doc.rect(MARGEN, y, ANCHO, altoBloque).stroke();

  return y + altoBloque;
}

function renderAprobaciones(doc, y, aprobaciones = null) {
  doc.save();

  doc.lineWidth(0.5);

  const colW = ANCHO / 3;
  const boxH = 60;

  doc.rect(MARGEN, y, ANCHO, boxH).stroke();

  const roles = [
    {
      key: "inspector",
      label: "APROBADO POR INSPECTOR",
    },
    {
      key: "jefe",
      label: "APROBADO POR JEFE DE ÁREA",
    },
    {
      key: "copasst",
      label: "APROBADO POR COPASST",
    },
  ];

  roles.forEach(({ key, label }, i) => {
    const fx = MARGEN + i * colW;

    if (i > 0) {
      doc
        .moveTo(fx, y)
        .lineTo(fx, y + boxH)
        .stroke();
    }

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
      .text(label, fx, lineY + 4, {
        width: colW,
        align: "center",
      });
  });

  doc.restore();

  return y + boxH;
}

/**
 * Genera el informe PDF completo de una inspección EPP.
 *
 * Construye la información general y las secciones de cada trabajador,
 * incluyendo sus datos personales, evaluaciones de elementos de protección,
 * planes de acción, observaciones y evidencia fotográfica.
 *
 * Controla la creación de páginas para evitar que la información principal
 * de un trabajador quede dividida de forma incorrecta. Al final incorpora
 * los responsables que aprobaron la inspección.
 *
 * @async
 * @param {Object} data Información general y trabajadores de la inspección.
 * @param {Object} [data.general] Información general de la inspección EPP.
 * @param {Array<Object>} [data.trabajadores] Trabajadores evaluados.
 * @param {Map} [evidenciasPorTrabajador=new Map()] Evidencias organizadas por
 * índice o identificador del trabajador.
 * @param {Object} [opts={}] Opciones adicionales de generación.
 * @param {Object|null} [opts.aprobaciones=null] Información de los responsables
 * que aprobaron la inspección.
 * @returns {Promise<Buffer>} Contenido binario del informe PDF generado.
 * @throws {Error} Si ocurre un error durante la construcción del documento.
 */

async function crearPdfInspeccionEpp(
  data,
  evidenciasPorTrabajador = new Map(),
  opts = {},
) {
  const { aprobaciones = null } = opts;

  const general = data?.general || data || {};

  const trabajadores = Array.isArray(data?.trabajadores)
    ? data.trabajadores
    : Array.isArray(general?.trabajadores)
      ? general.trabajadores
      : [];

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: MARGEN,
      autoFirstPage: false,
      bufferPages: true,
    });

    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));

    doc.on("end", () => resolve(Buffer.concat(chunks)));

    doc.on("error", reject);

    let y = 0;

    function nuevaPagina(mostrarInformacionGeneral = false) {
      doc.addPage();

      y = renderEncabezado(doc);

      if (mostrarInformacionGeneral) {
        y = renderInformacionGeneral(doc, general, y);
      }

      return y;
    }

    nuevaPagina(true);

    trabajadores.forEach((trabajador, index) => {
      // Datos del trabajador + encabezado EPP + primera fila.
      const espacioMinimoTrabajador = altoDatosTrabajador(doc, trabajador) + 60 + (trabajador.elementos?.length ? 22 : 0);

      if (y + espacioMinimoTrabajador > LIMITE_INFERIOR) {
        nuevaPagina(false);
      }

      y = renderDatosTrabajador(doc, trabajador, index + 1, y);

      y = renderTablaEpp(doc, trabajador, y, nuevaPagina);

      y = renderPlanAccion(doc, trabajador, y, nuevaPagina);

      y = renderTextoBloque(doc, "OBSERVACIONES", trabajador.observaciones, y, nuevaPagina);

      const evidencia =
        evidenciasPorTrabajador.get(index) ||
        evidenciasPorTrabajador.get(trabajador.trabajadorId) ||
        null;

      if (y + altoEvidencia(doc, evidencia) > LIMITE_INFERIOR) {
        nuevaPagina(false);
      }

      y = renderEvidencia(doc, evidencia, y);
    });

    if (trabajadores.length === 0) {
      doc
        .font("Helvetica")
        .fontSize(10)
        .text(
          "No hay trabajadores registrados en esta inspección.",
          MARGEN,
          y + 25,
          {
            width: ANCHO,
            align: "center",
          },
        );

      y += 70;
    }

    const espacioAprobaciones = 8 + 28 + 60;

    if (y + espacioAprobaciones > LIMITE_INFERIOR) {
      nuevaPagina(false);
    }

    y += 8;

    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .text("APROBACIÓN DE LA INSPECCIÓN", MARGEN, y, {
        width: ANCHO,
        align: "center",
      });

    // Espacio entre título y firmas
    y += 28;

    y = renderAprobaciones(doc, y, aprobaciones);

    // Un único pie por página, independiente del flujo del formulario.
    const paginas = doc.bufferedPageRange();
    for (let pagina = paginas.start; pagina < paginas.start + paginas.count; pagina++) {
      doc.switchToPage(pagina);
      dibujarIdInspeccion(doc, general, doc.page.height - 40);
    }

    doc.end();
  });
}

/**
 * Genera el PDF EPP utilizado en el flujo de aprobación.
 *
 * Construye la información general a partir del registro de la inspección,
 * incorpora los trabajadores recuperados de la base de datos y utiliza las
 * evidencias descargadas previamente desde OneDrive.
 *
 * @async
 * @param {Object} completa Inspección EPP completa.
 * @param {Array<Object>} completa.trabajadores Trabajadores evaluados.
 * @param {Object} row Registro general de la inspección.
 * @param {Object} aprobaciones Información de los responsables que aprobaron.
 * @param {Map} evidenciasPorTrabajador Evidencias organizadas por trabajador.
 * @returns {Promise<Object>} Resultado con el PDF generado en `pdf` y la lista
 * de trabajadores utilizada en `trabajadores`.
 * @throws {Error} Si falla la generación del documento.
 */

async function generarPdfEppAprobacion(
  completa,
  row,
  aprobaciones,
  evidenciasPorTrabajador,
) {
  const trabajadores = Array.isArray(completa.trabajadores)
    ? completa.trabajadores
    : [];

  const general = {
    inspeccionId: row.inspeccion_id,
    numInspeccion: Number(row.inspecciones_id),
    fecha: row.fecha,
    sedeOperacion: row.sede_operacion,
    areaTrabajo: row.area_trabajo,
    jefeResponsable: row.jefe_responsable,
    cargoJefe: row.cargo_jefe,
    responsableInspeccion: row.responsable_inspeccion,
    cargoResponsable: row.cargo_responsable,
  };

  const pdf = await crearPdfInspeccionEpp(
    {
      general,
      trabajadores,
    },
    evidenciasPorTrabajador,
    {
      aprobaciones,
    },
  );

  return {
    pdf,
    trabajadores,
  };
}

module.exports = {
  generarPdfEppAprobacion,
};
