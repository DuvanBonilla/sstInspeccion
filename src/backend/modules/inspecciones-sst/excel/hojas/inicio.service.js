const {
  obtenerXml,
  reemplazarXml,
} = require("../../../../shared/utils/excelXml.util");

const {
  COLORES,
  FUENTES,
  FORMATOS,
  COLORES_PESTANA,
  ESTILOS_ESTADO,
  RegistroEstilos,
} = require("../seguimientoSstExcel.estilos");

const { construirGraficoXml, construirDibujoXml } = require("./inicio.grafico");

const { LienzoHoja } = require("./inicio.lienzo");

const NOMBRE_HOJA_INICIO = "Inicio";

/**
 * Límites de filas que recorren los cálculos auxiliares de la hoja Inicio.
 */

const LIMITES = {
  extintores: 1501,
  botiquin: 3001,
  camillas: 1001,
  senalizacion: 1001,
  equipos: 1001,
};

const FILAS_ALERTA = 10;

const FILAS_ULTIMAS_INSPECCIONES = 10;

/**
 * Columnas ocultas de la hoja Inicio que calculan, fila por fila, el estado de
 * cada registro de las hojas de datos. La fila auxiliar coincide con la fila
 * de origen, por lo que `ROW()` identifica el registro.
 */

const AUXILIARES = {
  extintorDias: "AA",
  extintorResultado: "AB",
  extintorEstado: "AC",
  extintorClave: "AD",
  botiquinFaltante: "AF",
  botiquinDias: "AG",
  botiquinResultado: "AH",
  botiquinEstado: "AI",
  botiquinClave: "AJ",
  camillaResultado: "AL",
  senalResultado: "AN",
  equipoResultado: "AP",
  indiceAlertaExtintor: "AR",
  indiceAlertaBotiquin: "AS",
};

const BORDE = { estilo: "thin", color: COLORES.borde };

const BORDE_ACENTO = { estilo: "medium", color: COLORES.verde };

function fuente(tamano, { negrita = false, color = COLORES.texto, nombre } = {}) {
  return { nombre: nombre || FUENTES.principal, tamano, negrita, color };
}

const ESTILOS = {
  banda: { relleno: COLORES.verde },
  titulo: {
    fuente: fuente(18, { negrita: true, color: COLORES.blanco }),
    alineacion: { vertical: "center" },
  },
  sistema: {
    fuente: fuente(11, { negrita: true, color: COLORES.blanco }),
    alineacion: { horizontal: "right", vertical: "center" },
  },
  subtitulo: { fuente: fuente(10, { color: COLORES.blanco }) },
  etiquetaMeta: { fuente: fuente(9, { negrita: true }) },
  valorMeta: { fuente: fuente(10, { negrita: true }) },
  boton: {
    relleno: COLORES.verde,
    fuente: fuente(10, { negrita: true, color: COLORES.blanco }),
    alineacion: { horizontal: "center", vertical: "center" },
  },
  botonDatos: {
    relleno: COLORES.verdeOscuro,
    fuente: fuente(10, { negrita: true, color: COLORES.blanco }),
    alineacion: { horizontal: "center", vertical: "center" },
  },
  tarjeta: { relleno: COLORES.blanco },
  etiquetaTarjeta: {
    fuente: fuente(9, { negrita: true, color: COLORES.textoSecundario }),
    alineacion: { horizontal: "center" },
  },
  icono: {
    fuente: { nombre: FUENTES.iconos, tamano: 22 },
    alineacion: { horizontal: "center", vertical: "center" },
  },
  iconoGrande: {
    fuente: { nombre: FUENTES.iconos, tamano: 26 },
    alineacion: { horizontal: "center", vertical: "center" },
  },
  cifra: {
    fuente: fuente(24, { negrita: true }),
    alineacion: { horizontal: "center", vertical: "center" },
  },
  cifraMediana: {
    fuente: fuente(22, { negrita: true }),
    alineacion: { horizontal: "center", vertical: "center" },
  },
  detalle: { fuente: fuente(8, { color: COLORES.textoSecundario }) },
  conformidad: {
    fuente: fuente(8, { negrita: true, color: COLORES.verdeOscuro }),
    formato: FORMATOS.conformidad,
  },
  tituloPanel: { fuente: fuente(11, { negrita: true, color: COLORES.verdeOscuro }) },
  encabezadoTabla: {
    relleno: COLORES.verde,
    fuente: fuente(9, { negrita: true, color: COLORES.blanco }),
    alineacion: { horizontal: "center", vertical: "center" },
  },
  filaTabla: {
    relleno: COLORES.blanco,
    fuente: fuente(9),
    alineacion: { horizontal: "center", vertical: "center" },
    borde: { inferior: BORDE },
  },
  filaTablaIzquierda: { alineacion: { horizontal: "left", vertical: "center" } },
  etiquetaAgente: {
    fuente: fuente(9, { negrita: true }),
    alineacion: { horizontal: "center" },
  },
  seccion: { fuente: fuente(10, { negrita: true }) },
  porcentaje: { fuente: fuente(9, { negrita: true }), formato: FORMATOS.porcentaje },
  datosGrafico: { fuente: fuente(8, { color: COLORES.textoSecundario }) },
  nota: { fuente: fuente(9, { color: COLORES.textoSecundario }) },
};

/**
 * Dibuja un panel blanco con línea de acento superior y título.
 */

function dibujarPanel(lienzo, rango, referenciaTitulo, titulo) {
  lienzo.estilo(rango, ESTILOS.tarjeta).contorno(rango, {
    superior: BORDE_ACENTO,
    izquierdo: BORDE,
    derecho: BORDE,
    inferior: BORDE,
  });

  if (titulo) lienzo.texto(referenciaTitulo, titulo, ESTILOS.tituloPanel);
}

function dibujarEncabezado(lienzo) {
  lienzo.alto(2, 34).alto(3, 20);

  lienzo.estilo("B2:R3", ESTILOS.banda);

  lienzo.texto("B2", "TABLERO DE ELEMENTOS DE EMERGENCIA", ESTILOS.titulo);

  lienzo.texto("R2", "SISTEMA DE GESTIÓN SST", ESTILOS.sistema);

  lienzo.texto(
    "B3",
    "Inventario, vencimientos e inspecciones · extintores, botiquines, camillas, señalización y equipos",
    ESTILOS.subtitulo,
  );

  lienzo.texto("B5", "Fecha de corte", ESTILOS.etiquetaMeta);

  lienzo.combinar("D5:E5").formula("D5", "TODAY()", { ...ESTILOS.valorMeta, formato: FORMATOS.fecha });

  lienzo.texto("F5", "Última inspección", ESTILOS.etiquetaMeta);

  lienzo.combinar("H5:I5").formula(
    "H5",
    'IFERROR(IF(MAX(_RESUMEN!B2:B10000)=0,"—",MAX(_RESUMEN!B2:B10000)),"—")',
    { ...ESTILOS.valorMeta, formato: FORMATOS.fecha },
  );

  lienzo.texto("K5", "Inspecciones registradas", ESTILOS.etiquetaMeta);

  lienzo.combinar("N5:O5").formula("N5", "COUNTA(_RESUMEN!A2:A10000)", ESTILOS.valorMeta);
}

/**
 * Botones de navegación hacia las hojas del libro.
 *
 * @returns {Object[]} Hipervínculos internos de la fila de navegación.
 */

function dibujarNavegacion(lienzo) {
  lienzo.alto(6, 22);

  const botones = [
    { rango: "B6:C6", texto: "Extintores", hoja: "Extintores" },
    { rango: "D6:E6", texto: "Botiquines", hoja: "Botiquin" },
    { rango: "F6:G6", texto: "Camillas", hoja: "Camillas" },
    { rango: "H6:I6", texto: "Señalización", hoja: "Señalizacion" },
    { rango: "K6:L6", texto: "Equipos", hoja: "Equipo_T.A.D.E" },
    { rango: "M6:N6", texto: "Buscar por ID", hoja: "General" },
    {
      rango: "O6:Q6",
      texto: "Datos del aplicativo",
      hoja: "Extintores",
      estilo: ESTILOS.botonDatos,
    },
  ];

  return botones.map(({ rango, texto, hoja, estilo }) => {
    const referencia = rango.split(":")[0];

    lienzo.estilo(rango, estilo || ESTILOS.boton).combinar(rango);

    lienzo.texto(referencia, texto);

    return { referencia, ubicacion: `'${hoja}'!A1`, texto };
  });
}

/**
 * Dibuja una tarjeta de indicador de cuatro columnas en las filas 8 a 12.
 */

function dibujarTarjeta(lienzo, columnas, contenido) {
  const [c1, c2, , c4] = columnas;

  const rango = `${c1}8:${c4}12`;

  lienzo.estilo(rango, ESTILOS.tarjeta).contorno(rango, {
    superior: BORDE_ACENTO,
    izquierdo: BORDE,
    derecho: BORDE,
    inferior: BORDE,
  });

  lienzo.combinar(`${c2}8:${c4}8`).texto(`${c2}8`, contenido.etiqueta, ESTILOS.etiquetaTarjeta);

  lienzo.texto(`${c1}9`, contenido.icono, ESTILOS.icono);

  lienzo.combinar(`${c2}9:${c4}9`).formula(`${c2}9`, contenido.cifra, ESTILOS.cifra);

  lienzo.combinar(`${c1}10:${c4}10`).formula(`${c1}10`, contenido.detalle1, ESTILOS.detalle);

  lienzo.combinar(`${c1}11:${c4}11`).formula(`${c1}11`, contenido.detalle2, ESTILOS.detalle);

  lienzo.combinar(`${c1}12:${c4}12`).formula(`${c1}12`, contenido.conformidad, ESTILOS.conformidad);
}

function rangoAux(columna, limite) {
  return `$${columna}$2:$${columna}$${limite}`;
}

function contar(columna, limite, valor) {
  return `COUNTIF(${rangoAux(columna, limite)},"${valor}")`;
}

function dibujarIndicadores(lienzo) {
  lienzo.alto(9, 36);

  const { extintorEstado, botiquinEstado, camillaResultado, senalResultado } =
    AUXILIARES;

  dibujarTarjeta(lienzo, ["B", "C", "D", "E"], {
    etiqueta: "EXTINTORES",
    icono: "🧯",
    cifra: "COUNTA(Extintores!J2:J10000)",
    detalle1:
      `"Conformes: "&${contar(extintorEstado, LIMITES.extintores, "Conforme")}` +
      `&"   Por vencer: "&${contar(extintorEstado, LIMITES.extintores, "Por vencer")}`,
    detalle2:
      `"Vencidos: "&${contar(extintorEstado, LIMITES.extintores, "Vencido")}` +
      `&"   No conformes: "&${contar(extintorEstado, LIMITES.extintores, "No conforme")}`,
    conformidad:
      `IFERROR(${contar(extintorEstado, LIMITES.extintores, "Conforme")}` +
      "/COUNTA(Extintores!J2:J10000),0)",
  });

  dibujarTarjeta(lienzo, ["F", "G", "H", "I"], {
    etiqueta: "BOTIQUINES",
    icono: "🩹",
    cifra: "COUNTIF(Botiquin!C2:C10000,1)",
    detalle1: `"Insumos conformes: "&${contar(botiquinEstado, LIMITES.botiquin, "Conforme")}`,
    detalle2:
      `"Vencidos: "&${contar(botiquinEstado, LIMITES.botiquin, "Vencido")}` +
      `&"   No conformes: "&${contar(botiquinEstado, LIMITES.botiquin, "No conforme")}`,
    conformidad:
      `IFERROR(${contar(botiquinEstado, LIMITES.botiquin, "Conforme")}` +
      "/COUNTA(Botiquin!L2:L10000),0)",
  });

  dibujarTarjeta(lienzo, ["K", "L", "M", "N"], {
    etiqueta: "CAMILLAS",
    icono: "🚑",
    cifra: "COUNTA(Camillas!J2:J10000)",
    detalle1: `"Conformes: "&${contar(camillaResultado, LIMITES.camillas, "Conforme")}`,
    detalle2:
      `"No conformes: "&${contar(camillaResultado, LIMITES.camillas, "No conforme")}` +
      `&"   Obs.: "&${contar(camillaResultado, LIMITES.camillas, "Con observaciones")}`,
    conformidad:
      `IFERROR(${contar(camillaResultado, LIMITES.camillas, "Conforme")}` +
      "/COUNTA(Camillas!J2:J10000),0)",
  });

  dibujarTarjeta(lienzo, ["O", "P", "Q", "R"], {
    etiqueta: "SEÑALES INSTALADAS",
    icono: "⚠️",
    cifra: "SUM(Señalizacion!L2:L10000)",
    detalle1:
      '"Registros: "&COUNTA(Señalizacion!J2:J10000)' +
      `&"   Conformes: "&${contar(senalResultado, LIMITES.senalizacion, "Conforme")}`,
    detalle2: `"No conformes: "&${contar(senalResultado, LIMITES.senalizacion, "No conforme")}`,
    conformidad:
      `IFERROR(${contar(senalResultado, LIMITES.senalizacion, "Conforme")}` +
      "/COUNTA(Señalizacion!J2:J10000),0)",
  });
}

/**
 * Panel del gráfico de estado general y tabla de datos que lo alimenta,
 * tomada de la sección D de la hoja General.
 */

function dibujarEstadoGeneral(lienzo) {
  dibujarPanel(lienzo, "B14:I27", "B14", "Estado general por tipo de elemento");

  lienzo.texto("U13", "Datos del gráfico (desde la hoja General)", ESTILOS.datosGrafico);

  ["Sección", "Bueno", "Regular", "Malo", "No cumple"].forEach((texto, indice) => {
    lienzo.texto(`${"UVWXY"[indice]}14`, texto, ESTILOS.datosGrafico);
  });

  for (let fila = 15; fila <= 19; fila += 1) {
    const filaGeneral = fila + 9;

    ["B", "F", "G", "H", "I"].forEach((columnaGeneral, indice) => {
      lienzo.formula(
        `${"UVWXY"[indice]}${fila}`,
        `General!${columnaGeneral}${filaGeneral}`,
        ESTILOS.datosGrafico,
      );
    });
  }
}

function dibujarAgentes(lienzo) {
  dibujarPanel(lienzo, "K14:R27", "K14", "Extintores por tipo de agente");

  const agentes = [
    { columnas: ["K", "L"], color: COLORES.ambar, nombre: "Solkaflam", origen: "L" },
    { columnas: ["M", "N"], color: COLORES.gris, nombre: "CO2", origen: "M" },
    { columnas: ["O", "P"], color: COLORES.rojo, nombre: "Multipropósito", origen: "N" },
    { columnas: ["Q", "R"], color: COLORES.verdeAgua, nombre: "Agua", origen: "O" },
  ];

  for (const { columnas, color, nombre, origen } of agentes) {
    const [desde, hasta] = columnas;

    lienzo.estilo(`${desde}16:${hasta}16`, { relleno: color });

    lienzo.combinar(`${desde}17:${hasta}19`).texto(`${desde}17`, "🧯", ESTILOS.iconoGrande);

    lienzo.combinar(`${desde}20:${hasta}20`).texto(`${desde}20`, nombre, ESTILOS.etiquetaAgente);

    lienzo
      .combinar(`${desde}21:${hasta}22`)
      .formula(`${desde}21`, `COUNTIF(Extintores!${origen}2:${origen}10000,"SI")`, ESTILOS.cifraMediana);
  }

  lienzo.texto("K24", "Conteo de registros por agente en la hoja Extintores.", ESTILOS.detalle);
}

/**
 * Tablas de alertas ordenadas por días para vencer. Incluyen registros
 * vencidos, por vencer y no conformes.
 */

function dibujarAlertas(lienzo) {
  dibujarPanel(lienzo, "B29:I41", "B29", "Alertas de extintores");

  dibujarPanel(lienzo, "K29:R41", "K29", "Alertas de botiquines");

  const columnasExtintor = [
    { rango: "B", titulo: "Código", origen: "Extintores!$J:$J" },
    { rango: "C:D", titulo: "Sede", origen: "Extintores!$D:$D", izquierda: true },
    { rango: "E:F", titulo: "Ubicación", origen: "Extintores!$K:$K", izquierda: true },
    { rango: "G", titulo: "Vence", fecha: true },
    { rango: "H:I", titulo: "Estado", origen: `$${AUXILIARES.extintorEstado}:$${AUXILIARES.extintorEstado}`, izquierda: true },
  ];

  const columnasBotiquin = [
    { rango: "K", titulo: "Bot.", origen: "Botiquin!$K:$K" },
    { rango: "L:N", titulo: "Ítem", origen: "Botiquin!$L:$L", izquierda: true },
    { rango: "O:P", titulo: "Vence", origen: "Botiquin!$P:$P", izquierda: true, fecha: true },
    { rango: "Q:R", titulo: "Estado", origen: `$${AUXILIARES.botiquinEstado}:$${AUXILIARES.botiquinEstado}`, izquierda: true },
  ];

  const tablas = [
    { columnas: columnasExtintor, indice: AUXILIARES.indiceAlertaExtintor, clave: AUXILIARES.extintorClave, limite: LIMITES.extintores },
    { columnas: columnasBotiquin, indice: AUXILIARES.indiceAlertaBotiquin, clave: AUXILIARES.botiquinClave, limite: LIMITES.botiquin },
  ];

  for (const { columnas, indice, clave, limite } of tablas) {
    for (const columna of columnas) {
      const [desde, hasta = desde] = columna.rango.split(":");

      if (desde !== hasta) lienzo.combinar(`${desde}30:${hasta}30`);

      lienzo.estilo(`${desde}30:${hasta}30`, ESTILOS.encabezadoTabla).texto(`${desde}30`, columna.titulo);
    }

    for (let posicion = 1; posicion <= FILAS_ALERTA; posicion += 1) {
      const fila = 30 + posicion;

      const celdaIndice = `$${indice}${fila}`;

      lienzo.formula(
        `${indice}${fila}`,
        `IFERROR(MOD(SMALL(${rangoAux(clave, limite)},${posicion}),10000),0)`,
      );

      for (const columna of columnas) {
        const [desde, hasta = desde] = columna.rango.split(":");

        if (desde !== hasta) lienzo.combinar(`${desde}${fila}:${hasta}${fila}`);

        lienzo.estilo(`${desde}${fila}:${hasta}${fila}`, ESTILOS.filaTabla);

        let formula;

        if (columna.origen) {
          const valor = `INDEX(${columna.origen},${celdaIndice})`;

          formula = `IF(${celdaIndice}=0,"",IF(${valor}="","",${valor}))`;
        } else {
          formula =
            `IF(${celdaIndice}=0,"",IFERROR(DATE(VALUE(INDEX(Extintores!$R:$R,${celdaIndice})),` +
            `VALUE(INDEX(Extintores!$Q:$Q,${celdaIndice}))+1,0),""))`;
        }

        lienzo.formula(`${desde}${fila}`, formula, {
          ...(columna.izquierda ? ESTILOS.filaTablaIzquierda : {}),
          ...(columna.fecha
            ? {
                formato: FORMATOS.fecha,
                alineacion: { horizontal: "center", vertical: "center", reducir: true },
              }
            : {}),
        });
      }
    }
  }

  const nota = "Ordenadas por días para vencer; incluye vencidos, por vencer y no conformes.";

  lienzo.texto("B41", nota, ESTILOS.detalle);

  lienzo.texto("K41", nota, ESTILOS.detalle);
}

function dibujarCumplimiento(lienzo) {
  dibujarPanel(lienzo, "B43:I50", "B43", "Cumplimiento por sección (% de elementos conformes)");

  const secciones = [
    { nombre: "Extintores", columna: AUXILIARES.extintorResultado, limite: LIMITES.extintores },
    { nombre: "Botiquines (insumos)", columna: AUXILIARES.botiquinResultado, limite: LIMITES.botiquin },
    { nombre: "Camillas", columna: AUXILIARES.camillaResultado, limite: LIMITES.camillas },
    { nombre: "Señalización", columna: AUXILIARES.senalResultado, limite: LIMITES.senalizacion },
    { nombre: "Equipos T.A.D.E", columna: AUXILIARES.equipoResultado, limite: LIMITES.equipos },
  ];

  secciones.forEach(({ nombre, columna, limite }, indice) => {
    const fila = 45 + indice;

    const conformes = contar(columna, limite, "Conforme");

    const evaluados =
      `(${conformes}+${contar(columna, limite, "Con observaciones")}` +
      `+${contar(columna, limite, "No conforme")})`;

    lienzo.combinar(`B${fila}:C${fila}`).texto(`B${fila}`, nombre, ESTILOS.seccion);

    lienzo
      .combinar(`D${fila}:H${fila}`)
      .formula(`D${fila}`, `IFERROR(${conformes}/${evaluados},0)`, ESTILOS.porcentaje);

    lienzo.formula(`I${fila}`, `${conformes}&" de "&${evaluados}`, ESTILOS.detalle);
  });
}

function dibujarUltimasInspecciones(lienzo) {
  dibujarPanel(lienzo, "K43:R54", "K43", "Últimas inspecciones registradas");

  const columnas = [
    { rango: "K:L", titulo: "Fecha", origen: "B", fecha: true },
    { rango: "M:O", titulo: "Id inspección", origen: "A" },
    { rango: "P", titulo: "Sede", origen: "C" },
    { rango: "Q:R", titulo: "Responsable", origen: "E" },
  ];

  for (const { rango, titulo } of columnas) {
    const [desde, hasta = desde] = rango.split(":");

    if (desde !== hasta) lienzo.combinar(`${desde}44:${hasta}44`);

    lienzo.estilo(`${desde}44:${hasta}44`, ESTILOS.encabezadoTabla).texto(`${desde}44`, titulo);
  }

  for (let posicion = 0; posicion < FILAS_ULTIMAS_INSPECCIONES; posicion += 1) {
    const fila = 45 + posicion;

    const filaResumen = 2 + posicion;

    for (const { rango, origen, fecha } of columnas) {
      const [desde, hasta = desde] = rango.split(":");

      if (desde !== hasta) lienzo.combinar(`${desde}${fila}:${hasta}${fila}`);

      lienzo.estilo(`${desde}${fila}:${hasta}${fila}`, ESTILOS.filaTabla);

      lienzo.formula(
        `${desde}${fila}`,
        `IF(_RESUMEN!${origen}${filaResumen}="","",_RESUMEN!${origen}${filaResumen})`,
        fecha ? { formato: FORMATOS.fecha } : {},
      );
    }
  }
}

function dibujarNotas(lienzo) {
  lienzo.texto(
    "B56",
    "Leyenda:  B Bueno · R Regular · M Malo · NC No cumple · NA No aplica",
    ESTILOS.nota,
  );

  lienzo.texto(
    "B57",
    "Este libro lo actualiza el aplicativo. No edites las hojas grises (Extintores, Camillas, " +
      "Señalizacion, Equipo_T.A.D.E, Botiquin, General): el aplicativo reescribe sus datos por posición.",
    ESTILOS.nota,
  );
}

/**
 * Escribe las columnas ocultas que calculan el estado de cada registro.
 */

function escribirCalculosAuxiliares(lienzo) {
  const a = AUXILIARES;

  const encabezados = {
    [a.extintorDias]: "Ext. días",
    [a.extintorResultado]: "Ext. resultado",
    [a.extintorEstado]: "Ext. estado",
    [a.extintorClave]: "Ext. clave alerta",
    [a.botiquinFaltante]: "Bot. faltante",
    [a.botiquinDias]: "Bot. días",
    [a.botiquinResultado]: "Bot. resultado",
    [a.botiquinEstado]: "Bot. estado",
    [a.botiquinClave]: "Bot. clave alerta",
    [a.camillaResultado]: "Cam. resultado",
    [a.senalResultado]: "Señal resultado",
    [a.equipoResultado]: "Equipo resultado",
    [a.indiceAlertaExtintor]: "Fila alerta ext.",
    [a.indiceAlertaBotiquin]: "Fila alerta bot.",
  };

  for (const [columna, texto] of Object.entries(encabezados)) {
    lienzo.texto(`${columna}1`, texto);
  }

  const resultadoCalificaciones = (hoja, desde, hasta, r) => {
    const rango = `${hoja}!$${desde}${r}:$${hasta}${r}`;

    return (
      `IF(${hoja}!$A${r}="","",IF(COUNTIF(${rango},"M")+COUNTIF(${rango},"NC")>0,"No conforme",` +
      `IF(COUNTIF(${rango},"R")>0,"Con observaciones","Conforme")))`
    );
  };

  const estado = (resultado, dias, r) =>
    `IF(${resultado}${r}="","",IF(${dias}${r}="",IF(${resultado}${r}="Conforme","Sin fecha",${resultado}${r}),` +
    `IF(${dias}${r}<0,"Vencido",IF(${resultado}${r}="No conforme","No conforme",` +
    `IF(${dias}${r}<=30,"Por vencer",${resultado}${r})))))`;

  const clave = (estadoColumna, dias, r) =>
    `IF(OR(${estadoColumna}${r}="",${estadoColumna}${r}="Conforme",${estadoColumna}${r}="Sin fecha",` +
    `${estadoColumna}${r}="Con observaciones"),"",(IF(${dias}${r}="",0,${dias}${r})+100000)*10000+ROW())`;

  for (let r = 2; r <= LIMITES.extintores; r += 1) {
    lienzo.formula(
      `${a.extintorDias}${r}`,
      `IF(Extintores!$A${r}="","",IFERROR(DATE(VALUE(Extintores!$R${r}),VALUE(Extintores!$Q${r})+1,0)-TODAY(),""))`,
    );

    lienzo.formula(`${a.extintorResultado}${r}`, resultadoCalificaciones("Extintores", "S", "AK", r));

    lienzo.formula(`${a.extintorEstado}${r}`, estado(a.extintorResultado, a.extintorDias, r));

    lienzo.formula(`${a.extintorClave}${r}`, clave(a.extintorEstado, a.extintorDias, r));
  }

  for (let r = 2; r <= LIMITES.botiquin; r += 1) {
    lienzo.formula(
      `${a.botiquinFaltante}${r}`,
      `IF(Botiquin!$A${r}="","",IFERROR(MAX(0,Botiquin!$M${r}-Botiquin!$N${r}),""))`,
    );

    lienzo.formula(
      `${a.botiquinDias}${r}`,
      `IF(Botiquin!$P${r}="","",IFERROR(Botiquin!$P${r}-TODAY(),""))`,
    );

    lienzo.formula(
      `${a.botiquinResultado}${r}`,
      `IF(Botiquin!$A${r}="","",IF(OR(Botiquin!$O${r}="M",Botiquin!$O${r}="NC",N(${a.botiquinFaltante}${r})>0),` +
        `"No conforme",IF(Botiquin!$O${r}="R","Con observaciones","Conforme")))`,
    );

    lienzo.formula(`${a.botiquinEstado}${r}`, estado(a.botiquinResultado, a.botiquinDias, r));

    lienzo.formula(`${a.botiquinClave}${r}`, clave(a.botiquinEstado, a.botiquinDias, r));
  }

  for (let r = 2; r <= LIMITES.camillas; r += 1) {
    lienzo.formula(`${a.camillaResultado}${r}`, resultadoCalificaciones("Camillas", "L", "R", r));
  }

  for (let r = 2; r <= LIMITES.senalizacion; r += 1) {
    lienzo.formula(`${a.senalResultado}${r}`, resultadoCalificaciones("Señalizacion", "M", "N", r));
  }

  for (let r = 2; r <= LIMITES.equipos; r += 1) {
    lienzo.formula(`${a.equipoResultado}${r}`, resultadoCalificaciones("'Equipo_T.A.D.E'", "M", "N", r));
  }
}

function construirFormatoCondicionalXml(registro) {
  const diferenciales = ESTILOS_ESTADO.map((estilo) => registro.diferencial(estilo));

  const reglasEstado = ESTILOS_ESTADO.map(
    ({ valor }, indice) =>
      `<cfRule type="cellIs" dxfId="${diferenciales[indice]}" priority="${indice + 1}" operator="equal">` +
      `<formula>"${valor}"</formula></cfRule>`,
  ).join("");

  const barraDatos =
    `<cfRule type="dataBar" priority="${ESTILOS_ESTADO.length + 1}">` +
    '<dataBar minLength="0" maxLength="100"><cfvo type="num" val="0"/><cfvo type="num" val="1"/>' +
    `<color rgb="FF${COLORES.verde}"/></dataBar></cfRule>`;

  return (
    `<conditionalFormatting sqref="H31:H40 Q31:Q40">${reglasEstado}</conditionalFormatting>` +
    `<conditionalFormatting sqref="D45:D49">${barraDatos}</conditionalFormatting>`
  );
}

/**
 * Construye el XML completo de la hoja Inicio.
 *
 * @param {RegistroEstilos} registro Registro de estilos del libro.
 * @returns {string} Contenido de la hoja.
 */

function construirHojaInicioXml(registro) {
  const lienzo = new LienzoHoja();

  lienzo
    .ancho("A", 2)
    .ancho("B:I", 9.5)
    .ancho("J", 3)
    .ancho("K:R", 9.5)
    .ancho("T", 3)
    .ancho("U:Y", 11)
    .ancho("AA:AS", 12, { oculta: true });

  dibujarEncabezado(lienzo);

  const hipervinculos = dibujarNavegacion(lienzo);

  dibujarIndicadores(lienzo);

  dibujarEstadoGeneral(lienzo);

  dibujarAgentes(lienzo);

  dibujarAlertas(lienzo);

  dibujarCumplimiento(lienzo);

  dibujarUltimasInspecciones(lienzo);

  dibujarNotas(lienzo);

  escribirCalculosAuxiliares(lienzo);

  const hipervinculosXml =
    "<hyperlinks>" +
    hipervinculos
      .map(
        ({ referencia, ubicacion, texto }) =>
          `<hyperlink ref="${referencia}" location="${ubicacion.replace(/&/g, "&amp;")}" display="${texto}"/>`,
      )
      .join("") +
    "</hyperlinks>";

  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    `<sheetPr><tabColor rgb="FF${COLORES_PESTANA.inicio}"/><pageSetUpPr fitToPage="1"/></sheetPr>` +
    `<dimension ref="${lienzo.obtenerDimension()}"/>` +
    '<sheetViews><sheetView tabSelected="1" showGridLines="0" zoomScale="90" zoomScaleNormal="90" workbookViewId="0">' +
    '<selection activeCell="A1" sqref="A1"/></sheetView></sheetViews>' +
    '<sheetFormatPr defaultRowHeight="15"/>' +
    lienzo.construirColumnasXml() +
    lienzo.construirDatosXml(registro) +
    lienzo.construirCombinadasXml() +
    construirFormatoCondicionalXml(registro) +
    hipervinculosXml +
    '<pageMargins left="0.5" right="0.5" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>' +
    '<pageSetup orientation="portrait" fitToWidth="1" fitToHeight="1"/>' +
    '<drawing r:id="rId1"/>' +
    "</worksheet>"
  );
}

const RUTAS = {
  workbook: "xl/workbook.xml",
  relacionesWorkbook: "xl/_rels/workbook.xml.rels",
  tiposContenido: "[Content_Types].xml",
  hojaInicio: "xl/worksheets/sheetInicio.xml",
  relacionesHojaInicio: "xl/worksheets/_rels/sheetInicio.xml.rels",
  dibujoInicio: "xl/drawings/drawingInicio.xml",
  relacionesDibujoInicio: "xl/drawings/_rels/drawingInicio.xml.rels",
  graficoInicio: "xl/charts/chartInicio.xml",
};

const ID_RELACION_INICIO = "rIdInicioSst";

const TIPOS = {
  hoja: "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml",
  dibujo: "application/vnd.openxmlformats-officedocument.drawing+xml",
  grafico: "application/vnd.openxmlformats-officedocument.drawingml.chart+xml",
};

const RELACIONES = {
  hoja: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet",
  dibujo: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing",
  grafico: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart",
};

function escribirArchivo(zip, ruta, contenido) {
  const buffer = Buffer.from(contenido, "utf8");

  if (zip.getEntry(ruta)) {
    zip.updateFile(ruta, buffer);
  } else {
    zip.addFile(ruta, buffer);
  }
}

function construirRelacionesXml(relaciones) {
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    relaciones
      .map(
        ({ id, tipo, destino }) =>
          `<Relationship Id="${id}" Type="${tipo}" Target="${destino}"/>`,
      )
      .join("") +
    "</Relationships>"
  );
}

function registrarTipoContenido(tiposXml, parte, tipo) {
  if (tiposXml.includes(`PartName="${parte}"`)) {
    return tiposXml;
  }

  return tiposXml.replace(
    "</Types>",
    `<Override PartName="${parte}" ContentType="${tipo}"/></Types>`,
  );
}

/**
 * Registra la hoja Inicio como primera pestaña del libro.
 *
 * Si la hoja ya existe en la ubicación de la presentación, se conserva su
 * registro y solo se regenera su contenido.
 *
 * @throws {Error} Si existe una hoja Inicio que no fue creada por este módulo.
 */

function registrarHojaInicio(zip) {
  let workbookXml = obtenerXml(zip, RUTAS.workbook);

  const hojaExistente = workbookXml.match(
    new RegExp(`<sheet\\b[^>]*name="${NOMBRE_HOJA_INICIO}"[^>]*/>`),
  )?.[0];

  if (hojaExistente) {
    if (!hojaExistente.includes(`r:id="${ID_RELACION_INICIO}"`)) {
      throw new Error(
        "El libro ya tiene una hoja Inicio que no fue creada por la presentación SST",
      );
    }

    return false;
  }

  const identificadores = [...workbookXml.matchAll(/<sheet\b[^>]*\bsheetId="(\d+)"/g)].map(
    (coincidencia) => Number(coincidencia[1]),
  );

  const nuevaHoja =
    `<sheet name="${NOMBRE_HOJA_INICIO}" sheetId="${Math.max(0, ...identificadores) + 1}" ` +
    `r:id="${ID_RELACION_INICIO}"/>`;

  workbookXml = workbookXml.replace(/<sheets>/, `<sheets>${nuevaHoja}`);

  // La nueva hoja ocupa la posición 0: los nombres definidos locales se
  // desplazan una posición para seguir apuntando a su hoja original.
  workbookXml = workbookXml.replace(
    /(<definedName\b[^>]*\blocalSheetId=")(\d+)"/g,
    (coincidencia, prefijo, indice) => `${prefijo}${Number(indice) + 1}"`,
  );

  const areaImpresion =
    `<definedName name="_xlnm.Print_Area" localSheetId="0">` +
    `'${NOMBRE_HOJA_INICIO}'!$A$1:$S$57</definedName>`;

  if (/<definedNames>/.test(workbookXml)) {
    workbookXml = workbookXml.replace("<definedNames>", `<definedNames>${areaImpresion}`);
  } else {
    workbookXml = workbookXml.replace("</sheets>", `</sheets><definedNames>${areaImpresion}</definedNames>`);
  }

  workbookXml = workbookXml.replace(/<workbookView\b([^>]*?)(\/?)>/, (coincidencia, atributos, cierre) => {
    const limpios = atributos.replace(/\s*\b(activeTab|firstSheet)="\d+"/g, "");

    return `<workbookView${limpios} activeTab="0" firstSheet="0"${cierre}>`;
  });

  reemplazarXml(zip, RUTAS.workbook, workbookXml);

  const relacionesXml = obtenerXml(zip, RUTAS.relacionesWorkbook);

  reemplazarXml(
    zip,
    RUTAS.relacionesWorkbook,
    relacionesXml.replace(
      "</Relationships>",
      `<Relationship Id="${ID_RELACION_INICIO}" Type="${RELACIONES.hoja}" Target="worksheets/sheetInicio.xml"/></Relationships>`,
    ),
  );

  return true;
}

/**
 * Quita la selección de las demás pestañas para que Excel abra el libro en
 * Inicio sin agrupar hojas.
 */

function deseleccionarOtrasHojas(zip) {
  for (const entrada of zip.getEntries()) {
    const ruta = entrada.entryName;

    if (!/^xl\/worksheets\/[^/]+\.xml$/.test(ruta) || ruta === RUTAS.hojaInicio) {
      continue;
    }

    const xml = entrada.getData().toString("utf8");

    if (/<sheetView\b[^>]*\btabSelected="1"/.test(xml)) {
      reemplazarXml(zip, ruta, xml.replace(/(<sheetView\b[^>]*?)\s*\btabSelected="1"/, "$1"));
    }
  }
}

function escribirPartesInicio(zip, registro) {
  escribirArchivo(zip, RUTAS.hojaInicio, construirHojaInicioXml(registro));

  escribirArchivo(
    zip,
    RUTAS.relacionesHojaInicio,
    construirRelacionesXml([
      { id: "rId1", tipo: RELACIONES.dibujo, destino: "../drawings/drawingInicio.xml" },
    ]),
  );

  escribirArchivo(zip, RUTAS.dibujoInicio, construirDibujoXml());

  escribirArchivo(
    zip,
    RUTAS.relacionesDibujoInicio,
    construirRelacionesXml([
      { id: "rId1", tipo: RELACIONES.grafico, destino: "../charts/chartInicio.xml" },
    ]),
  );

  escribirArchivo(zip, RUTAS.graficoInicio, construirGraficoXml(NOMBRE_HOJA_INICIO));

  let tiposXml = obtenerXml(zip, RUTAS.tiposContenido);

  tiposXml = registrarTipoContenido(tiposXml, `/${RUTAS.hojaInicio}`, TIPOS.hoja);

  tiposXml = registrarTipoContenido(tiposXml, `/${RUTAS.dibujoInicio}`, TIPOS.dibujo);

  tiposXml = registrarTipoContenido(tiposXml, `/${RUTAS.graficoInicio}`, TIPOS.grafico);

  reemplazarXml(zip, RUTAS.tiposContenido, tiposXml);
}

/**
 * Construye o regenera la hoja Inicio del seguimiento SST.
 *
 * La hoja se ubica como primera pestaña y resume las demás hojas con
 * indicadores, gráfico, alertas de vencimiento, cumplimiento por sección,
 * últimas inspecciones y accesos a cada hoja. Sus cálculos usan únicamente
 * los datos existentes en el libro. Puede ejecutarse en cada actualización
 * sin duplicar la hoja ni sus estilos.
 *
 * @param {AdmZip} zip Archivo XLSM abierto como contenedor ZIP.
 * @returns {{creada: boolean}} Indica si la hoja se creó en esta ejecución.
 */

function actualizarInicio(zip) {
  if (!zip) {
    throw new Error("Se requiere el archivo Excel cargado en memoria");
  }

  const registro = new RegistroEstilos(zip);

  const creada = registrarHojaInicio(zip);

  escribirPartesInicio(zip, registro);

  deseleccionarOtrasHojas(zip);

  registro.guardar();

  return { creada };
}

module.exports = {
  NOMBRE_HOJA_INICIO,
  actualizarInicio,
};/**
 * Construye o regenera la hoja Inicio del seguimiento SST.
 *
 * La hoja se ubica como primera pestaña y resume las demás hojas con
 * indicadores, gráfico, alertas de vencimiento, cumplimiento por sección,
 * últimas inspecciones y accesos a cada hoja. Sus cálculos usan únicamente
 * los datos existentes en el libro. Puede ejecutarse en cada actualización
 * sin duplicar la hoja ni sus estilos.
 *
 * @param {AdmZip} zip Archivo XLSM abierto como contenedor ZIP.
 * @returns {{creada: boolean}} Indica si la hoja se creó en esta ejecución.
 */

function actualizarInicio(zip) {
  if (!zip) {
    throw new Error("Se requiere el archivo Excel cargado en memoria");
  }

  const registro = new RegistroEstilos(zip);

  const creada = registrarHojaInicio(zip);

  escribirPartesInicio(zip, registro);

  deseleccionarOtrasHojas(zip);

  registro.guardar();

  return { creada };
}

module.exports = {
  NOMBRE_HOJA_INICIO,
  actualizarInicio,
};
