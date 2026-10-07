/**
 * Construye el contenido HTML del correo de una inspección EPP aprobada.
 *
 * Genera una plantilla con la información general de la inspección, el resumen
 * de trabajadores y novedades, los responsables de aprobación y el acceso al
 * informe almacenado en OneDrive.
 *
 * El botón de acceso a OneDrive solamente se incorpora cuando existe una URL
 * disponible. Cuando no se recibe el nombre de algún aprobador, se muestra
 * el texto `Aprobado`.
 *
 * @param {Object} datos Información utilizada para construir el correo.
 * @param {string} datos.inspeccionId Identificador único de la inspección.
 * @param {number} [datos.numInspeccion] Número consecutivo de la inspección.
 * @param {string} datos.fecha Fecha de realización.
 * @param {string} datos.sedeOperacion Sede operacional.
 * @param {string} datos.areaTrabajo Área inspeccionada.
 * @param {string} datos.responsableInspeccion Responsable de la inspección.
 * @param {number} [datos.totalTrabajadores=0] Trabajadores evaluados.
 * @param {number} [datos.trabajadoresConNovedad=0] Trabajadores con novedades.
 * @param {number} [datos.trabajadoresSinNovedad=0] Trabajadores sin novedades.
 * @param {number} [datos.totalNovedades=0] Cantidad total de novedades.
 * @param {Object} [datos.aprobaciones={}] Responsables que aprobaron.
 * @param {string|null} [datos.webUrl=null] URL del informe en OneDrive.
 * @returns {string} Plantilla HTML completa del correo EPP.
 */

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
  const inspector = aprobaciones?.inspector?.nombre || "Aprobado";

  const jefe = aprobaciones?.jefe?.nombre || "Aprobado";

  const copasst = aprobaciones?.copasst?.nombre || "Aprobado";

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

/**
 * Determina el correo destinatario de una inspección EPP según la sede.
 *
 * Para Santa Marta y Urabá utiliza los correos institucionales definidos.
 * Para las demás sedes utiliza el correo manual recibido o la variable de
 * entorno `GRAPH_EMAIL_TO_TEST`.
 *
 * @param {string} sedeOperacion Sede donde se realizó la inspección.
 * @param {string|null} correoManual Correo alternativo proporcionado manualmente.
 * @returns {string|undefined} Dirección de correo que recibirá el informe EPP.
 */

function resolverCorreoDestinoEpp(sedeOperacion, correoManual) {
  const sede = (sedeOperacion || "").toLowerCase().trim();

  if (sede.includes("santa marta")) {
    return "sstsantamarta@cargoban.com.co";
  }

  if (sede.includes("urab")) {
    return "s.ocupacional@cargoban.com.co";
  }

  return correoManual || process.env.GRAPH_EMAIL_TO_TEST;
}

module.exports = {
  construirHtmlCorreoEpp,
  resolverCorreoDestinoEpp,
};
