const fs = require("fs");

const path = require("path");

const {
  buscarRutaHoja,
  leerRelaciones,
  normalizarDestino,
} = require("../rutasLibroExcel");

const { leerTextoCelda } = require("./encabezados.service");

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

const {
  COLUMNAS_DATOS_GRAFICO,
  construirGraficoXml,
  construirDibujoXml,
} = require("./inicio.grafico");

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
 * La hoja se dibuja en una cuadrícula de 25 columnas del mismo ancho (B a Z):
 * un bloque izquierdo de 12 columnas, una columna central y un bloque derecho
 * de 12. Las cinco tarjetas de indicadores ocupan 5 columnas cada una.
 */

const ULTIMA_COLUMNA = "Z";

/**
 * Columnas ocultas de la hoja Inicio que calculan, fila por fila, el estado de
 * cada registro de las hojas de datos. La fila auxiliar coincide con la fila
 * de origen, por lo que `ROW()` identifica el registro.
 */

const AUXILIARES = {
  extintorDias: "AH",
  extintorResultado: "AI",
  extintorEstado: "AJ",
  extintorClave: "AK",
  botiquinFaltante: "AL",
  botiquinDias: "AM",
  botiquinResultado: "AN",
  botiquinEstado: "AO",
  botiquinClave: "AP",
  camillaResultado: "AQ",
  senalResultado: "AR",
  equipoResultado: "AS",
  indiceAlertaExtintor: "AT",
  indiceAlertaBotiquin: "AU",
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
    fuente: { nombre: FUENTES.iconos, tamano: 18 },
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

  lienzo.estilo(`B2:${ULTIMA_COLUMNA}3`, ESTILOS.banda);

  lienzo.texto("B2", "TABLERO DE ELEMENTOS DE EMERGENCIA", ESTILOS.titulo);

  lienzo.texto(`${ULTIMA_COLUMNA}2`, "SISTEMA DE GESTIÓN SST", ESTILOS.sistema);

  lienzo.texto(
    "B3",
    "Inventario, vencimientos e inspecciones · extintores, botiquines, camillas, señalización y equipos",
    ESTILOS.subtitulo,
  );

  lienzo.texto("B5", "Fecha de corte", ESTILOS.etiquetaMeta);

  lienzo.combinar("E5:F5").formula("E5", "TODAY()", { ...ESTILOS.valorMeta, formato: FORMATOS.fecha });

  lienzo.texto("G5", "Última inspección", ESTILOS.etiquetaMeta);

  lienzo.combinar("J5:K5").formula(
    "J5",
    'IFERROR(IF(MAX(_RESUMEN!B2:B10000)=0,"—",MAX(_RESUMEN!B2:B10000)),"—")',
    { ...ESTILOS.valorMeta, formato: FORMATOS.fecha },
  );

  lienzo.texto("O5", "Inspecciones registradas", ESTILOS.etiquetaMeta);

  lienzo.combinar("S5:T5").formula("S5", "COUNTA(_RESUMEN!A2:A10000)", ESTILOS.valorMeta);
}

/**
 * Botones de navegación hacia las hojas del libro.
 *
 * @returns {Object[]} Hipervínculos internos de la fila de navegación.
 */

function dibujarNavegacion(lienzo) {
  lienzo.alto(6, 22);

  const botones = [
    { rango: "B6:D6", texto: "Extintores", hoja: "Extintores" },
    { rango: "E6:G6", texto: "Botiquines", hoja: "Botiquin" },
    { rango: "H6:J6", texto: "Camillas", hoja: "Camillas" },
    { rango: "K6:M6", texto: "Señalización", hoja: "Señalizacion" },
    { rango: "O6:Q6", texto: "Equipos", hoja: "Equipo_T.A.D.E" },
    { rango: "R6:T6", texto: "Buscar por ID", hoja: "General" },
    {
      rango: "U6:X6",
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
 * Dibuja una tarjeta de indicador en las filas 8 a 12.
 *
 * La primera columna de la tarjeta lleva el ícono; la cifra ocupa el resto del
 * ancho de la fila 9 y los detalles se extienden por toda la tarjeta.
 *
 * @param {LienzoHoja} lienzo Hoja en construcción.
 * @param {{primera: string, ultima: string}} columnas Columnas inicial y final.
 * @param {Object} contenido Textos y fórmulas de la tarjeta.
 */

function dibujarTarjeta(lienzo, { primera, ultima }, contenido) {
  const segunda = String.fromCharCode(primera.charCodeAt(0) + 1);

  const rango = `${primera}8:${ultima}12`;

  lienzo.estilo(rango, ESTILOS.tarjeta).contorno(rango, {
    superior: BORDE_ACENTO,
    izquierdo: BORDE,
    derecho: BORDE,
    inferior: BORDE,
  });

  lienzo.combinar(`${segunda}8:${ultima}8`).texto(`${segunda}8`, contenido.etiqueta, ESTILOS.etiquetaTarjeta);

  if (contenido.icono) {
    lienzo.texto(`${primera}9`, contenido.icono, ESTILOS.icono);
  }

  lienzo.combinar(`${segunda}9:${ultima}9`).formula(`${segunda}9`, contenido.cifra, ESTILOS.cifra);

  lienzo.combinar(`${primera}10:${ultima}10`).formula(`${primera}10`, contenido.detalle1, ESTILOS.detalle);

  lienzo.combinar(`${primera}11:${ultima}11`).formula(`${primera}11`, contenido.detalle2, ESTILOS.detalle);

  lienzo.combinar(`${primera}12:${ultima}12`).formula(`${primera}12`, contenido.conformidad, ESTILOS.conformidad);
}

function rangoAux(columna, limite) {
  return `$${columna}$2:$${columna}$${limite}`;
}

function contar(columna, limite, valor) {
  return `COUNTIF(${rangoAux(columna, limite)},"${valor}")`;
}

/**
 * Dibuja las cinco tarjetas de indicadores. Ocupan todo el ancho del tablero
 * en el mismo orden que los botones de navegación: la tercera abarca la
 * columna separadora central, de modo que quedan dos tarjetas a cada lado.
 */

function dibujarIndicadores(lienzo) {
  lienzo.alto(9, 36);

  const {
    extintorEstado,
    botiquinEstado,
    camillaResultado,
    senalResultado,
    equipoResultado,
  } = AUXILIARES;

  dibujarTarjeta(lienzo, { primera: "B", ultima: "F" }, {
    etiqueta: "EXTINTORES",
    icono: "",
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

  dibujarTarjeta(lienzo, { primera: "G", ultima: "K" }, {
    etiqueta: "BOTIQUINES",
    icono: "",
    cifra: "COUNTIF(Botiquin!C2:C10000,1)",
    detalle1: `"Insumos conformes: "&${contar(botiquinEstado, LIMITES.botiquin, "Conforme")}`,
    detalle2:
      `"Vencidos: "&${contar(botiquinEstado, LIMITES.botiquin, "Vencido")}` +
      `&"   No conformes: "&${contar(botiquinEstado, LIMITES.botiquin, "No conforme")}`,
    conformidad:
      `IFERROR(${contar(botiquinEstado, LIMITES.botiquin, "Conforme")}` +
      "/COUNTA(Botiquin!L2:L10000),0)",
  });

  dibujarTarjeta(lienzo, { primera: "L", ultima: "P" }, {
    etiqueta: "CAMILLAS",
    icono: "",
    cifra: "COUNTA(Camillas!J2:J10000)",
    detalle1: `"Conformes: "&${contar(camillaResultado, LIMITES.camillas, "Conforme")}`,
    detalle2:
      `"No conformes: "&${contar(camillaResultado, LIMITES.camillas, "No conforme")}` +
      `&"   Obs.: "&${contar(camillaResultado, LIMITES.camillas, "Con observaciones")}`,
    conformidad:
      `IFERROR(${contar(camillaResultado, LIMITES.camillas, "Conforme")}` +
      "/COUNTA(Camillas!J2:J10000),0)",
  });

  dibujarTarjeta(lienzo, { primera: "Q", ultima: "U" }, {
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

  dibujarTarjeta(lienzo, { primera: "V", ultima: "Z" }, {
    etiqueta: "EQUIPOS T.A.D.E",
    icono: "📡",
    cifra: "COUNTA('Equipo_T.A.D.E'!J2:J10000)",
    detalle1:
      `"Conformes: "&${contar(equipoResultado, LIMITES.equipos, "Conforme")}` +
      `&"   Obs.: "&${contar(equipoResultado, LIMITES.equipos, "Con observaciones")}`,
    detalle2: `"No conformes: "&${contar(equipoResultado, LIMITES.equipos, "No conforme")}`,
    conformidad:
      `IFERROR(${contar(equipoResultado, LIMITES.equipos, "Conforme")}` +
      "/COUNTA('Equipo_T.A.D.E'!J2:J10000),0)",
  });
}

/**
 * Panel del gráfico de estado general y tabla de datos que lo alimenta,
 * tomada de la sección D de la hoja General.
 */

function dibujarEstadoGeneral(lienzo) {
  dibujarPanel(lienzo, "B14:M27", "B14", "Estado general por tipo de elemento");

  const [seccion] = COLUMNAS_DATOS_GRAFICO;

  lienzo.texto(`${seccion}13`, "Datos del gráfico (desde la hoja General)", ESTILOS.datosGrafico);

  ["Sección", "Bueno", "Regular", "Malo", "No cumple"].forEach((texto, indice) => {
    lienzo.texto(`${COLUMNAS_DATOS_GRAFICO[indice]}14`, texto, ESTILOS.datosGrafico);
  });

  for (let fila = 15; fila <= 19; fila += 1) {
    const filaGeneral = fila + 9;

    ["B", "F", "G", "H", "I"].forEach((columnaGeneral, indice) => {
      lienzo.formula(
        `${COLUMNAS_DATOS_GRAFICO[indice]}${fila}`,
        `General!${columnaGeneral}${filaGeneral}`,
        ESTILOS.datosGrafico,
      );
    });
  }
}

/**
 * Bloques del panel de extintores por tipo de agente. `icono` es el sufijo de
 * la imagen del extintor, del mismo color que la franja del bloque.
 */

const EXTINTORES_POR_AGENTE = [
  { columnas: ["O", "Q"], color: COLORES.ambar, nombre: "Solkaflam", origen: "L", icono: "solkaflam" },
  { columnas: ["R", "T"], color: COLORES.gris, nombre: "CO2", origen: "M", icono: "co2" },
  { columnas: ["U", "W"], color: COLORES.rojo, nombre: "Multipropósito", origen: "N", icono: "multiproposito" },
  { columnas: ["X", "Z"], color: COLORES.verdeAgua, nombre: "Agua", origen: "O", icono: "agua" },
];

function dibujarAgentes(lienzo) {
  dibujarPanel(lienzo, "O14:Z27", "O14", "Extintores por tipo de agente");

  for (const { columnas, color, nombre, origen } of EXTINTORES_POR_AGENTE) {
    const [desde, hasta] = columnas;

    lienzo.estilo(`${desde}16:${hasta}16`, { relleno: color });

    // La imagen del extintor se dibuja encima de estas celdas.
    lienzo.combinar(`${desde}17:${hasta}19`);

    lienzo.combinar(`${desde}20:${hasta}20`).texto(`${desde}20`, nombre, ESTILOS.etiquetaAgente);

    lienzo
      .combinar(`${desde}21:${hasta}22`)
      .formula(`${desde}21`, `COUNTIF(Extintores!${origen}2:${origen}10000,"SI")`, ESTILOS.cifraMediana);
  }

  lienzo.texto("O24", "Conteo de registros por agente en la hoja Extintores.", ESTILOS.detalle);
}

/**
 * Tablas de alertas ordenadas por días para vencer. Incluyen registros
 * vencidos, por vencer y no conformes.
 */

function dibujarAlertas(lienzo) {
  dibujarPanel(lienzo, "B29:M41", "B29", "Alertas de extintores");

  dibujarPanel(lienzo, "O29:Z41", "O29", "Alertas de botiquines");

  const columnasExtintor = [
    { rango: "B:C", titulo: "Código", origen: "Extintores!$J:$J" },
    { rango: "D:F", titulo: "Sede", origen: "Extintores!$D:$D", izquierda: true },
    { rango: "G:I", titulo: "Ubicación", origen: "Extintores!$K:$K", izquierda: true },
    { rango: "J:K", titulo: "Vence", fecha: true },
    { rango: "L:M", titulo: "Estado", origen: `$${AUXILIARES.extintorEstado}:$${AUXILIARES.extintorEstado}`, izquierda: true },
  ];

  const columnasBotiquin = [
    { rango: "O:P", titulo: "Bot.", origen: "Botiquin!$K:$K" },
    { rango: "Q:T", titulo: "Ítem", origen: "Botiquin!$L:$L", izquierda: true },
    { rango: "U:W", titulo: "Vence", origen: "Botiquin!$P:$P", izquierda: true, fecha: true },
    { rango: "X:Z", titulo: "Estado", origen: `$${AUXILIARES.botiquinEstado}:$${AUXILIARES.botiquinEstado}`, izquierda: true },
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

  lienzo.texto("O41", nota, ESTILOS.detalle);
}

function dibujarCumplimiento(lienzo) {
  dibujarPanel(lienzo, "B43:M50", "B43", "Cumplimiento por sección (% de elementos conformes)");

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

    lienzo.combinar(`B${fila}:E${fila}`).texto(`B${fila}`, nombre, ESTILOS.seccion);

    lienzo
      .combinar(`F${fila}:K${fila}`)
      .formula(`F${fila}`, `IFERROR(${conformes}/${evaluados},0)`, ESTILOS.porcentaje);

    lienzo.combinar(`L${fila}:M${fila}`).formula(`L${fila}`, `${conformes}&" de "&${evaluados}`, ESTILOS.detalle);
  });
}

function dibujarUltimasInspecciones(lienzo) {
  dibujarPanel(lienzo, "O43:Z54", "O43", "Últimas inspecciones registradas");

  const columnas = [
    { rango: "O:Q", titulo: "Fecha", origen: "B", fecha: true },
    { rango: "R:U", titulo: "Id inspección", origen: "A" },
    { rango: "V:W", titulo: "Sede", origen: "C" },
    { rango: "X:Z", titulo: "Responsable", origen: "E" },
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

/**
 * Crédito de los íconos descargados de Flaticon, exigido por su licencia
 * gratuita. Cuando se conozcan los autores se agregan aquí.
 */

const CREDITOS_ICONOS =
  "Íconos creados por apien (botiquín) y pongsakornRed (camilla) - Flaticon (www.flaticon.es).";

function dibujarNotas(lienzo) {
  lienzo.texto("B58", CREDITOS_ICONOS, ESTILOS.nota);

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
    `<conditionalFormatting sqref="L31:L40 X31:X40">${reglasEstado}</conditionalFormatting>` +
    `<conditionalFormatting sqref="F45:F49">${barraDatos}</conditionalFormatting>`
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
    .ancho(`B:${ULTIMA_COLUMNA}`, 6.2)
    .ancho("AB:AF", 11)
    .ancho("AH:AU", 12, { oculta: true });

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

/**
 * Íconos que se dibujan sobre las tarjetas de extintores, botiquines y
 * camillas, y sobre cada bloque de extintores por tipo de agente. Los emojis
 * disponibles no representan un botiquín ni una camilla de rescate, ni
 * distinguen el color de cada extintor, por lo que se usan imágenes propias
 * guardadas en `excel/recursos`.
 */

const DIRECTORIO_RECURSOS = path.join(__dirname, "..", "recursos");

const IMAGENES_INICIO = [
  {
    idRelacion: "rId2",
    archivo: "icono-botiquin.png",
    parte: "iconoBotiquin.png",
    nombre: "Botiquín",
    descripcion: "Ícono de botiquín",
    columna: 6,
    fila: 8,
  },
  {
    idRelacion: "rId3",
    archivo: "icono-camilla.png",
    parte: "iconoCamilla.png",
    nombre: "Camilla",
    descripcion: "Ícono de camilla de rescate",
    columna: 11,
    fila: 8,
  },
  {
    idRelacion: "rId4",
    archivo: "icono-extintor-multiproposito.png",
    parte: "iconoExtintorMultiproposito.png",
    nombre: "Extintor",
    descripcion: "Ícono de extintor",
    columna: 1,
    fila: 8,
  },
  ...EXTINTORES_POR_AGENTE.map(({ columnas, nombre, icono }, indice) => ({
    idRelacion: `rId${5 + indice}`,
    archivo: `icono-extintor-${icono}.png`,
    parte: `iconoExtintor${icono[0].toUpperCase()}${icono.slice(1)}.png`,
    nombre: `Extintor ${nombre}`,
    descripcion: `Ícono de extintor de ${nombre}`,
    columna: columnas[0].charCodeAt(0) - "A".charCodeAt(0),
    // Bloque de 3 columnas (unos 144 px) y filas 17 a 19 (60 px): centrado.
    fila: 16,
    tamano: 56,
    margenX: 44,
    margenY: 2,
  })),
];

const TIPOS = {
  hoja: "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml",
  dibujo: "application/vnd.openxmlformats-officedocument.drawing+xml",
  grafico: "application/vnd.openxmlformats-officedocument.drawingml.chart+xml",
};

const RELACIONES = {
  hoja: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet",
  dibujo: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing",
  grafico: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart",
  imagen: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image",
};

function escribirBinario(zip, ruta, buffer) {
  if (zip.getEntry(ruta)) {
    zip.updateFile(ruta, buffer);
  } else {
    zip.addFile(ruta, buffer);
  }
}

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

function registrarExtensionPng(tiposXml) {
  if (/<Default\b[^>]*Extension="png"/i.test(tiposXml)) {
    return tiposXml;
  }

  return tiposXml.replace(
    /(<Types\b[^>]*>)/,
    '$1<Default Extension="png" ContentType="image/png"/>',
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
 * Celda y texto con los que se reconoce la hoja Inicio de este módulo aunque
 * Excel u OneDrive hayan cambiado los identificadores internos del libro.
 */

const FIRMAS_INICIO = [
  // Diseño anterior, con las columnas auxiliares a partir de AA.
  { celda: "AD1", texto: "Ext. clave alerta" },
  { celda: `${AUXILIARES.extintorClave}1`, texto: "Ext. clave alerta" },
];

/**
 * Consulta el estado de la hoja Inicio dentro del libro.
 *
 * Reconoce como propia la hoja creada por este módulo por su identificador o,
 * si Excel u OneDrive lo cambiaron al guardar, por el texto de una celda
 * auxiliar que solo escribe este módulo.
 *
 * @param {AdmZip} zip Archivo XLSM abierto como contenedor ZIP.
 * @returns {{estado: "ausente"|"propia"|"ajena", rutaHoja: string|null}}
 * Estado de la hoja y su ruta interna actual.
 */

function consultarEstadoInicio(zip) {
  const workbookXml = obtenerXml(zip, RUTAS.workbook);

  const hoja = workbookXml.match(
    new RegExp(`<sheet\\b[^>]*name="${NOMBRE_HOJA_INICIO}"[^>]*/>`),
  )?.[0];

  if (!hoja) {
    return { estado: "ausente", rutaHoja: null };
  }

  const rutaHoja = buscarRutaHoja(zip, NOMBRE_HOJA_INICIO);

  const porIdentificador = hoja.includes(`r:id="${ID_RELACION_INICIO}"`);

  const porContenido =
    Boolean(rutaHoja) &&
    Boolean(zip.getEntry(rutaHoja)) &&
    FIRMAS_INICIO.some(
      ({ celda, texto }) => leerTextoCelda(zip, rutaHoja, celda) === texto,
    );

  return {
    estado: porIdentificador || porContenido ? "propia" : "ajena",
    rutaHoja,
  };
}

/**
 * Registra la hoja Inicio como primera pestaña del libro.
 *
 * @param {AdmZip} zip Archivo XLSM abierto como contenedor ZIP.
 * @returns {void}
 */

function registrarHojaInicio(zip) {
  let workbookXml = obtenerXml(zip, RUTAS.workbook);

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
    `'${NOMBRE_HOJA_INICIO}'!$A$1:$AA$58</definedName>`;

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
}

function obtenerRutaRelaciones(ruta) {
  return path.posix.join(
    path.posix.dirname(ruta),
    "_rels",
    `${path.posix.basename(ruta)}.rels`,
  );
}

function estaReferenciada(zip, ruta, excluirRelaciones) {
  return zip
    .getEntries()
    .filter(
      ({ entryName }) =>
        entryName.endsWith(".rels") && !excluirRelaciones.includes(entryName),
    )
    .some(({ entryName }) => {
      const directorioOrigen = path.posix.dirname(path.posix.dirname(entryName));

      return leerRelaciones(zip, entryName).some(
        ({ destino }) => normalizarDestino(destino, directorioOrigen) === ruta,
      );
    });
}

/**
 * Elimina el dibujo, el gráfico y las imágenes que una versión anterior de la
 * hoja Inicio dejó en el libro, para volver a escribirlos sin dejar partes
 * huérfanas. Excel los renombra al guardar, por lo que se buscan siguiendo
 * las relaciones de la hoja.
 *
 * @param {AdmZip} zip Archivo XLSM abierto como contenedor ZIP.
 * @param {string} rutaHoja Ruta interna actual de la hoja Inicio.
 * @returns {void}
 */

function limpiarPartesAnteriores(zip, rutaHoja) {
  const relacionesHoja = obtenerRutaRelaciones(rutaHoja);

  const directorioHoja = path.posix.dirname(rutaHoja);

  const eliminar = new Set();

  for (const dibujo of leerRelaciones(zip, relacionesHoja).filter(({ tipo }) =>
    tipo.endsWith("/drawing"),
  )) {
    const rutaDibujo = normalizarDestino(dibujo.destino, directorioHoja);

    const relacionesDibujo = obtenerRutaRelaciones(rutaDibujo);

    for (const relacion of leerRelaciones(zip, relacionesDibujo)) {
      const destino = normalizarDestino(relacion.destino, path.posix.dirname(rutaDibujo));

      if (
        relacion.tipo.endsWith("/chart") ||
        (relacion.tipo.endsWith("/image") &&
          !estaReferenciada(zip, destino, [relacionesDibujo]))
      ) {
        eliminar.add(destino);
      }
    }

    eliminar.add(rutaDibujo);

    eliminar.add(relacionesDibujo);
  }

  const partesQueSeReescriben = new Set([
    RUTAS.dibujoInicio,
    RUTAS.relacionesDibujoInicio,
    RUTAS.graficoInicio,
    ...IMAGENES_INICIO.map(({ parte }) => `xl/media/${parte}`),
  ]);

  for (const ruta of eliminar) {
    if (!partesQueSeReescriben.has(ruta) && zip.getEntry(ruta)) {
      zip.deleteFile(ruta);
    }
  }

  const tiposXml = obtenerXml(zip, RUTAS.tiposContenido);

  reemplazarXml(
    zip,
    RUTAS.tiposContenido,
    tiposXml.replace(/<Override\b[^>]*\/>/g, (elemento) => {
      const parte = elemento.match(/\bPartName="([^"]*)"/)?.[1]?.replace(/^\//, "");

      return eliminar.has(parte) && !zip.getEntry(parte) ? "" : elemento;
    }),
  );
}

/**
 * Quita la selección de las demás pestañas para que Excel abra el libro en
 * Inicio sin agrupar hojas.
 */

function deseleccionarOtrasHojas(zip, rutaInicio) {
  for (const entrada of zip.getEntries()) {
    const ruta = entrada.entryName;

    if (!/^xl\/worksheets\/[^/]+\.xml$/.test(ruta) || ruta === rutaInicio) {
      continue;
    }

    const xml = entrada.getData().toString("utf8");

    if (/<sheetView\b[^>]*\btabSelected="1"/.test(xml)) {
      reemplazarXml(zip, ruta, xml.replace(/(<sheetView\b[^>]*?)\s*\btabSelected="1"/, "$1"));
    }
  }
}

function escribirPartesInicio(zip, partes, rutaHoja) {
  escribirArchivo(zip, rutaHoja, partes.hojaXml);

  escribirArchivo(
    zip,
    obtenerRutaRelaciones(rutaHoja),
    construirRelacionesXml([
      { id: "rId1", tipo: RELACIONES.dibujo, destino: "../drawings/drawingInicio.xml" },
    ]),
  );

  escribirArchivo(zip, RUTAS.dibujoInicio, partes.dibujoXml);

  escribirArchivo(
    zip,
    RUTAS.relacionesDibujoInicio,
    construirRelacionesXml([
      { id: "rId1", tipo: RELACIONES.grafico, destino: "../charts/chartInicio.xml" },
      ...IMAGENES_INICIO.map(({ idRelacion, parte }) => ({
        id: idRelacion,
        tipo: RELACIONES.imagen,
        destino: `../media/${parte}`,
      })),
    ]),
  );

  for (const { archivo, parte } of IMAGENES_INICIO) {
    escribirBinario(
      zip,
      `xl/media/${parte}`,
      fs.readFileSync(path.join(DIRECTORIO_RECURSOS, archivo)),
    );
  }

  escribirArchivo(zip, RUTAS.graficoInicio, partes.graficoXml);

  let tiposXml = obtenerXml(zip, RUTAS.tiposContenido);

  tiposXml = registrarExtensionPng(tiposXml);

  tiposXml = registrarTipoContenido(tiposXml, `/${rutaHoja}`, TIPOS.hoja);

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
 * los datos existentes en el libro.
 *
 * En cada actualización se regenera en su lugar, incluso si Excel u OneDrive
 * renombraron sus archivos internos al guardar, para que los cambios de diseño
 * lleguen a los libros ya existentes sin duplicar la hoja ni sus estilos.
 *
 * Si el libro ya trae una hoja Inicio que no es la de este módulo, la
 * conserva sin cambios y lo informa en el resultado. Todo el contenido se
 * construye antes de modificar el libro, de modo que un error no deja
 * referencias a partes inexistentes.
 *
 * @param {AdmZip} zip Archivo XLSM abierto como contenedor ZIP.
 * @returns {{creada: boolean, omitida: boolean, motivo?: string}} Indica si
 * la hoja se creó en esta ejecución o si se omitió.
 */

function actualizarInicio(zip) {
  if (!zip) {
    throw new Error("Se requiere el archivo Excel cargado en memoria");
  }

  const { estado, rutaHoja: rutaActual } = consultarEstadoInicio(zip);

  if (estado === "ajena") {
    return {
      creada: false,
      omitida: true,
      motivo:
        "El libro ya tiene una hoja Inicio que no es la de la presentación SST; se conservó sin cambios.",
    };
  }

  const registro = new RegistroEstilos(zip);

  const partes = {
    hojaXml: construirHojaInicioXml(registro),
    dibujoXml: construirDibujoXml(IMAGENES_INICIO),
    graficoXml: construirGraficoXml(NOMBRE_HOJA_INICIO),
  };

  const creada = estado === "ausente";

  if (creada) {
    registrarHojaInicio(zip);
  } else {
    limpiarPartesAnteriores(zip, rutaActual);
  }

  const rutaHoja = creada ? RUTAS.hojaInicio : rutaActual;

  escribirPartesInicio(zip, partes, rutaHoja);

  deseleccionarOtrasHojas(zip, rutaHoja);

  registro.guardar();

  return { creada, omitida: false };
}

module.exports = {
  NOMBRE_HOJA_INICIO,
  actualizarInicio,
};
