const fs = require("fs");

const path = require("path");

const {
  COLORES,
  FUENTES,
  FORMATOS,
  COLORES_PESTANA,
} = require("../../../../shared/utils/paletaExcel.util");

const { obtenerOCrearHoja } = require("../../../../shared/services/excel.service");

const {
  LienzoExcel,
  obtenerLetraColumna,
  obtenerNumeroColumna,
} = require("./inicio.lienzo");

const NOMBRE_HOJA_INICIO = "Inicio";

const HOJA_INSPECCIONES = "01 - Inspecciones";

const HOJA_SEGUIMIENTO = "02 - Seguimiento EPP";

const HOJA_PLANES = "03 - Planes de Acción";

const HOJA_RESUMEN = "_RESUMEN";

const HOJA_GENERAL = "General";

const FILAS_PLANES_PENDIENTES = 10;

const FILAS_ULTIMAS_INSPECCIONES = 10;

const FILAS_SEDES = 8;

/**
 * La hoja se dibuja en la misma cuadrícula que el tablero SST: 25 columnas del
 * mismo ancho (B a Z), con un bloque izquierdo de 12 columnas, una columna
 * central y un bloque derecho de 12. Cada tarjeta ocupa 5 columnas.
 */

const ULTIMA_COLUMNA = "Z";

/**
 * Columnas ocultas que calculan, fila por fila, la clave de orden de los
 * planes pendientes y de las inspecciones, y la posición de cada fila de las
 * tablas. La fila auxiliar coincide con la fila de origen, por lo que `ROW()`
 * identifica el registro.
 */

const AUXILIARES = {
  clavePlan: "AH",
  claveInspeccion: "AI",
  posicionPlan: "AJ",
  posicionInspeccion: "AK",
};

/**
 * Íconos a color que se dibujan sobre las tarjetas y los bloques del tablero,
 * en el mismo estilo de los íconos del tablero SST. Son imágenes propias
 * guardadas en `excel/recursos`.
 */

const DIRECTORIO_RECURSOS = path.join(__dirname, "..", "recursos");

const ICONOS = {
  inspecciones: "portapapeles",
  trabajadores: "trabajador",
  epp: "chaleco",
  pendientes: "reloj",
  cumplimiento: "check",
  total: "portapapeles",
  cumplidos: "check",
  vencidos: "alerta",
};

/**
 * Posición de los íconos. En las tarjetas ocupan la primera columna, como en
 * el tablero SST; en los bloques de estado ocupan la columna central de las
 * tres que mide el bloque, de modo que quedan centrados bajo la franja de
 * color. Las medidas son píxeles de una columna de 6,2 caracteres (48 px) y de
 * una fila de 15 puntos (20 px).
 */

const PIXELES_COLUMNA = 48;

const POSICION_ICONO_TARJETA = { tamano: 40, margenX: 4, margenY: 4, altoFila: 48 };

const POSICION_ICONO_BLOQUE = { tamano: 48, margenX: 0, margenY: 6, altoFila: 20 };

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
  tarjeta: { relleno: COLORES.blanco },
  etiquetaTarjeta: {
    fuente: fuente(9, { negrita: true, color: COLORES.textoSecundario }),
    alineacion: { horizontal: "center" },
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
    alineacion: { horizontal: "right" },
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
    alineacion: { horizontal: "center", vertical: "center", reducir: true },
    borde: { inferior: BORDE },
  },
  filaTablaIzquierda: { alineacion: { horizontal: "left", vertical: "center" } },
  etiquetaBloque: {
    fuente: fuente(9, { negrita: true }),
    alineacion: { horizontal: "center" },
  },
  seccion: { fuente: fuente(10, { negrita: true }) },
  porcentaje: {
    fuente: fuente(9, { negrita: true }),
    formato: FORMATOS.porcentaje,
    alineacion: { horizontal: "center" },
  },
  nota: { fuente: fuente(9, { color: COLORES.textoSecundario }) },
  auxiliar: { fuente: fuente(8, { color: COLORES.textoSecundario }) },
};

/**
 * Construye las referencias de rango que usan las fórmulas del tablero.
 *
 * @param {number} totalInspecciones Cantidad de inspecciones del libro.
 * @param {number} totalPlanes Cantidad de planes de acción del libro.
 * @returns {{
 *   resumen: Function,
 *   planes: Function,
 *   ultimaFilaResumen: number,
 *   ultimaFilaPlanes: number
 * }} Funciones que devuelven el rango absoluto de una columna.
 */

function crearReferencias(totalInspecciones, totalPlanes) {
  const ultimaFilaResumen = Math.max(totalInspecciones + 1, 2);

  const ultimaFilaPlanes = Math.max(totalPlanes + 1, 2);

  return {
    ultimaFilaResumen,
    ultimaFilaPlanes,
    resumen: (columna) => `${HOJA_RESUMEN}!$${columna}$2:$${columna}$${ultimaFilaResumen}`,
    planes: (columna) => `'${HOJA_PLANES}'!$${columna}$2:$${columna}$${ultimaFilaPlanes}`,
  };
}

/**
 * Dibuja un panel blanco con línea de acento superior y título.
 *
 * @param {LienzoExcel} lienzo Hoja en construcción.
 * @param {string} rango Rango del panel.
 * @param {string} referenciaTitulo Celda del título.
 * @param {string} titulo Texto del título.
 * @returns {void}
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

/**
 * Dibuja la banda superior con el título y los datos de corte.
 *
 * @param {LienzoExcel} lienzo Hoja en construcción.
 * @param {Object} refs Referencias de rango del tablero.
 * @returns {void}
 */

function dibujarEncabezado(lienzo, refs) {
  lienzo.alto(2, 34).alto(3, 20);

  lienzo.estilo(`B2:${ULTIMA_COLUMNA}3`, ESTILOS.banda);

  lienzo.texto("B2", "TABLERO DE INSPECCIONES EPP", ESTILOS.titulo);

  lienzo.texto(`${ULTIMA_COLUMNA}2`, "SISTEMA DE GESTIÓN SST", ESTILOS.sistema);

  lienzo.texto(
    "B3",
    "Elementos de protección personal · inspecciones, trabajadores evaluados y planes de acción",
    ESTILOS.subtitulo,
  );

  lienzo.texto("B5", "Fecha de corte", ESTILOS.etiquetaMeta);

  lienzo.combinar("E5:F5").formula("E5", "TODAY()", { ...ESTILOS.valorMeta, formato: FORMATOS.fecha });

  lienzo.texto("G5", "Última inspección", ESTILOS.etiquetaMeta);

  lienzo.combinar("J5:K5").formula(
    "J5",
    `IF(MAX($${AUXILIARES.claveInspeccion}$2:$${AUXILIARES.claveInspeccion}$${refs.ultimaFilaResumen})=0,"—",` +
      `INT(MAX($${AUXILIARES.claveInspeccion}$2:$${AUXILIARES.claveInspeccion}$${refs.ultimaFilaResumen})/10000))`,
    { ...ESTILOS.valorMeta, formato: FORMATOS.fecha },
  );

  lienzo.texto("O5", "Inspecciones registradas", ESTILOS.etiquetaMeta);

  lienzo.combinar("S5:T5").formula("S5", `COUNTA(${refs.resumen("A")})`, ESTILOS.valorMeta);
}

/**
 * Botones de navegación hacia las hojas del libro.
 *
 * @param {LienzoExcel} lienzo Hoja en construcción.
 * @returns {void}
 */

function dibujarNavegacion(lienzo) {
  lienzo.alto(6, 22);

  const botones = [
    { rango: "B6:E6", texto: "Inspecciones", hoja: HOJA_INSPECCIONES },
    { rango: "F6:I6", texto: "Seguimiento EPP", hoja: HOJA_SEGUIMIENTO },
    { rango: "J6:M6", texto: "Planes de acción", hoja: HOJA_PLANES },
    { rango: "O6:R6", texto: "Buscar por ID", hoja: HOJA_GENERAL },
  ];

  for (const { rango, texto, hoja } of botones) {
    const referencia = rango.split(":")[0];

    lienzo.estilo(rango, ESTILOS.boton).combinar(rango);

    lienzo.formula(referencia, `HYPERLINK("#'${hoja}'!A1","${texto}")`, {}, texto);
  }
}

/**
 * Dibuja una tarjeta de indicador en las filas 8 a 12.
 *
 * La primera columna de la tarjeta lleva el ícono; la cifra ocupa el resto del
 * ancho de la fila 9 y los detalles se extienden por toda la tarjeta.
 *
 * @param {LienzoExcel} lienzo Hoja en construcción.
 * @param {{primera: string, ultima: string}} columnas Columnas inicial y final.
 * @param {Object} contenido Textos y fórmulas de la tarjeta.
 * @returns {void}
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

  lienzo.imagen(contenido.icono, { celda: `${primera}9`, ...POSICION_ICONO_TARJETA });

  lienzo
    .combinar(`${segunda}9:${ultima}9`)
    .formula(`${segunda}9`, contenido.cifra, { ...ESTILOS.cifra, ...(contenido.formatoCifra ? { formato: contenido.formatoCifra } : {}) });

  lienzo.combinar(`${primera}10:${ultima}10`).formula(`${primera}10`, contenido.detalle1, ESTILOS.detalle);

  lienzo.combinar(`${primera}11:${ultima}11`).formula(`${primera}11`, contenido.detalle2, ESTILOS.detalle);

  lienzo.combinar(`${primera}12:${ultima}12`).formula(`${primera}12`, contenido.pie, ESTILOS.conformidad);
}

/**
 * Dibuja las cinco tarjetas de indicadores. Ocupan todo el ancho del tablero
 * de modo que quedan dos tarjetas a cada lado de la columna central.
 *
 * Los planes se leen de la hoja 03 para que reflejen los cierres que se
 * registran a mano en Excel.
 *
 * @param {LienzoExcel} lienzo Hoja en construcción.
 * @param {Object} refs Referencias de rango del tablero.
 * @returns {void}
 */

function dibujarIndicadores(lienzo, refs) {
  lienzo.alto(9, 36);

  const { resumen, planes } = refs;

  const totalPlanes = `COUNTA(${planes("A")})`;

  const cumplidos = `COUNTIF(${planes("O")},"CUMPLIDO")`;

  const sinNovedad = (total, conNovedad) =>
    `IFERROR(1-SUM(${resumen(conNovedad)})/SUM(${resumen(total)}),0)`;

  const tarjetas = [
    {
      columnas: { primera: "B", ultima: "F" },
      etiqueta: "INSPECCIONES",
      icono: ICONOS.inspecciones,
      cifra: `COUNTA(${resumen("A")})`,
      detalle1: `"Sedes: "&SUMPRODUCT((${resumen("C")}<>"")/COUNTIF(${resumen("C")},${resumen("C")}&""))`,
      detalle2: `"Áreas: "&SUMPRODUCT((${resumen("D")}<>"")/COUNTIF(${resumen("D")},${resumen("D")}&""))`,
      pie: `"Con planes pendientes: "&COUNTIF(${resumen("L")},">0")`,
    },
    {
      columnas: { primera: "G", ultima: "K" },
      etiqueta: "TRABAJADORES EVALUADOS",
      icono: ICONOS.trabajadores,
      cifra: `SUM(${resumen("G")})`,
      detalle1: `"Con novedad: "&SUM(${resumen("H")})`,
      detalle2: `"Sin novedad: "&(SUM(${resumen("G")})-SUM(${resumen("H")}))`,
      pie: `"Sin novedad "&TEXT(${sinNovedad("G", "H")},"0%")`,
    },
    {
      columnas: { primera: "L", ultima: "P" },
      etiqueta: "EPP EVALUADOS",
      icono: ICONOS.epp,
      cifra: `SUM(${resumen("I")})`,
      detalle1: `"Con novedad: "&SUM(${resumen("J")})`,
      detalle2: `"Sin novedad: "&(SUM(${resumen("I")})-SUM(${resumen("J")}))`,
      pie: `"Sin novedad "&TEXT(${sinNovedad("I", "J")},"0%")`,
    },
    {
      columnas: { primera: "Q", ultima: "U" },
      etiqueta: "PLANES PENDIENTES",
      icono: ICONOS.pendientes,
      cifra: `${totalPlanes}-${cumplidos}`,
      detalle1: `"Vencidos: "&COUNTIF(${planes("O")},"VENCIDO")`,
      detalle2: `"Próximos a vencer: "&COUNTIF(${planes("O")},"PRÓXIMO A VENCER")`,
      pie: `"Total planes: "&${totalPlanes}`,
    },
    {
      columnas: { primera: "V", ultima: "Z" },
      etiqueta: "CUMPLIMIENTO DE PLANES",
      icono: ICONOS.cumplimiento,
      cifra: `IFERROR(${cumplidos}/${totalPlanes},0)`,
      formatoCifra: FORMATOS.porcentaje,
      detalle1: `"Cumplidos: "&${cumplidos}`,
      detalle2: `"Pendientes: "&(${totalPlanes}-${cumplidos})`,
      pie: `"Cumplimiento "&TEXT(IFERROR(${cumplidos}/${totalPlanes},0),"0%")`,
    },
  ];

  for (const { columnas, ...contenido } of tarjetas) {
    dibujarTarjeta(lienzo, columnas, contenido);
  }
}

/**
 * Panel de estado de los planes de acción. Reproduce los bloques de color del
 * panel de tipos de agente del tablero SST.
 *
 * @param {LienzoExcel} lienzo Hoja en construcción.
 * @param {Object} refs Referencias de rango del tablero.
 * @returns {void}
 */

function dibujarEstadoPlanes(lienzo, refs) {
  dibujarPanel(lienzo, "B14:M27", "B14", "Estado de los planes de acción");

  const { planes } = refs;

  const total = `COUNTA(${planes("A")})`;

  const cumplidos = `COUNTIF(${planes("O")},"CUMPLIDO")`;

  const bloques = [
    { columnas: ["B", "D"], color: COLORES.gris, nombre: "Total", icono: ICONOS.total, cifra: total },
    {
      columnas: ["E", "G"],
      color: COLORES.ambar,
      nombre: "Pendientes",
      icono: ICONOS.pendientes,
      cifra: `${total}-${cumplidos}`,
    },
    {
      columnas: ["H", "J"],
      color: COLORES.verdeAgua,
      nombre: "Cumplidos",
      icono: ICONOS.cumplidos,
      cifra: cumplidos,
    },
    {
      columnas: ["K", "M"],
      color: COLORES.rojo,
      nombre: "Vencidos",
      icono: ICONOS.vencidos,
      cifra: `COUNTIF(${planes("O")},"VENCIDO")`,
    },
  ];

  for (const { columnas, color, nombre, icono, cifra } of bloques) {
    const [desde, hasta] = columnas;

    lienzo.estilo(`${desde}16:${hasta}16`, { relleno: color });

    lienzo.combinar(`${desde}17:${hasta}19`).imagen(icono, {
      celda: `${obtenerLetraColumna(obtenerNumeroColumna(desde) + 1)}17`,
      ...POSICION_ICONO_BLOQUE,
    });

    lienzo.combinar(`${desde}20:${hasta}20`).texto(`${desde}20`, nombre, ESTILOS.etiquetaBloque);

    lienzo.combinar(`${desde}21:${hasta}22`).formula(`${desde}21`, cifra, ESTILOS.cifraMediana);
  }

  lienzo.combinar("B24:M24").texto("B24", "Avance de cumplimiento", ESTILOS.seccion);

  lienzo.combinar("B25:M25").formula("B25", `IFERROR(${cumplidos}/${total},0)`, ESTILOS.porcentaje);

  lienzo.texto("B27", "Se actualiza al registrar el cierre en la hoja 03 · Planes de Acción.", ESTILOS.detalle);
}

/**
 * Tabla de inspecciones, trabajadores y novedades por sede.
 *
 * @param {LienzoExcel} lienzo Hoja en construcción.
 * @param {Object} refs Referencias de rango del tablero.
 * @param {string[]} sedes Sedes que se listan, ya ordenadas.
 * @returns {void}
 */

function dibujarSedes(lienzo, refs, sedes) {
  dibujarPanel(lienzo, "O14:Z27", "O14", "Inspecciones por sede");

  const { resumen } = refs;

  const columnas = [
    { rango: "O:R", titulo: "Sede", izquierda: true },
    { rango: "S:T", titulo: "Insp.", formula: (fila) => `COUNTIF(${resumen("C")},$O${fila})` },
    { rango: "U:V", titulo: "Trab.", formula: (fila) => `SUMIF(${resumen("C")},$O${fila},${resumen("G")})` },
    { rango: "W:X", titulo: "EPP", formula: (fila) => `SUMIF(${resumen("C")},$O${fila},${resumen("I")})` },
    { rango: "Y:Z", titulo: "Nov.", formula: (fila) => `SUMIF(${resumen("C")},$O${fila},${resumen("J")})` },
  ];

  for (const { rango, titulo } of columnas) {
    const [desde, hasta] = rango.split(":");

    lienzo.combinar(`${desde}16:${hasta}16`);

    lienzo.estilo(`${desde}16:${hasta}16`, ESTILOS.encabezadoTabla).texto(`${desde}16`, titulo);
  }

  for (let posicion = 0; posicion < FILAS_SEDES; posicion += 1) {
    const fila = 17 + posicion;

    for (const { rango, izquierda, formula } of columnas) {
      const [desde, hasta] = rango.split(":");

      lienzo.combinar(`${desde}${fila}:${hasta}${fila}`);

      lienzo.estilo(`${desde}${fila}:${hasta}${fila}`, {
        ...ESTILOS.filaTabla,
        ...(izquierda ? ESTILOS.filaTablaIzquierda : {}),
      });

      if (formula) {
        lienzo.formula(`${desde}${fila}`, `IF($O${fila}="","",${formula(fila)})`);
      } else if (sedes[posicion] !== undefined) {
        lienzo.texto(`${desde}${fila}`, sedes[posicion]);
      }
    }
  }

  lienzo.texto("O26", `Se listan hasta ${FILAS_SEDES} sedes, de más a menos inspecciones.`, ESTILOS.detalle);
}

/**
 * Dibuja las columnas auxiliares ocultas que ordenan los planes pendientes y
 * las inspecciones por fecha.
 *
 * @param {LienzoExcel} lienzo Hoja en construcción.
 * @param {Object} refs Referencias de rango del tablero.
 * @returns {void}
 */

function escribirCalculosAuxiliares(lienzo, refs) {
  const { clavePlan, claveInspeccion, posicionPlan, posicionInspeccion } = AUXILIARES;

  lienzo.texto(`${clavePlan}1`, "Plan clave", ESTILOS.auxiliar);

  lienzo.texto(`${claveInspeccion}1`, "Inspección clave", ESTILOS.auxiliar);

  lienzo.texto(`${posicionPlan}1`, "Plan posición", ESTILOS.auxiliar);

  lienzo.texto(`${posicionInspeccion}1`, "Inspección posición", ESTILOS.auxiliar);

  for (let fila = 2; fila <= refs.ultimaFilaPlanes; fila += 1) {
    const situacion = `'${HOJA_PLANES}'!$O${fila}`;

    lienzo.formula(
      `${clavePlan}${fila}`,
      `IF(OR('${HOJA_PLANES}'!$A${fila}="",${situacion}="CUMPLIDO"),"",` +
        `INT(N('${HOJA_PLANES}'!$M${fila}))*10000+ROW())`,
    );
  }

  for (let fila = 2; fila <= refs.ultimaFilaResumen; fila += 1) {
    const fecha = `${HOJA_RESUMEN}!$B${fila}`;

    lienzo.formula(
      `${claveInspeccion}${fila}`,
      `IF(${HOJA_RESUMEN}!$A${fila}="","",IFERROR(DATEVALUE(${fecha}),N(${fecha}))*10000+ROW())`,
    );
  }

  for (let posicion = 1; posicion <= FILAS_PLANES_PENDIENTES; posicion += 1) {
    lienzo.formula(
      `${posicionPlan}${30 + posicion}`,
      `IFERROR(MOD(SMALL($${clavePlan}$2:$${clavePlan}$${refs.ultimaFilaPlanes},${posicion}),10000),0)`,
    );
  }

  for (let posicion = 1; posicion <= FILAS_ULTIMAS_INSPECCIONES; posicion += 1) {
    lienzo.formula(
      `${posicionInspeccion}${44 + posicion}`,
      `IFERROR(MOD(LARGE($${claveInspeccion}$2:$${claveInspeccion}$${refs.ultimaFilaResumen},${posicion}),10000),0)`,
    );
  }
}

/**
 * Dibuja una tabla de filas cuyo contenido se busca por posición en una hoja
 * de origen.
 *
 * @param {LienzoExcel} lienzo Hoja en construcción.
 * @param {Object} opciones Datos de la tabla.
 * @param {number} opciones.filaEncabezado Fila del encabezado.
 * @param {number} opciones.filas Cantidad de filas de datos.
 * @param {string} opciones.posicion Columna auxiliar con la posición.
 * @param {Object[]} opciones.columnas Rango, título, hoja y columna de origen.
 * @returns {void}
 */

function dibujarTablaPorPosicion(lienzo, { filaEncabezado, filas, posicion, columnas }) {
  for (const { rango, titulo } of columnas) {
    const [desde, hasta = desde] = rango.split(":");

    if (desde !== hasta) lienzo.combinar(`${desde}${filaEncabezado}:${hasta}${filaEncabezado}`);

    lienzo
      .estilo(`${desde}${filaEncabezado}:${hasta}${filaEncabezado}`, ESTILOS.encabezadoTabla)
      .texto(`${desde}${filaEncabezado}`, titulo);
  }

  for (let indice = 0; indice < filas; indice += 1) {
    const fila = filaEncabezado + 1 + indice;

    const celdaPosicion = `$${posicion}${fila}`;

    for (const { rango, hoja, origen, izquierda, fecha, formato } of columnas) {
      const [desde, hasta = desde] = rango.split(":");

      if (desde !== hasta) lienzo.combinar(`${desde}${fila}:${hasta}${fila}`);

      lienzo.estilo(`${desde}${fila}:${hasta}${fila}`, {
        ...ESTILOS.filaTabla,
        ...(izquierda ? ESTILOS.filaTablaIzquierda : {}),
      });

      const valor = `INDEX('${hoja}'!$${origen}:$${origen},${celdaPosicion})`;

      const contenido = fecha
        ? `IFERROR(DATEVALUE(${valor}),${valor})`
        : valor;

      lienzo.formula(
        `${desde}${fila}`,
        `IF(${celdaPosicion}=0,"",IF(${valor}="","",${contenido}))`,
        fecha ? { formato: formato || FORMATOS.fecha } : {},
      );
    }
  }
}

/**
 * Planes de acción pendientes, ordenados por fecha de compromiso.
 *
 * @param {LienzoExcel} lienzo Hoja en construcción.
 * @returns {void}
 */

function dibujarPlanesPendientes(lienzo) {
  dibujarPanel(lienzo, "B29:Z41", "B29", "Planes de acción pendientes");

  dibujarTablaPorPosicion(lienzo, {
    filaEncabezado: 30,
    filas: FILAS_PLANES_PENDIENTES,
    posicion: AUXILIARES.posicionPlan,
    columnas: [
      { rango: "B:F", titulo: "Inspección", hoja: HOJA_PLANES, origen: "A" },
      { rango: "G:L", titulo: "Trabajador", hoja: HOJA_PLANES, origen: "F", izquierda: true },
      { rango: "M:Q", titulo: "Elemento EPP", hoja: HOJA_PLANES, origen: "H", izquierda: true },
      { rango: "R:T", titulo: "Compromiso", hoja: HOJA_PLANES, origen: "M", fecha: true },
      { rango: "U:V", titulo: "Días", hoja: HOJA_PLANES, origen: "N" },
      { rango: "W:Z", titulo: "Situación", hoja: HOJA_PLANES, origen: "O" },
    ],
  });

  lienzo.texto("B41", "Ordenados por fecha de compromiso; incluye vencidos y próximos a vencer.", ESTILOS.detalle);
}

/**
 * Últimas inspecciones registradas, de la más reciente a la más antigua.
 *
 * @param {LienzoExcel} lienzo Hoja en construcción.
 * @returns {void}
 */

function dibujarUltimasInspecciones(lienzo) {
  dibujarPanel(lienzo, "B43:M54", "B43", "Últimas inspecciones registradas");

  dibujarTablaPorPosicion(lienzo, {
    filaEncabezado: 44,
    filas: FILAS_ULTIMAS_INSPECCIONES,
    posicion: AUXILIARES.posicionInspeccion,
    columnas: [
      { rango: "B:D", titulo: "Fecha", hoja: HOJA_RESUMEN, origen: "B", fecha: true },
      { rango: "E:I", titulo: "Id inspección", hoja: HOJA_RESUMEN, origen: "A" },
      { rango: "J:L", titulo: "Sede", hoja: HOJA_RESUMEN, origen: "C", izquierda: true },
      { rango: "M", titulo: "Nov.", hoja: HOJA_RESUMEN, origen: "J" },
    ],
  });
}

/**
 * Cumplimiento global y leyenda de calificaciones.
 *
 * @param {LienzoExcel} lienzo Hoja en construcción.
 * @param {Object} refs Referencias de rango del tablero.
 * @returns {void}
 */

function dibujarCumplimiento(lienzo, refs) {
  dibujarPanel(lienzo, "O43:Z54", "O43", "Cumplimiento y leyenda");

  const { resumen, planes } = refs;

  const totalPlanes = `COUNTA(${planes("A")})`;

  const cumplidos = `COUNTIF(${planes("O")},"CUMPLIDO")`;

  const filas = [
    {
      nombre: "Trabajadores sin novedad",
      total: `SUM(${resumen("G")})`,
      logrado: `(SUM(${resumen("G")})-SUM(${resumen("H")}))`,
    },
    {
      nombre: "EPP sin novedad",
      total: `SUM(${resumen("I")})`,
      logrado: `(SUM(${resumen("I")})-SUM(${resumen("J")}))`,
    },
    { nombre: "Planes cumplidos", total: totalPlanes, logrado: cumplidos },
  ];

  filas.forEach(({ nombre, total, logrado }, indice) => {
    const fila = 45 + indice;

    lienzo.combinar(`O${fila}:R${fila}`).texto(`O${fila}`, nombre, ESTILOS.seccion);

    lienzo.combinar(`S${fila}:X${fila}`).formula(`S${fila}`, `IFERROR(${logrado}/${total},0)`, ESTILOS.porcentaje);

    lienzo.combinar(`Y${fila}:Z${fila}`).formula(`Y${fila}`, `${logrado}&" de "&${total}`, ESTILOS.detalle);
  });

  lienzo.combinar("O49:Z49").texto("O49", "Leyenda de condición del EPP", ESTILOS.seccion);

  const leyenda = [
    { codigo: "B", texto: "Bueno", fondo: COLORES.verdeSuave, color: COLORES.verdeOscuro },
    { codigo: "R", texto: "Regular", fondo: COLORES.ambarSuave, color: COLORES.ambarTexto },
    { codigo: "M", texto: "Malo", fondo: COLORES.rojoSuave, color: COLORES.rojoTexto },
    { codigo: "NA", texto: "No aplica", fondo: COLORES.grisSuave, color: COLORES.textoSecundario },
  ];

  leyenda.forEach(({ codigo, texto, fondo, color }, indice) => {
    const fila = 50 + indice;

    lienzo.combinar(`O${fila}:P${fila}`);

    lienzo.estilo(`O${fila}:P${fila}`, {
      relleno: fondo,
      fuente: fuente(9, { negrita: true, color }),
      alineacion: { horizontal: "center", vertical: "center" },
    });

    lienzo.texto(`O${fila}`, codigo);

    lienzo.combinar(`Q${fila}:Z${fila}`).texto(`Q${fila}`, texto, ESTILOS.detalle);
  });
}

/**
 * Agrega las barras de avance de los porcentajes del tablero.
 *
 * @param {ExcelJS.Worksheet} hoja Hoja Inicio.
 * @returns {void}
 */

function agregarBarrasDeAvance(hoja) {
  for (const rango of ["B25:M25", "S45:X45", "S46:X46", "S47:X47"]) {
    hoja.addConditionalFormatting({
      ref: rango,
      rules: [
        {
          type: "dataBar",
          gradient: false,
          cfvo: [
            { type: "num", value: 0 },
            { type: "num", value: 1 },
          ],
          color: { argb: `FF${COLORES.verdeAgua}` },
        },
      ],
    });
  }
}

/**
 * Dibuja en la hoja los íconos declarados en el lienzo, como imágenes ancladas
 * a su celda. Cada archivo se agrega una sola vez al libro.
 *
 * @param {ExcelJS.Workbook} workbook Libro que guarda las imágenes.
 * @param {ExcelJS.Worksheet} hoja Hoja Inicio.
 * @param {Object[]} imagenes Íconos declarados con `LienzoExcel.imagen`.
 * @returns {void}
 */

function agregarIconos(workbook, hoja, imagenes) {
  const identificadores = new Map();

  for (const { nombre, celda, tamano, margenX, margenY, altoFila } of imagenes) {
    if (!identificadores.has(nombre)) {
      identificadores.set(
        nombre,
        workbook.addImage({
          buffer: fs.readFileSync(path.join(DIRECTORIO_RECURSOS, `icono-epp-${nombre}.png`)),
          extension: "png",
        }),
      );
    }

    const [, letras, fila] = celda.match(/^([A-Z]+)(\d+)$/);

    hoja.addImage(identificadores.get(nombre), {
      tl: {
        col: obtenerNumeroColumna(letras) - 1 + margenX / PIXELES_COLUMNA,
        row: Number(fila) - 1 + margenY / altoFila,
      },
      ext: { width: tamano, height: tamano },
    });
  }
}

/**
 * Ordena las sedes de más a menos inspecciones y deja las que caben en la tabla.
 *
 * @param {Array<{sede_operacion: string}>} inspecciones Inspecciones del libro.
 * @returns {string[]} Nombres de sede, sin repetir.
 */

function obtenerSedes(inspecciones) {
  const conteo = new Map();

  for (const { sede_operacion: sede } of inspecciones) {
    const nombre = String(sede || "").trim();

    if (nombre) conteo.set(nombre, (conteo.get(nombre) || 0) + 1);
  }

  return [...conteo.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([nombre]) => nombre)
    .slice(0, FILAS_SEDES);
}

/**
 * Construye la hoja Inicio del seguimiento EPP como primera pestaña.
 *
 * Usa la misma cuadrícula, paleta y componentes que el tablero SST: banda
 * superior, botones de navegación, cinco tarjetas de indicadores, paneles y
 * tablas. Los totales y listas se calculan con fórmulas sobre la hoja oculta
 * `_RESUMEN` y la hoja `03 - Planes de Acción`, de modo que reflejan los
 * cierres que se registran a mano. Esta hoja debe construirse después de las
 * demás.
 *
 * @param {ExcelJS.Workbook} workbook Libro que contiene las hojas del seguimiento.
 * @param {Object} datos Datos con los que se construyen las demás hojas.
 * @param {Object[]} datos.inspecciones Inspecciones enviadas.
 * @param {Object[]} datos.planes Planes de acción.
 * @returns {ExcelJS.Worksheet} Hoja Inicio construida.
 */

function construirHojaInicioEpp(workbook, { inspecciones, planes }) {
  const hoja = obtenerOCrearHoja(workbook, NOMBRE_HOJA_INICIO, {
    views: [{ showGridLines: false }],
    properties: { tabColor: { argb: `FF${COLORES_PESTANA.inicio}` } },
  });

  const refs = crearReferencias(inspecciones.length, planes.length);

  const lienzo = new LienzoExcel(hoja);

  lienzo.ancho("A", 2).ancho(`B:${ULTIMA_COLUMNA}`, 6.2).ancho("AH:AK", 12, { oculta: true });

  dibujarEncabezado(lienzo, refs);

  dibujarNavegacion(lienzo);

  dibujarIndicadores(lienzo, refs);

  dibujarEstadoPlanes(lienzo, refs);

  dibujarSedes(lienzo, refs, obtenerSedes(inspecciones));

  dibujarPlanesPendientes(lienzo);

  dibujarUltimasInspecciones(lienzo);

  dibujarCumplimiento(lienzo, refs);

  lienzo.texto(
    "B56",
    "Los totales y listas se calculan con fórmulas sobre las hojas del libro y se regeneran en cada actualización.",
    ESTILOS.nota,
  );

  escribirCalculosAuxiliares(lienzo, refs);

  lienzo.aplicar();

  agregarIconos(workbook, hoja, lienzo.imagenes);

  agregarBarrasDeAvance(hoja);

  hoja.pageSetup = {
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 1,
  };

  // Inicio es la primera pestaña y la que se muestra al abrir el libro.
  hoja.orderNo = 0;

  workbook.views = [{ activeTab: 0 }];

  return hoja;
}

module.exports = {
  NOMBRE_HOJA_INICIO,
  construirHojaInicioEpp,
};
