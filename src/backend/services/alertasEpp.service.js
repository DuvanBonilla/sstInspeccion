const {
  obtenerPlanesEppParaAlertas,
} = require("../models/seguimientoEppExcel.model");

const {
  reservarEnvioAlertaEpp,
  marcarEnvioAlertaEppComoEnviado,
  marcarEnvioAlertaEppComoFallido,
} = require("../models/alertasEpp.model");

const {
  sincronizarCierresDesdeExcelEpp,
} = require("./sincronizacionEppExcel.service");

const { enviarCorreoPorGraph } = require("./correo.service");

function escaparHtml(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatearFechaColombia(valor) {
  if (!valor) {
    return "-";
  }

  const fecha = new Date(valor);

  if (Number.isNaN(fecha.getTime())) {
    return escaparHtml(valor);
  }

  return new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(fecha);
}

function obtenerPresentacionAlerta(plan) {
  const tipo = String(plan.tipo_alerta || "").toUpperCase();

  if (tipo === "VENCIDO") {
    const dias = Math.abs(Number(plan.dias_restantes) || 0);

    return {
      texto: dias === 1 ? "Vencido hace 1 día" : `Vencido hace ${dias} días`,
      fondo: "#fee2e2",
      color: "#b91c1c",
    };
  }

  if (tipo === "VENCE HOY") {
    return {
      texto: "Vence hoy",
      fondo: "#ffedd5",
      color: "#c2410c",
    };
  }

  const dias = Number(plan.dias_restantes) || 0;

  return {
    texto: dias === 1 ? "Vence en 1 día" : `Vence en ${dias} días`,
    fondo: "#fef3c7",
    color: "#a16207",
  };
}

function agruparPlanesPorSede(planes) {
  const grupos = new Map();

  for (const plan of planes) {
    const sede =
      String(plan.sede_operacion || "Sede no definida").trim() ||
      "Sede no definida";

    if (!grupos.has(sede)) {
      grupos.set(sede, []);
    }

    grupos.get(sede).push(plan);
  }

  return grupos;
}

function construirFilaPlan(plan, indice) {
  const alerta = obtenerPresentacionAlerta(plan);

  const fondo = indice % 2 === 0 ? "#ffffff" : "#fafafa";

  return `
    <table
      width="100%"
      cellpadding="0"
      cellspacing="0"
      role="presentation"
      style="
        background:${fondo};
        border-bottom:1px solid #e5e7eb;
      "
    >
      <tr>
        <td
          style="
            padding:15px 24px 8px;
            font-size:12px;
            font-weight:700;
            color:#1a2e4a;
          "
        >
          ${escaparHtml(plan.inspeccion_id || "-")}
        </td>

        <td
          align="right"
          style="padding:15px 24px 8px;"
        >
          <span
            style="
              display:inline-block;
              padding:5px 9px;
              border-radius:6px;
              background:${alerta.fondo};
              color:${alerta.color};
              font-size:11px;
              font-weight:700;
            "
          >
            ${escaparHtml(alerta.texto)}
          </span>
        </td>
      </tr>

      <tr>
        <td
          colspan="2"
          style="padding:0 24px 14px;"
        >
          <table
            width="100%"
            cellpadding="0"
            cellspacing="0"
            role="presentation"
            style="font-size:12px;"
          >
            <tr>
              <td
                width="38%"
                style="
                  padding:5px 0;
                  color:#6b7280;
                  font-weight:600;
                "
              >
                Trabajador
              </td>

              <td
                style="
                  padding:5px 0;
                  color:#111827;
                "
              >
                ${escaparHtml(plan.nombre_trabajador || "-")}
              </td>
            </tr>

            <tr>
              <td
                style="
                  padding:5px 0;
                  color:#6b7280;
                  font-weight:600;
                "
              >
                Elemento EPP
              </td>

              <td
                style="
                  padding:5px 0;
                  color:#111827;
                "
              >
                ${escaparHtml(plan.elemento_epp || "-")}
              </td>
            </tr>

            <tr>
              <td
                style="
                  padding:5px 0;
                  color:#6b7280;
                  font-weight:600;
                "
              >
                Fecha compromiso
              </td>

              <td
                style="
                  padding:5px 0;
                  color:#111827;
                "
              >
                ${formatearFechaColombia(plan.fecha_plan_accion)}
              </td>
            </tr>

            <tr>
              <td
                style="
                  padding:5px 0;
                  color:#6b7280;
                  font-weight:600;
                  vertical-align:top;
                "
              >
                Plan de acción
              </td>

              <td
                style="
                  padding:5px 0;
                  color:#111827;
                  line-height:1.5;
                "
              >
                ${escaparHtml(plan.plan_accion || "-")}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
}

function construirSeccionSede(sede, planes) {
  const contenido = planes
    .map((plan, indice) => construirFilaPlan(plan, indice))
    .join("");

  return `
    <table
      width="100%"
      cellpadding="0"
      cellspacing="0"
      role="presentation"
      style="
        margin:0 0 22px;
        border:1px solid #e5e7eb;
        border-radius:8px;
        overflow:hidden;
      "
    >
      <tr>
        <td
          style="
            padding:13px 18px;
            background:#1a2e4a;
            color:#ffffff;
            font-size:13px;
            font-weight:700;
          "
        >
          ${escaparHtml(sede)}
          ·
          ${planes.length}
          ${planes.length === 1 ? "plan" : "planes"}
        </td>
      </tr>

      <tr>
        <td>
          ${contenido}
        </td>
      </tr>
    </table>
  `;
}

function construirHtmlAlertasEpp({ planes, fechaGeneracion = new Date() }) {
  const grupos = agruparPlanesPorSede(planes);

  const secciones = Array.from(grupos.entries())
    .map(([sede, planesSede]) => construirSeccionSede(sede, planesSede))
    .join("");

  const vencidos = planes.filter(
    (plan) => plan.tipo_alerta === "VENCIDO",
  ).length;

  const vencenHoy = planes.filter(
    (plan) => plan.tipo_alerta === "VENCE HOY",
  ).length;

  const proximos = planes.filter(
    (plan) => plan.tipo_alerta === "PRÓXIMO A VENCER",
  ).length;

  const introduccion =
    planes.length === 1
      ? `
        Se encontró <strong>1 plan pendiente</strong>
        que está vencido, vence hoy o vencerá durante
        los próximos tres días.
      `
      : `
        Se encontraron
        <strong>${planes.length} planes pendientes</strong>
        que están vencidos, vencen hoy o vencerán durante
        los próximos tres días.
      `;

  return `
<!DOCTYPE html>

<html lang="es">

<head>
  <meta charset="UTF-8">
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  >
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
        <table
          width="580"
          cellpadding="0"
          cellspacing="0"
          role="presentation"
          style="
            width:100%;
            max-width:580px;
            background:#ffffff;
            border-radius:12px;
            overflow:hidden;
            box-shadow:0 1px 4px rgba(0,0,0,.08);
          "
        >
          <tr>
            <td
              style="
                height:6px;
                background:#1a2e4a;
                font-size:0;
              "
            >
              &nbsp;
            </td>
          </tr>

          <tr>
            <td
              align="center"
              style="padding:28px 40px 0;"
            >
              <img
                src="https://sstinspeccion.onrender.com/img/Cargo.png"
                alt="Cargoban"
                style="
                  height:60px;
                  width:auto;
                "
              >
            </td>
          </tr>

          <tr>
            <td
              style="padding:30px 36px 22px;"
            >
              <p
                style="
                  margin:0 0 7px;
                  font-size:11px;
                  font-weight:700;
                  letter-spacing:2px;
                  text-transform:uppercase;
                  color:#6b7280;
                "
              >
                Seguimiento EPP
              </p>

              <h1
                style="
                  margin:0 0 10px;
                  font-size:22px;
                  line-height:1.3;
                  color:#111827;
                "
              >
                Alertas de planes de acción
              </h1>

              <p
                style="
                  margin:0;
                  color:#6b7280;
                  font-size:13px;
                "
              >
                Consolidado diario ·
                ${formatearFechaColombia(fechaGeneracion)}
              </p>
            </td>
          </tr>

          <tr>
            <td
              style="
                padding:20px 36px;
                border-top:1px solid #f3f4f6;
              "
            >
              <p
                style="
                  margin:0;
                  font-size:13px;
                  line-height:1.6;
                  color:#4b5563;
                "
              >
                ${introduccion}
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:0 28px 22px;">
              <table
                width="100%"
                cellpadding="0"
                cellspacing="6"
                role="presentation"
              >
                <tr>
                  <td
                    width="33%"
                    align="center"
                    style="
                      padding:13px 5px;
                      background:#fee2e2;
                      color:#b91c1c;
                      border-radius:8px;
                    "
                  >
                    <strong style="font-size:19px;">
                      ${vencidos}
                    </strong>
                    <br>
                    <span style="font-size:10px;">
                      Vencidos
                    </span>
                  </td>

                  <td
                    width="33%"
                    align="center"
                    style="
                      padding:13px 5px;
                      background:#ffedd5;
                      color:#c2410c;
                      border-radius:8px;
                    "
                  >
                    <strong style="font-size:19px;">
                      ${vencenHoy}
                    </strong>
                    <br>
                    <span style="font-size:10px;">
                      Vencen hoy
                    </span>
                  </td>

                  <td
                    width="33%"
                    align="center"
                    style="
                      padding:13px 5px;
                      background:#fef3c7;
                      color:#a16207;
                      border-radius:8px;
                    "
                  >
                    <strong style="font-size:19px;">
                      ${proximos}
                    </strong>
                    <br>
                    <span style="font-size:10px;">
                      Próximos
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:0 28px 8px;">
              ${secciones}
            </td>
          </tr>

          <tr>
            <td
              align="center"
              style="
                padding:15px 30px;
                border-top:1px solid #f3f4f6;
                color:#9ca3af;
                font-size:11px;
              "
            >
              Este es un mensaje automático ·
              Por favor no responder
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

async function prepararConsolidadoAlertasEpp() {
  const planes = await obtenerPlanesEppParaAlertas();

  if (planes.length === 0) {
    return {
      hayAlertas: false,
      totalPlanes: 0,
      planes: [],
      html: "",
    };
  }

  return {
    hayAlertas: true,
    totalPlanes: planes.length,
    planes,
    html: construirHtmlAlertasEpp({
      planes,
    }),
  };
}

async function enviarConsolidadoAlertasEpp() {
  const destinatario = String(process.env.ALERTAS_EPP_EMAIL_TO || "").trim();

  if (!destinatario) {
    throw new Error("Falta configurar ALERTAS_EPP_EMAIL_TO");
  }

  const consolidado = await prepararConsolidadoAlertasEpp();

  if (!consolidado.hayAlertas) {
    return {
      enviado: false,
      omitidoPorControlDiario: false,
      motivo: "No existen planes EPP para alertar",
      destinatario,
      totalPlanes: 0,
    };
  }

  const reserva = await reservarEnvioAlertaEpp({
    destinatario,
    totalPlanes: consolidado.totalPlanes,
  });

  if (!reserva.reservado) {
    return {
      enviado: false,
      omitidoPorControlDiario: true,

      motivo:
        reserva.registro.estado === "ENVIADO"
          ? "La alerta EPP de hoy ya fue enviada"
          : "La alerta EPP de hoy ya está siendo procesada",

      destinatario: reserva.registro.destinatario,

      totalPlanes: reserva.registro.total_planes,

      estado: reserva.registro.estado,

      intentos: reserva.registro.intentos,

      enviadoAt: reserva.registro.enviado_at,
    };
  }

  const fechaColombia = new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const asunto =
    `Alerta diaria EPP · ` +
    `${consolidado.totalPlanes} ` +
    `${
      consolidado.totalPlanes === 1 ? "plan pendiente" : "planes pendientes"
    } · ${fechaColombia}`;

  try {
    await enviarCorreoPorGraph({
      to: destinatario,
      subject: asunto,
      html: consolidado.html,
    });
  } catch (error) {
    try {
      await marcarEnvioAlertaEppComoFallido(error);
    } catch (errorRegistro) {
      console.error(
        "[Alertas EPP] No se pudo registrar el fallo:",
        errorRegistro,
      );
    }

    throw error;
  }

  const registro = await marcarEnvioAlertaEppComoEnviado();

  if (!registro) {
    throw new Error(
      "El correo EPP fue enviado, pero no se pudo confirmar el estado en la base de datos",
    );
  }

  return {
    enviado: true,
    omitidoPorControlDiario: false,
    destinatario,
    totalPlanes: consolidado.totalPlanes,
    asunto,
    estado: registro.estado,
    intentos: registro.intentos,
    enviadoAt: registro.enviado_at,
  };
}

async function ejecutarProcesoDiarioAlertasEpp() {
  // Primero conservar cualquier cierre hecho
  // manualmente desde el Excel.
  const sincronizacion = await sincronizarCierresDesdeExcelEpp({
    detenerSiHayErrores: true,
    permitirArchivoInexistente: false,
  });

  // La consulta de alertas se realiza después
  // de actualizar los cierres en PostgreSQL.
  const alertas = await enviarConsolidadoAlertasEpp();

  return {
    sincronizacion: {
      filasRevisadas: sincronizacion.filasRevisadas,

      cierresDetectados: sincronizacion.cierresDetectados,

      actualizados: sincronizacion.actualizados.length,

      yaCumplidos: sincronizacion.yaCumplidos.length,

      noEncontrados: sincronizacion.noEncontrados.length,

      erroresExcel: sincronizacion.erroresExcel,
    },

    alertas,
  };
}

module.exports = {
  construirHtmlAlertasEpp,
  prepararConsolidadoAlertasEpp,
  enviarConsolidadoAlertasEpp,
  ejecutarProcesoDiarioAlertasEpp,
};
