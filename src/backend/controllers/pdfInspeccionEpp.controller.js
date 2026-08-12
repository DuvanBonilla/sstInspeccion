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

function formatearFecha(valor) {
  if (!valor) {
    return "";
  }

  // PostgreSQL puede devolver DATE como objeto Date
  if (valor instanceof Date) {
    const dia = String(valor.getUTCDate()).padStart(2, "0");
    const mes = String(valor.getUTCMonth() + 1).padStart(2, "0");
    const anio = valor.getUTCFullYear();

    return `${dia}/${mes}/${anio}`;
  }

  // Si viene como YYYY-MM-DD
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

// =======================================================
// IMAGEN
// =======================================================

function dibujarImagenAjustada(doc, file, x, y, width, height, fontSize = 9) {
  try {
    if (!file?.buffer?.length) {
      throw new Error("Evidencia vacía");
    }

    const img = doc.openImage(file.buffer);

    const ratio = Math.min(width / img.width, height / img.height);

    const scaledW = img.width * ratio;
    const scaledH = img.height * ratio;

    const cx = x + (width - scaledW) / 2;
    const cy = y + (height - scaledH) / 2;

    doc.image(file.buffer, cx, cy, {
      width: scaledW,
      height: scaledH,
    });
  } catch {
    doc
      .font("Helvetica")
      .fontSize(fontSize)
      .text("No fue posible renderizar la evidencia.", x + 5, y + 5, {
        width: width - 10,
        align: "center",
      });
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

  // -----------------------------------------------------
  // Área / Responsable
  // -----------------------------------------------------

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

  // -----------------------------------------------------
  // Jefe
  // -----------------------------------------------------

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

  // -----------------------------------------------------
  // Responsable + cargo
  // -----------------------------------------------------

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

// =======================================================
// DATOS DEL TRABAJADOR
// =======================================================

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

// =======================================================
// TABLA EPP
// =======================================================

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

// =======================================================
// PLAN DE ACCIÓN Y OBSERVACIONES
// =======================================================

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
  const planAccion = texto(trabajador?.planAccion) || "Sin registro.";

  const fechaLimite = trabajador?.fechaPlanAccion
    ? formatearFecha(trabajador.fechaPlanAccion)
    : "No aplica";

  // =====================================================
  // TÍTULO
  // =====================================================

  doc.rect(MARGEN, y, ANCHO, 22).stroke();

  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .text("PLAN DE ACCIÓN", MARGEN, y + 6, {
      width: ANCHO,
      align: "center",
    });

  y += 22;

  // =====================================================
  // CONTENIDO DEL PLAN
  // =====================================================

  const altoTexto = Math.max(
    35,
    doc.heightOfString(planAccion, {
      width: ANCHO - 10,
      font: "Helvetica",
      fontSize: 8,
    }) + 16,
  );

  doc.rect(MARGEN, y, ANCHO, altoTexto).stroke();

  doc
    .font("Helvetica")
    .fontSize(8)
    .text(planAccion, MARGEN + 5, y + 7, {
      width: ANCHO - 10,
    });

  y += altoTexto;

  // =====================================================
  // FECHA LÍMITE
  // =====================================================

  doc.rect(MARGEN, y, ANCHO, 25).stroke();

  doc
    .font("Helvetica-Bold")
    .fontSize(8)
    .text("FECHA LÍMITE:", MARGEN + 5, y + 8);

  doc
    .font("Helvetica")
    .fontSize(8)
    .text(fechaLimite, MARGEN + 85, y + 8);

  return y + 25;
}

// =======================================================
// EVIDENCIA
// =======================================================

function renderEvidencia(doc, evidencia, y) {
  doc.rect(MARGEN, y, ANCHO, 20).stroke();

  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .text("EVIDENCIA DEL TRABAJADOR", MARGEN, y + 6, {
      width: ANCHO,
      align: "center",
    });

  y += 20;

  const alto = 190;

  doc.rect(MARGEN, y, ANCHO, alto).stroke();

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
      .text("Sin evidencia adjunta.", MARGEN, y + 85, {
        width: ANCHO,
        align: "center",
      })
      .fillColor("black");
  }

  return y + alto;
}

// =======================================================
// APROBACIONES
// =======================================================

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

// =======================================================
// GENERADOR PRINCIPAL
// =======================================================

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

    // =================================================
    // NUEVA PÁGINA
    // =================================================

    function nuevaPagina(mostrarInformacionGeneral = false) {
      doc.addPage();

      y = renderEncabezado(doc);

      if (mostrarInformacionGeneral) {
        y = renderInformacionGeneral(doc, general, y);
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

    trabajadores.forEach((trabajador, index) => {
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

      const altoEvidencia = 210;

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

    const espacioAprobaciones = 20 + 25 + 60 + 20;

    if (y + espacioAprobaciones > LIMITE_INFERIOR) {
      nuevaPagina(false);
    } else {
      y += 20;
    }

    // =================================================
    // TÍTULO DE APROBACIONES
    // =================================================

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

    // =================================================
    // TABLA DE APROBACIONES
    // =================================================

    y = renderAprobaciones(doc, y, aprobaciones);

    dibujarIdInspeccion(doc, general, y + 4);

    doc.end();
  });
}

// =========================================================
// HTML CORREO FINAL EPP
// =========================================================

function construirHtmlCorreoEpp({
  inspeccionId,
  numInspeccion,
  fecha,
  sedeOperacion,
  areaTrabajo,
  responsableInspeccion,

  totalTrabajadores = 0,
  trabajadoresConNovedad = 0,
  trabajadoresSinNovedad = 0,
  totalNovedades = 0,

  aprobaciones = {},
  webUrl = null,
}) {
  // -------------------------------------------------------
  // APROBACIONES
  // -------------------------------------------------------

  const inspector = aprobaciones?.inspector?.nombre || "Aprobado";

  const jefe = aprobaciones?.jefe?.nombre || "Aprobado";

  const copasst = aprobaciones?.copasst?.nombre || "Aprobado";

  // -------------------------------------------------------
  // LINK ONEDRIVE
  // -------------------------------------------------------

  const botonOneDrive = webUrl
    ? `
      <table
        width="100%"
        cellpadding="0"
        cellspacing="0"
        role="presentation"
      >
        <tr>
          <td align="center">
            <a
              href="${webUrl}"
              style="
                display:inline-block;
                padding:12px 28px;
                background:#1a2e4a;
                color:#ffffff;
                text-decoration:none;
                border-radius:8px;
                font-size:13px;
                font-weight:600;
                letter-spacing:.3px;
              "
            >
              Ver informe en OneDrive
            </a>
          </td>
        </tr>
      </table>
    `
    : "";

  // -------------------------------------------------------
  // HTML
  // -------------------------------------------------------

  return `
<!DOCTYPE html>

<html lang="es">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>

<body
  style="
    margin:0;
    padding:0;
    background:#f4f4f5;
    font-family:'Segoe UI',Arial,sans-serif;
  "
>

<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  role="presentation"
  style="
    background:#f4f4f5;
    padding:40px 16px;
  "
>

<tr>

<td align="center">


<!-- =====================================================
     CONTENEDOR PRINCIPAL
====================================================== -->

<table
  width="580"
  cellpadding="0"
  cellspacing="0"
  role="presentation"
  style="
    max-width:580px;
    width:100%;
  "
>

<tr>

<td
  style="
    background:#ffffff;
    border-radius:12px;
    overflow:hidden;
    box-shadow:0 1px 4px rgba(0,0,0,.08);
  "
>


<!-- =====================================================
     FRANJA SUPERIOR
====================================================== -->

<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  role="presentation"
>

<tr>
  <td
    style="
      background:#1a2e4a;
      height:6px;
      font-size:0;
    "
  >
    &nbsp;
  </td>
</tr>

</table>


<!-- =====================================================
     LOGO
====================================================== -->

<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  role="presentation"
>

<tr>

<td
  style="
    padding:28px 40px 0;
    text-align:center;
  "
>

<img
  src="https://sstinspeccion.onrender.com/img/Cargo.png"
  alt="Cargoban"
  style="
    height:60px;
    width:auto;
  "
/>

</td>

</tr>

</table>


<!-- =====================================================
     ENCABEZADO
====================================================== -->

<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  role="presentation"
>

<tr>

<td
  style="
    padding:30px 40px 22px;
  "
>

<p
  style="
    margin:0 0 6px;
    font-size:11px;
    font-weight:700;
    letter-spacing:2px;
    text-transform:uppercase;
    color:#6b7280;
  "
>
  Inspección EPP
</p>


<h1
  style="
    margin:0 0 12px;
    font-size:22px;
    font-weight:700;
    color:#111827;
    line-height:1.3;
  "
>
  Inspección de Elementos de Protección Personal aprobada
</h1>


<p
  style="
    margin:0 0 18px;
    font-size:13px;
    color:#6b7280;
    line-height:1.6;
  "
>
  La inspección completó satisfactoriamente el proceso
  de revisión y aprobación.
</p>


${
  numInspeccion != null
    ? `
      <p
        style="
          margin:0 0 8px;
          font-size:15px;
          font-weight:700;
          color:#1a2e4a;
        "
      >
        Inspección N.° ${numInspeccion}
      </p>
    `
    : ""
}


<span
  style="
    display:inline-block;
    background:#f3f4f6;
    border:1px solid #e5e7eb;
    border-radius:8px;
    padding:7px 14px;
    font-size:13px;
    font-weight:700;
    color:#1a2e4a;
    letter-spacing:.5px;
    font-family:monospace;
  "
>
  ${inspeccionId || "-"}
</span>


</td>

</tr>

</table>


<!-- =====================================================
     DIVISOR
====================================================== -->

<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  role="presentation"
>

<tr>
  <td
    style="
      border-top:1px solid #f3f4f6;
      font-size:0;
    "
  >
    &nbsp;
  </td>
</tr>

</table>


<!-- =====================================================
     INFORMACIÓN GENERAL
====================================================== -->

<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  role="presentation"
  style="font-size:13.5px;"
>

<tr>

<td
  colspan="2"
  style="
    padding:22px 40px 12px;
    font-size:12px;
    font-weight:700;
    letter-spacing:1px;
    color:#1a2e4a;
  "
>
  INFORMACIÓN GENERAL
</td>

</tr>


<tr>

<td
  style="
    padding:10px 40px;
    width:38%;
    color:#6b7280;
    font-weight:600;
  "
>
  Fecha
</td>

<td
  style="
    padding:10px 40px 10px 0;
    color:#111827;
  "
>
  ${fecha || "-"}
</td>

</tr>


<tr style="background:#fafafa;">

<td
  style="
    padding:10px 40px;
    color:#6b7280;
    font-weight:600;
  "
>
  Sede
</td>

<td
  style="
    padding:10px 40px 10px 0;
    color:#111827;
  "
>
  ${sedeOperacion || "-"}
</td>

</tr>


<tr>

<td
  style="
    padding:10px 40px;
    color:#6b7280;
    font-weight:600;
  "
>
  Área
</td>

<td
  style="
    padding:10px 40px 10px 0;
    color:#111827;
  "
>
  ${areaTrabajo || "-"}
</td>

</tr>


<tr style="background:#fafafa;">

<td
  style="
    padding:10px 40px 18px;
    color:#6b7280;
    font-weight:600;
  "
>
  Responsable
</td>

<td
  style="
    padding:10px 40px 18px 0;
    color:#111827;
  "
>
  ${responsableInspeccion || "-"}
</td>

</tr>

</table>


<!-- =====================================================
     RESUMEN EPP
====================================================== -->

<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  role="presentation"
>

<tr>

<td
  style="
    border-top:1px solid #f3f4f6;
    padding:24px 40px 12px;
  "
>

<p
  style="
    margin:0;
    font-size:12px;
    font-weight:700;
    letter-spacing:1px;
    color:#1a2e4a;
  "
>
  RESUMEN DE LA INSPECCIÓN
</p>

</td>

</tr>

</table>


<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  role="presentation"
  style="
    padding:0 40px 24px;
  "
>

<tr>

<!-- TOTAL -->

<td
  width="50%"
  style="
    padding:8px 6px 8px 0;
  "
>

<div
  style="
    background:#f8fafc;
    border:1px solid #e5e7eb;
    border-radius:8px;
    padding:14px;
  "
>

<div
  style="
    font-size:11px;
    color:#6b7280;
    margin-bottom:5px;
  "
>
  Trabajadores inspeccionados
</div>

<div
  style="
    font-size:22px;
    font-weight:700;
    color:#1a2e4a;
  "
>
  ${totalTrabajadores}
</div>

</div>

</td>


<!-- CON NOVEDAD -->

<td
  width="50%"
  style="
    padding:8px 0 8px 6px;
  "
>

<div
  style="
    background:#f8fafc;
    border:1px solid #e5e7eb;
    border-radius:8px;
    padding:14px;
  "
>

<div
  style="
    font-size:11px;
    color:#6b7280;
    margin-bottom:5px;
  "
>
  Con novedades
</div>

<div
  style="
    font-size:22px;
    font-weight:700;
    color:#1a2e4a;
  "
>
  ${trabajadoresConNovedad}
</div>

</div>

</td>

</tr>


<tr>

<!-- SIN NOVEDAD -->

<td
  width="50%"
  style="
    padding:4px 6px 8px 0;
  "
>

<div
  style="
    background:#f8fafc;
    border:1px solid #e5e7eb;
    border-radius:8px;
    padding:14px;
  "
>

<div
  style="
    font-size:11px;
    color:#6b7280;
    margin-bottom:5px;
  "
>
  Sin novedades
</div>

<div
  style="
    font-size:22px;
    font-weight:700;
    color:#1a2e4a;
  "
>
  ${trabajadoresSinNovedad}
</div>

</div>

</td>


<!-- TOTAL NOVEDADES -->

<td
  width="50%"
  style="
    padding:4px 0 8px 6px;
  "
>

<div
  style="
    background:#f8fafc;
    border:1px solid #e5e7eb;
    border-radius:8px;
    padding:14px;
  "
>

<div
  style="
    font-size:11px;
    color:#6b7280;
    margin-bottom:5px;
  "
>
  Novedades EPP
</div>

<div
  style="
    font-size:22px;
    font-weight:700;
    color:#1a2e4a;
  "
>
  ${totalNovedades}
</div>

</div>

</td>

</tr>

</table>


<!-- =====================================================
     APROBACIONES
====================================================== -->

<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  role="presentation"
>

<tr>

<td
  style="
    border-top:1px solid #f3f4f6;
    padding:24px 40px 12px;
  "
>

<p
  style="
    margin:0;
    font-size:12px;
    font-weight:700;
    letter-spacing:1px;
    color:#1a2e4a;
  "
>
  APROBACIONES COMPLETADAS
</p>

</td>

</tr>

</table>


<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  role="presentation"
  style="
    padding:0 40px 24px;
    font-size:13px;
  "
>

<tr>

<td
  style="
    padding:8px 0;
    color:#6b7280;
  "
>
  Inspector
</td>

<td
  style="
    padding:8px 0;
    text-align:right;
    font-weight:600;
    color:#111827;
  "
>
  ✓ ${inspector}
</td>

</tr>


<tr>

<td
  style="
    padding:8px 0;
    color:#6b7280;
  "
>
  Jefe de Área
</td>

<td
  style="
    padding:8px 0;
    text-align:right;
    font-weight:600;
    color:#111827;
  "
>
  ✓ ${jefe}
</td>

</tr>


<tr>

<td
  style="
    padding:8px 0;
    color:#6b7280;
  "
>
  COPASST
</td>

<td
  style="
    padding:8px 0;
    text-align:right;
    font-weight:600;
    color:#111827;
  "
>
  ✓ ${copasst}
</td>

</tr>

</table>


<!-- =====================================================
     PDF / ONEDRIVE
====================================================== -->

<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  role="presentation"
>

<tr>

<td
  style="
    border-top:1px solid #f3f4f6;
    padding:24px 40px 28px;
    text-align:center;
  "
>

<p
  style="
    margin:0 0 16px;
    font-size:13px;
    color:#6b7280;
    line-height:1.6;
  "
>
  El informe completo de la inspección EPP está
  <strong style="color:#111827;">
    adjunto en PDF
  </strong>
  a este correo.
</p>

${botonOneDrive}

</td>

</tr>

</table>


<!-- =====================================================
     FOOTER
====================================================== -->

<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  role="presentation"
>

<tr>

<td
  style="
    border-top:1px solid #f3f4f6;
    padding:14px 40px;
    text-align:center;
  "
>

<p
  style="
    margin:0;
    font-size:11px;
    color:#9ca3af;
  "
>
  Este es un mensaje automático · Por favor no responder
</p>

</td>

</tr>

</table>


</td>

</tr>

</table>


</td>

</tr>

</table>

</body>

</html>
`;
}

// =========================================================
// CORREO DESTINO EPP SEGÚN SEDE
// =========================================================

function resolverCorreoDestinoEpp(sedeOperacion, correoManual) {
  const sede = (sedeOperacion || "").toLowerCase().trim();

  if (sede.includes("santa marta")) {
    return "juanmix201@gmail.com";
  }

  if (sede.includes("urab")) {
    return "Trynda201@gmail.com";
  }

  return correoManual || process.env.GRAPH_EMAIL_TO_TEST;
}

// =======================================================
// EXPORTS
// =======================================================

module.exports = {
  crearPdfInspeccionEpp,
  resolverCorreoDestinoEpp,
  construirHtmlCorreoEpp,
};
