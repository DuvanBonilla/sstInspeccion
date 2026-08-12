/*
  pdfInspeccionEpp.controller.js
  --------------------------------
  Generador del informe PDF para inspecciones EPP.

  Este controlador NO modifica la generación del informe SST.

  Estructura:
  - Información general
  - Un bloque por trabajador
  - Evaluación de elementos EPP
  - Plan de acción
  - Observaciones
  - Evidencia fotográfica
  - Aprobaciones
*/

const path = require("node:path");
const PDFDocument = require("pdfkit");

const MARGEN = 25;
const ANCHO = 545;
const LIMITE_INFERIOR = 800;

// =======================================================
// UTILIDADES
// =======================================================

function texto(valor) {
  if (valor === null || valor === undefined) {
    return "";
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
    .text(
      `${num}${inspeccionId}`,
      MARGEN,
      y + 4,
      {
        width: ANCHO,
        align: "right",
      },
    )
    .fillColor("black");
}

// =======================================================
// IMAGEN
// =======================================================

function dibujarImagenAjustada(
  doc,
  file,
  x,
  y,
  width,
  height,
  fontSize = 9,
) {
  try {
    if (!file?.buffer?.length) {
      throw new Error("Evidencia vacía");
    }

    const img = doc.openImage(file.buffer);

    const ratio = Math.min(
      width / img.width,
      height / img.height,
    );

    const scaledW = img.width * ratio;
    const scaledH = img.height * ratio;

    const cx = x + (width - scaledW) / 2;
    const cy = y + (height - scaledH) / 2;

    doc.image(
      file.buffer,
      cx,
      cy,
      {
        width: scaledW,
        height: scaledH,
      },
    );
  } catch {
    doc
      .font("Helvetica")
      .fontSize(fontSize)
      .text(
        "No fue posible renderizar la evidencia.",
        x + 5,
        y + 5,
        {
          width: width - 10,
          align: "center",
        },
      );
  }
}

// =======================================================
// ENCABEZADO
// =======================================================

function renderEncabezado(doc) {
  let y = MARGEN;

  doc.rect(MARGEN, y, ANCHO, 70).stroke();

  // Logo
  doc.rect(MARGEN, y, 150, 70).stroke();

  try {
    doc.image(
      path.resolve(
        __dirname,
        "../../views/img/Cargo.png",
      ),
      27,
      y + 3,
      {
        fit: [146, 64],
        align: "center",
        valign: "center",
      },
    );
  } catch {
    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .text(
        "CARGOBAN",
        27,
        y + 28,
        {
          width: 146,
          align: "center",
        },
      );
  }

  // Título
  doc.rect(175, y, 245, 70).stroke();

  doc
    .font("Helvetica-Bold")
    .fontSize(14)
    .text(
      "INSPECCIÓN DE ELEMENTOS\nDE PROTECCIÓN PERSONAL",
      175,
      y + 18,
      {
        width: 245,
        align: "center",
        lineGap: 3,
      },
    );

  // Información documental
  doc.rect(420, y, 150, 23).stroke();
  doc.rect(420, y + 23, 150, 23).stroke();
  doc.rect(420, y + 46, 150, 24).stroke();

  doc
    .font("Helvetica")
    .fontSize(9)
    .text(
      "CODIGO: ST-FST EPP",
      425,
      y + 7,
    )
    .text(
      "VERSIÓN: 01",
      425,
      y + 30,
    )
    .text(
      "FECHA DE VERSIÓN: 2026",
      425,
      y + 53,
    );

  return y + 70;
}

// =======================================================
// INFORMACIÓN GENERAL
// =======================================================

function renderInformacionGeneral(doc, general, y) {
  const mitad = ANCHO / 2;

  // -----------------------------------------------------
  // Fecha / Sede
  // -----------------------------------------------------

  doc.rect(MARGEN, y, mitad, 25).stroke();
  doc.rect(MARGEN + mitad, y, mitad, 25).stroke();

  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .text(
      "FECHA DE INSPECCIÓN:",
      30,
      y + 8,
    );

  doc
    .font("Helvetica")
    .fontSize(9)
    .text(
      texto(general.fecha),
      155,
      y + 8,
    );

  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .text(
      "SEDE:",
      302,
      y + 8,
    );

  doc
    .font("Helvetica")
    .fontSize(9)
    .text(
      texto(
        general.sedeOperacion ||
        general.sede,
      ),
      335,
      y + 8,
      {
        width: 225,
      },
    );

  y += 25;

  // -----------------------------------------------------
  // Área / Responsable
  // -----------------------------------------------------

  doc.rect(MARGEN, y, mitad, 25).stroke();
  doc.rect(MARGEN + mitad, y, mitad, 25).stroke();

  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .text(
      "ÁREA DE TRABAJO:",
      30,
      y + 8,
    );

  doc
    .font("Helvetica")
    .fontSize(9)
    .text(
      texto(
        general.areaTrabajo ||
        general.area,
      ),
      130,
      y + 8,
      {
        width: 160,
      },
    );

  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .text(
      "RESPONSABLE INSPECCIÓN:",
      302,
      y + 8,
    );

  doc
    .font("Helvetica")
    .fontSize(9)
    .text(
      texto(general.responsableInspeccion),
      445,
      y + 8,
      {
        width: 115,
      },
    );

  y += 25;

  // -----------------------------------------------------
  // Jefe
  // -----------------------------------------------------

  doc.rect(MARGEN, y, ANCHO, 25).stroke();

  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .text(
      "RESPONSABLE DEL ÁREA:",
      30,
      y + 8,
    );

  const jefe =
    general.jefeResponsable ||
    general.jefeArea ||
    "";

  const cargoJefe =
    general.cargoJefe || "";

  doc
    .font("Helvetica")
    .fontSize(9)
    .text(
      jefe +
        (cargoJefe
          ? ` — ${cargoJefe}`
          : ""),
      165,
      y + 8,
      {
        width: 395,
      },
    );

  y += 25;

  // -----------------------------------------------------
  // Responsable + cargo
  // -----------------------------------------------------

  doc.rect(MARGEN, y, ANCHO, 25).stroke();

  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .text(
      "INSPECTOR:",
      30,
      y + 8,
    );

  const responsable =
    general.responsableInspeccion || "";

  const cargoResponsable =
    general.cargoResponsable || "";

  doc
    .font("Helvetica")
    .fontSize(9)
    .text(
      responsable +
        (cargoResponsable
          ? ` — ${cargoResponsable}`
          : ""),
      95,
      y + 8,
      {
        width: 465,
      },
    );

  return y + 25;
}

// =======================================================
// DATOS DEL TRABAJADOR
// =======================================================

function renderDatosTrabajador(
  doc,
  trabajador,
  numero,
  y,
) {
  doc.rect(MARGEN, y, ANCHO, 25).stroke();

  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .text(
      `TRABAJADOR ${numero}`,
      MARGEN,
      y + 7,
      {
        width: ANCHO,
        align: "center",
      },
    );

  y += 25;

  const columnas = [250, 120, 175];

  let x = MARGEN;

  const headers = [
    "NOMBRE Y APELLIDO",
    "CÓDIGO",
    "LABOR / CARGO",
  ];

  headers.forEach((header, i) => {
    doc.rect(
      x,
      y,
      columnas[i],
      22,
    ).stroke();

    doc
      .font("Helvetica-Bold")
      .fontSize(8)
      .text(
        header,
        x + 3,
        y + 7,
        {
          width: columnas[i] - 6,
          align: "center",
        },
      );

    x += columnas[i];
  });

  y += 22;

  x = MARGEN;

  const valores = [
    trabajador.nombre,
    trabajador.codigo,
    trabajador.cargo,
  ];

  valores.forEach((valor, i) => {
    doc.rect(
      x,
      y,
      columnas[i],
      25,
    ).stroke();

    doc
      .font("Helvetica")
      .fontSize(8)
      .text(
        texto(valor),
        x + 4,
        y + 8,
        {
          width: columnas[i] - 8,
          align: "center",
        },
      );

    x += columnas[i];
  });

  return y + 25;
}

// =======================================================
// TABLA EPP
// =======================================================

function renderTablaEpp(doc, trabajador, y) {
  doc.rect(MARGEN, y, ANCHO, 38).stroke();

  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .text(
      "EVALUACIÓN DE ELEMENTOS DE PROTECCIÓN PERSONAL",
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

  const columnas = [
    365,
    90,
    90,
  ];

  const headers = [
    "ELEMENTO EPP",
    "CONDICIÓN",
    "USO",
  ];

  let x = MARGEN;

  headers.forEach((header, i) => {
    doc.rect(
      x,
      y,
      columnas[i],
      22,
    ).stroke();

    doc
      .font("Helvetica-Bold")
      .fontSize(8)
      .text(
        header,
        x,
        y + 7,
        {
          width: columnas[i],
          align: "center",
        },
      );

    x += columnas[i];
  });

  y += 22;

  const elementos =
    Array.isArray(trabajador.elementos)
      ? trabajador.elementos
      : [];

  const rowHeight = 22;

  elementos.forEach((elemento) => {
    x = MARGEN;

    const fila = [
      elemento.elemento,
      elemento.condicion,
      elemento.uso,
    ];

    fila.forEach((valor, i) => {
      doc.rect(
        x,
        y,
        columnas[i],
        rowHeight,
      ).stroke();

      doc
        .font("Helvetica")
        .fontSize(8)
        .text(
          texto(valor),
          x + 5,
          y + 7,
          {
            width: columnas[i] - 10,
            align:
              i === 0
                ? "left"
                : "center",
          },
        );

      x += columnas[i];
    });

    y += rowHeight;
  });

  return y;
}

// =======================================================
// PLAN DE ACCIÓN Y OBSERVACIONES
// =======================================================

function renderTextoBloque(
  doc,
  titulo,
  contenido,
  y,
) {
  const contenidoSeguro =
    texto(contenido) || "Sin registro.";

  const altoTexto = Math.max(
    35,
    doc.heightOfString(
      contenidoSeguro,
      {
        width: ANCHO - 10,
        font: "Helvetica",
        fontSize: 8,
      },
    ) + 16,
  );

  doc.rect(
    MARGEN,
    y,
    ANCHO,
    22,
  ).stroke();

  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .text(
      titulo,
      MARGEN,
      y + 6,
      {
        width: ANCHO,
        align: "center",
      },
    );

  y += 22;

  doc.rect(
    MARGEN,
    y,
    ANCHO,
    altoTexto,
  ).stroke();

  doc
    .font("Helvetica")
    .fontSize(8)
    .text(
      contenidoSeguro,
      MARGEN + 5,
      y + 7,
      {
        width: ANCHO - 10,
      },
    );

  return y + altoTexto;
}

// =======================================================
// EVIDENCIA
// =======================================================

function renderEvidencia(
  doc,
  evidencia,
  y,
) {
  doc.rect(
    MARGEN,
    y,
    ANCHO,
    20,
  ).stroke();

  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .text(
      "EVIDENCIA DEL TRABAJADOR",
      MARGEN,
      y + 6,
      {
        width: ANCHO,
        align: "center",
      },
    );

  y += 20;

  const alto = 190;

  doc.rect(
    MARGEN,
    y,
    ANCHO,
    alto,
  ).stroke();

  if (evidencia?.buffer?.length) {
    dibujarImagenAjustada(
      doc,
      evidencia,
      MARGEN + 5,
      y + 5,
      ANCHO - 10,
      alto - 10,
    );
  } else {
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#666666")
      .text(
        "Sin evidencia adjunta.",
        MARGEN,
        y + 85,
        {
          width: ANCHO,
          align: "center",
        },
      )
      .fillColor("black");
  }

  return y + alto;
}

// =======================================================
// APROBACIONES
// =======================================================

function renderAprobaciones(
  doc,
  y,
  aprobaciones = null,
) {
  doc.save();

  doc.lineWidth(0.5);

  const colW = ANCHO / 3;
  const boxH = 60;

  doc.rect(
    MARGEN,
    y,
    ANCHO,
    boxH,
  ).stroke();

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

  roles.forEach(
    ({ key, label }, i) => {
      const fx =
        MARGEN + i * colW;

      if (i > 0) {
        doc
          .moveTo(fx, y)
          .lineTo(
            fx,
            y + boxH,
          )
          .stroke();
      }

      const lineY = y + 32;

      const aprobacion =
        aprobaciones?.[key];

      if (aprobacion?.nombre) {
        doc
          .font("Helvetica-Bold")
          .fontSize(8)
          .text(
            aprobacion.nombre,
            fx + 4,
            y + 6,
            {
              width: colW - 8,
              align: "center",
            },
          );
      }

      doc
        .moveTo(
          fx + 12,
          lineY,
        )
        .lineTo(
          fx + colW - 12,
          lineY,
        )
        .stroke();

      doc
        .font("Helvetica-Bold")
        .fontSize(6.5)
        .text(
          label,
          fx,
          lineY + 4,
          {
            width: colW,
            align: "center",
          },
        );
    },
  );

  doc.restore();

  return y + boxH;
}

// =======================================================
// GENERADOR PRINCIPAL
// =======================================================

async function crearPdfInspeccionEpp(
  data,
  evidenciasPorTrabajador = new Map(),
  opts = {},
) {
  const {
    aprobaciones = null,
  } = opts;

  const general =
    data?.general ||
    data ||
    {};

  const trabajadores =
    Array.isArray(data?.trabajadores)
      ? data.trabajadores
      : Array.isArray(general?.trabajadores)
        ? general.trabajadores
        : [];

  return new Promise(
    (resolve, reject) => {
      const doc = new PDFDocument({
        size: "A4",
        margin: MARGEN,
        autoFirstPage: false,
      });

      const chunks = [];

      doc.on(
        "data",
        (chunk) => chunks.push(chunk),
      );

      doc.on(
        "end",
        () =>
          resolve(
            Buffer.concat(chunks),
          ),
      );

      doc.on(
        "error",
        reject,
      );

      let y = 0;

      // =================================================
      // NUEVA PÁGINA
      // =================================================

      function nuevaPagina(
        mostrarInformacionGeneral = false,
      ) {
        doc.addPage();

        y = renderEncabezado(doc);

        if (mostrarInformacionGeneral) {
          y = renderInformacionGeneral(
            doc,
            general,
            y,
          );
        }

        return y;
      }

      // =================================================
      // PRIMERA PÁGINA
      // =================================================

      nuevaPagina(true);

      // =================================================
      // TRABAJADORES
      // =================================================

      trabajadores.forEach(
        (trabajador, index) => {
          /*
           * Cada trabajador se inicia en una página
           * independiente.
           *
           * Esto evita cortar la tabla EPP entre dos
           * trabajadores y hace el informe legible incluso
           * con 30+ trabajadores.
           */

          if (index > 0) {
            nuevaPagina(false);
          }

          // Si el primer trabajador ya no cabe debajo
          // de información general, usamos otra página.
          const espacioMinimoTrabajador = 380;

          if (
            y + espacioMinimoTrabajador >
            LIMITE_INFERIOR
          ) {
            nuevaPagina(false);
          }

          y = renderDatosTrabajador(
            doc,
            trabajador,
            index + 1,
            y,
          );

          y = renderTablaEpp(
            doc,
            trabajador,
            y,
          );

          y = renderTextoBloque(
            doc,
            "PLAN DE ACCIÓN",
            trabajador.planAccion,
            y,
          );

          y = renderTextoBloque(
            doc,
            "OBSERVACIONES",
            trabajador.observaciones,
            y,
          );

          /*
           * La evidencia ocupa bastante espacio.
           * Si no cabe, pasa completa a la página
           * siguiente.
           */

          const altoEvidencia = 210;

          if (
            y + altoEvidencia >
            LIMITE_INFERIOR
          ) {
            dibujarIdInspeccion(
              doc,
              general,
              Math.min(
                y + 5,
                810,
              ),
            );

            nuevaPagina(false);
          }

          const evidencia =
            evidenciasPorTrabajador.get(
              index,
            ) ||
            evidenciasPorTrabajador.get(
              trabajador.trabajadorId,
            ) ||
            null;

          y = renderEvidencia(
            doc,
            evidencia,
            y,
          );

          dibujarIdInspeccion(
            doc,
            general,
            Math.min(
              y + 5,
              810,
            ),
          );
        },
      );

      // =================================================
      // SIN TRABAJADORES
      // =================================================

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

      // =================================================
      // APROBACIONES
      // =================================================

      const espacioAprobaciones =
        20 + 25 + 60 + 20;

      if (
        y + espacioAprobaciones >
        LIMITE_INFERIOR
      ) {
        nuevaPagina(false);
      } else {
        y += 20;
      }

const yAprobacion = doc.y + 12;

doc
  .font("Helvetica-Bold")
  .fontSize(12)
  .text(
    "APROBACIÓN DE LA INSPECCIÓN",
    MARGIN_X,
    yAprobacion,
    {
      width: CONTENT_WIDTH,
      align: "center",
    }
  );

const yTablaFirmas = yAprobacion + 28;

      y += 35;

      y = renderAprobaciones(
        doc,
        y,
        aprobaciones,
      );

      dibujarIdInspeccion(
        doc,
        general,
        y + 4,
      );

      doc.end();
    },
  );
}

// =======================================================
// EXPORTS
// =======================================================

module.exports = {
  crearPdfInspeccionEpp,
};