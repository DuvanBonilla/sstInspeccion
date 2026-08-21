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
    doc.image(path.resolve(__dirname, "../../views/img/Cargo.png"), 27, y + 3, {
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
    .text("CODIGO: ST-FST EPP", 425, y + 7)
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
    .fontSize(9)
    .text("RESPONSABLE INSPECCIÓN:", 302, y + 8);

  doc
    .font("Helvetica")
    .fontSize(9)
    .text(texto(general.responsableInspeccion), 445, y + 8, {
      width: 115,
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

function renderDatosTrabajador(doc, trabajador, numero, y) {
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
    doc.rect(x, y, columnas[i], 25).stroke();

    doc
      .font("Helvetica")
      .fontSize(8)
      .text(texto(valor), x + 4, y + 8, {
        width: columnas[i] - 8,
        align: "center",
      });

    x += columnas[i];
  });

  return y + 25;
}

function renderTablaEpp(doc, trabajador, y) {
  doc.rect(MARGEN, y, ANCHO, 38).stroke();

  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .text("EVALUACIÓN DE ELEMENTOS DE PROTECCIÓN PERSONAL", MARGEN, y + 5, {
      width: ANCHO,
      align: "center",
    });

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

  const columnas = [365, 90, 90];

  const headers = ["ELEMENTO EPP", "CONDICIÓN", "USO"];

  let x = MARGEN;

  headers.forEach((header, i) => {
    doc.rect(x, y, columnas[i], 22).stroke();

    doc
      .font("Helvetica-Bold")
      .fontSize(8)
      .text(header, x, y + 7, {
        width: columnas[i],
        align: "center",
      });

    x += columnas[i];
  });

  y += 22;

  const elementos = Array.isArray(trabajador.elementos)
    ? trabajador.elementos
    : [];

  const rowHeight = 22;

  elementos.forEach((elemento) => {
    x = MARGEN;

    const fila = [elemento.elemento, elemento.condicion, elemento.uso];

    fila.forEach((valor, i) => {
      doc.rect(x, y, columnas[i], rowHeight).stroke();

      doc
        .font("Helvetica")
        .fontSize(8)
        .text(texto(valor), x + 5, y + 7, {
          width: columnas[i] - 10,
          align: i === 0 ? "left" : "center",
        });

      x += columnas[i];
    });

    y += rowHeight;
  });

  return y;
}

function renderTextoBloque(doc, titulo, contenido, y) {
  const contenidoSeguro = texto(contenido) || "Sin registro.";

  const altoTexto = Math.max(
    35,
    doc.heightOfString(contenidoSeguro, {
      width: ANCHO - 10,
      font: "Helvetica",
      fontSize: 8,
    }) + 16,
  );

  doc.rect(MARGEN, y, ANCHO, 22).stroke();

  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .text(titulo, MARGEN, y + 6, {
      width: ANCHO,
      align: "center",
    });

  y += 22;

  doc.rect(MARGEN, y, ANCHO, altoTexto).stroke();

  doc
    .font("Helvetica")
    .fontSize(8)
    .text(contenidoSeguro, MARGEN + 5, y + 7, {
      width: ANCHO - 10,
    });

  return y + altoTexto;
}

function renderPlanAccion(doc, trabajador, y) {
  // =========================================================
  // OBTENER PLANES DE ACCIÓN DESDE LOS ELEMENTOS EPP
  // =========================================================

  const elementos = Array.isArray(trabajador?.elementos)
    ? trabajador.elementos
    : [];

  const planes = elementos.filter(
    (elemento) =>
      String(elemento?.planAccion || "").trim() || elemento?.fechaPlanAccion,
  );

  // =========================================================
  // ENCABEZADO
  // =========================================================

  doc.rect(MARGEN, y, ANCHO, 22).stroke();

  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .text("PLAN DE ACCIÓN", MARGEN, y + 6, {
      width: ANCHO,
      align: "center",
    });

  y += 22;

  // =========================================================
  // SIN PLANES DE ACCIÓN
  // =========================================================

  if (planes.length === 0) {
    const alto = 35;

    doc.rect(MARGEN, y, ANCHO, alto).stroke();

    doc
      .font("Helvetica")
      .fontSize(8)
      .text("Sin registro.", MARGEN + 5, y + 12, {
        width: ANCHO - 10,
        align: "center",
      });

    return y + alto;
  }

  // =========================================================
  // TABLA
  // =========================================================

  const columnas = [180, 275, 90];

  const headers = ["ELEMENTO EPP", "PLAN DE ACCIÓN", "FECHA LÍMITE"];

  let x = MARGEN;

  // ---------------------------------------------------------
  // ENCABEZADOS DE TABLA
  // ---------------------------------------------------------

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

  // ---------------------------------------------------------
  // FILAS
  // ---------------------------------------------------------

  planes.forEach((elemento) => {
    const nombreElemento = texto(elemento.elemento) || "—";

    const planAccion = texto(elemento.planAccion).trim() || "Sin registro.";

    const fechaLimite = elemento.fechaPlanAccion
      ? formatearFecha(elemento.fechaPlanAccion)
      : "No aplica";

    // Calcular altura necesaria según el contenido.
    const altoElemento =
      doc.heightOfString(nombreElemento, {
        width: columnas[0] - 10,
        font: "Helvetica",
        fontSize: 8,
      }) + 14;

    const altoPlan =
      doc.heightOfString(planAccion, {
        width: columnas[1] - 10,
        font: "Helvetica",
        fontSize: 8,
      }) + 14;

    const rowHeight = Math.max(28, altoElemento, altoPlan);

    x = MARGEN;

    const valores = [nombreElemento, planAccion, fechaLimite];

    valores.forEach((valor, i) => {
      doc.rect(x, y, columnas[i], rowHeight).stroke();

      doc
        .font("Helvetica")
        .fontSize(8)
        .text(valor, x + 5, y + 7, {
          width: columnas[i] - 10,
          align: i === 2 ? "center" : "left",
        });

      x += columnas[i];
    });

    y += rowHeight;
  });

  return y;
}

function renderEvidencia(doc, evidencia, y) {
  // =========================================================
  // TAMAÑO MÁXIMO DE LA IMAGEN
  // =========================================================

  const MAX_ANCHO_IMAGEN = 300;
  const MAX_ALTO_IMAGEN = 100;

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
    const altoSinEvidencia = 30;

    doc.rect(MARGEN, y, ANCHO, altoSinEvidencia).stroke();

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#666666")
      .text("Sin evidencia adjunta.", MARGEN, y + 10, {
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

  const resultado = dibujarImagenAjustada(
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
      /*
       * Cada trabajador se inicia en una página
       * independiente.
       *
       * Esto evita cortar la tabla EPP entre dos
       * trabajadores y hace el informe legible incluso
       * con 30+ trabajadores.
       */

      const espacioMinimoTrabajador = 300;

      if (y + espacioMinimoTrabajador > LIMITE_INFERIOR) {
        nuevaPagina(false);
      }

      y = renderDatosTrabajador(doc, trabajador, index + 1, y);

      y = renderTablaEpp(doc, trabajador, y);

      y = renderPlanAccion(doc, trabajador, y);

      y = renderTextoBloque(doc, "OBSERVACIONES", trabajador.observaciones, y);

      /*
       * La evidencia ocupa bastante espacio.
       * Si no cabe, pasa completa a la página
       * siguiente.
       */

      const altoEvidencia = 130;

      if (y + altoEvidencia > LIMITE_INFERIOR) {
        dibujarIdInspeccion(doc, general, Math.min(y + 5, 810));

        nuevaPagina(false);
      }

      const evidencia =
        evidenciasPorTrabajador.get(index) ||
        evidenciasPorTrabajador.get(trabajador.trabajadorId) ||
        null;

      y = renderEvidencia(doc, evidencia, y);

      dibujarIdInspeccion(doc, general, Math.min(y + 5, 810));
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

    const espacioAprobaciones = 20 + 25 + 60 + 20;

    if (y + espacioAprobaciones > LIMITE_INFERIOR) {
      nuevaPagina(false);
    } else {
      y += 20;
    }

    y += 12;

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

    dibujarIdInspeccion(doc, general, y + 4);

    doc.end();
  });
}

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
