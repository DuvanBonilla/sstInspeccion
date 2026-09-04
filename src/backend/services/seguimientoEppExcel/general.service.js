const { obtenerOCrearHoja } = require("../excel.service");

const COLORES = {
  azulPrincipal: "FF102A5C",
  azulSeccion: "FF1F4E79",
  azulClaro: "FFEAF1FB",

  blanco: "FFFFFFFF",
  grisClaro: "FFF2F4F7",
  grisTexto: "FF667085",

  verdeFondo: "FFEAF7EE",
  verdeTexto: "FF16794B",

  amarilloFondo: "FFFFF4E5",
  amarilloTexto: "FFB54708",

  rojoFondo: "FFFCE8E6",
  rojoTexto: "FFB42318",

  borde: "FFD9E2F3",
};

function aplicarFondo(celda, color) {
  celda.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: {
      argb: color,
    },
  };
}

function aplicarBorde(celda) {
  celda.border = {
    top: {
      style: "thin",
      color: {
        argb: COLORES.borde,
      },
    },

    left: {
      style: "thin",
      color: {
        argb: COLORES.borde,
      },
    },

    bottom: {
      style: "thin",
      color: {
        argb: COLORES.borde,
      },
    },

    right: {
      style: "thin",
      color: {
        argb: COLORES.borde,
      },
    },
  };
}

function aplicarTexto(
  celda,
  {
    color = COLORES.azulPrincipal,
    tamaño = 10,
    negrita = false,
    horizontal = "center",
  } = {},
) {
  celda.font = {
    name: "Arial",
    size: tamaño,
    bold: negrita,

    color: {
      argb: color,
    },
  };

  celda.alignment = {
    horizontal,
    vertical: "middle",
    wrapText: true,
  };
}

function crearSeccion(hoja, fila, titulo) {
  hoja.mergeCells(`A${fila}:L${fila}`);

  const celda = hoja.getCell(`A${fila}`);

  celda.value = titulo;

  aplicarFondo(celda, COLORES.azulSeccion);

  aplicarTexto(celda, {
    color: COLORES.blanco,
    tamaño: 10,
    negrita: true,
    horizontal: "left",
  });

  hoja.getRow(fila).height = 20;
}

function crearEncabezado(hoja, fila, configuracion) {
  for (const columna of configuracion) {
    const rango = `${columna.desde}${fila}:${columna.hasta}${fila}`;

    if (columna.desde !== columna.hasta) {
      hoja.mergeCells(rango);
    }

    const celda = hoja.getCell(`${columna.desde}${fila}`);

    celda.value = columna.titulo;

    aplicarFondo(celda, COLORES.azulPrincipal);

    aplicarTexto(celda, {
      color: COLORES.blanco,
      tamaño: 9,
      negrita: true,
    });

    aplicarBorde(celda);
  }

  hoja.getRow(fila).height = 25;
}

function crearIndicador(
  hoja,
  {
    columnas,
    titulo,
    formula,
    resultado,
    fondo = COLORES.azulClaro,
    color = COLORES.azulPrincipal,
    formato,
  },
) {
  const [inicio, fin] = columnas;

  hoja.mergeCells(`${inicio}5:${fin}5`);

  hoja.mergeCells(`${inicio}6:${fin}7`);

  const celdaTitulo = hoja.getCell(`${inicio}5`);

  celdaTitulo.value = titulo;

  aplicarFondo(celdaTitulo, COLORES.grisClaro);

  aplicarTexto(celdaTitulo, {
    color: COLORES.grisTexto,
    tamaño: 9,
    negrita: true,
  });

  aplicarBorde(celdaTitulo);

  const celdaValor = hoja.getCell(`${inicio}6`);

  celdaValor.value = formula
    ? {
        formula,
        result: resultado,
      }
    : resultado;

  if (formato) {
    celdaValor.numFmt = formato;
  }

  aplicarFondo(celdaValor, fondo);

  aplicarTexto(celdaValor, {
    color,
    tamaño: 18,
    negrita: true,
  });

  aplicarBorde(celdaValor);
}

function obtenerNumero(valor) {
  const numero = Number(valor);

  return Number.isFinite(numero) ? numero : 0;
}

function obtenerEstadoPlan(plan) {
  return String(plan.estado_plan || "")
    .trim()
    .toUpperCase();
}

function obtenerFechaComparable(valor) {
  if (!valor) {
    return 0;
  }

  const fecha = new Date(valor);

  if (Number.isNaN(fecha.getTime())) {
    return 0;
  }

  return fecha.getTime();
}

function obtenerFechaVisible(valor) {
  if (!valor) {
    return "";
  }

  if (valor instanceof Date) {
    return valor.toISOString().slice(0, 10);
  }

  return String(valor).slice(0, 10);
}

/**
 * Calcula los días restantes hasta la fecha de compromiso de un plan.
 *
 * Compara únicamente las fechas de calendario, sin considerar la hora.
 * Un resultado negativo identifica un plan vencido, mientras que un valor
 * entre cero y tres permite clasificarlo como próximo a vencer.
 *
 * @param {string|Date|null} valor - Fecha de compromiso del plan de acción.
 * @returns {number|null} Días restantes, o `null` cuando la fecha no existe
 * o no puede interpretarse correctamente.
 */
function obtenerDiasRestantes(valor) {
  if (!valor) {
    return null;
  }

  const fecha = new Date(valor);

  if (Number.isNaN(fecha.getTime())) {
    return null;
  }

  const compromiso = new Date(
    fecha.getFullYear(),
    fecha.getMonth(),
    fecha.getDate(),
  );

  const ahora = new Date();

  const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());

  return Math.round((compromiso.getTime() - hoy.getTime()) / 86400000);
}

function aplicarEstiloFilaDatos(hoja, numeroFila) {
  const fila = hoja.getRow(numeroFila);

  fila.height = 21;

  for (let numeroColumna = 1; numeroColumna <= 12; numeroColumna += 1) {
    const celda = fila.getCell(numeroColumna);

    aplicarBorde(celda);

    aplicarTexto(celda, {
      tamaño: 9,
      horizontal: numeroColumna <= 8 ? "left" : "center",
    });

    if (numeroFila % 2 === 0) {
      aplicarFondo(celda, COLORES.grisClaro);
    }
  }
}

/**
 * Construye el tablero general del seguimiento de inspecciones EPP.
 *
 * Consolida la información de inspecciones, trabajadores y planes de acción
 * en la hoja `General`. Genera indicadores globales, una búsqueda por código
 * de inspección, el listado de las últimas inspecciones, porcentajes de
 * novedades, estados de los planes y los planes pendientes prioritarios.
 *
 * Los planes se clasifican como cumplidos, pendientes, vencidos o próximos
 * a vencer según su estado y fecha de compromiso. La hoja también incorpora
 * fórmulas vinculadas con `_RESUMEN` para conservar indicadores actualizables
 * dentro del libro de Excel.
 *
 * @param {ExcelJS.Workbook} workbook
 * Libro donde debe construirse el tablero.
 * @param {Array<Object>} inspecciones
 * Inspecciones EPP utilizadas para calcular los indicadores.
 * @param {Array<Object>} seguimiento
 * Registros individuales de trabajadores evaluados.
 * @param {Array<Object>} planes
 * Planes de acción asociados con las inspecciones.
 * @returns {{
 *   hoja: string,
 *   totalInspecciones: number,
 *   totalTrabajadores: number,
 *   totalEppEvaluados: number,
 *   totalPlanes: number,
 *   planesPendientes: number,
 *   planesCumplidos: number,
 *   planesVencidos: number,
 *   planesProximosVencer: number
 * }} Resumen de la hoja construida y sus indicadores principales.
 */

function construirHojaGeneralEpp(workbook, inspecciones, seguimiento, planes) {
  const hoja = obtenerOCrearHoja(workbook, "General");

  hoja.views = [
    {
      showGridLines: false,
    },
  ];

  const anchos = [17, 15, 17, 15, 17, 15, 17, 15, 15, 15, 17, 17];

  anchos.forEach((ancho, indice) => {
    hoja.getColumn(indice + 1).width = ancho;
  });

  const ultimaFilaResumen = Math.max(inspecciones.length + 1, 2);

  const rangoResumen = `'_RESUMEN'!$A$2:$O$${ultimaFilaResumen}`;

  const inspeccionesOrdenadas = [...inspecciones].sort(
    (primera, segunda) =>
      obtenerFechaComparable(segunda.fecha) -
      obtenerFechaComparable(primera.fecha),
  );

  const ultimaInspeccion = inspeccionesOrdenadas[0];

  const totalEppEvaluados = inspecciones.reduce(
    (total, inspeccion) =>
      total + obtenerNumero(inspeccion.total_epp_evaluados),
    0,
  );

  const totalEppConNovedad = inspecciones.reduce(
    (total, inspeccion) => total + obtenerNumero(inspeccion.epp_con_novedad),
    0,
  );

  const totalTrabajadoresConNovedad = inspecciones.reduce(
    (total, inspeccion) =>
      total + obtenerNumero(inspeccion.trabajadores_con_novedad),
    0,
  );

  const planesCumplidos = planes.filter(
    (plan) => obtenerEstadoPlan(plan) === "CUMPLIDO",
  );

  const planesPendientes = planes.filter(
    (plan) => obtenerEstadoPlan(plan) !== "CUMPLIDO",
  );

  const planesVencidos = planesPendientes.filter((plan) => {
    const dias = obtenerDiasRestantes(plan.fecha_plan_accion);

    return dias !== null && dias < 0;
  });

  const planesProximosVencer = planesPendientes.filter((plan) => {
    const dias = obtenerDiasRestantes(plan.fecha_plan_accion);

    return dias !== null && dias >= 0 && dias <= 3;
  });

  hoja.mergeCells("A2:L3");

  const titulo = hoja.getCell("A2");

  titulo.value = "SEGUIMIENTO GENERAL DE INSPECCIONES EPP";

  aplicarFondo(titulo, COLORES.azulPrincipal);

  aplicarTexto(titulo, {
    color: COLORES.blanco,
    tamaño: 16,
    negrita: true,
  });

  crearIndicador(hoja, {
    columnas: ["A", "B"],

    titulo: "INSPECCIONES REALIZADAS",

    formula: `COUNTA('_RESUMEN'!A2:A${ultimaFilaResumen})`,

    resultado: inspecciones.length,
  });

  crearIndicador(hoja, {
    columnas: ["C", "D"],

    titulo: "TRABAJADORES EVALUADOS",

    formula: `SUM('_RESUMEN'!G2:G${ultimaFilaResumen})`,

    resultado: seguimiento.length,
  });

  crearIndicador(hoja, {
    columnas: ["E", "F"],

    titulo: "EPP EVALUADOS",

    formula: `SUM('_RESUMEN'!I2:I${ultimaFilaResumen})`,

    resultado: totalEppEvaluados,
  });

  crearIndicador(hoja, {
    columnas: ["G", "H"],

    titulo: "EPP CON NOVEDAD",

    formula: `SUM('_RESUMEN'!J2:J${ultimaFilaResumen})`,

    resultado: totalEppConNovedad,

    fondo: COLORES.amarilloFondo,

    color: COLORES.amarilloTexto,
  });

  crearIndicador(hoja, {
    columnas: ["I", "J"],

    titulo: "PLANES PENDIENTES",

    formula: `SUM('_RESUMEN'!L2:L${ultimaFilaResumen})`,

    resultado: planesPendientes.length,

    fondo: COLORES.amarilloFondo,

    color: COLORES.amarilloTexto,
  });

  crearIndicador(hoja, {
    columnas: ["K", "L"],

    titulo: "ÚLTIMA INSPECCIÓN",

    resultado: obtenerFechaVisible(ultimaInspeccion?.fecha),

    fondo: COLORES.verdeFondo,

    color: COLORES.verdeTexto,
  });

  crearSeccion(hoja, 9, "B. BUSCAR INSPECCIÓN POR ID");

  hoja.mergeCells("A10:B10");
  hoja.mergeCells("C10:F10");

  const etiquetaBusqueda = hoja.getCell("A10");

  etiquetaBusqueda.value = "ID a buscar:";

  aplicarTexto(etiquetaBusqueda, {
    negrita: true,
    horizontal: "left",
  });

  aplicarFondo(etiquetaBusqueda, COLORES.azulClaro);

  const entradaBusqueda = hoja.getCell("C10");

  entradaBusqueda.value = "";

  aplicarFondo(entradaBusqueda, COLORES.amarilloFondo);

  aplicarBorde(entradaBusqueda);

  aplicarTexto(entradaBusqueda, {
    horizontal: "left",
  });

  crearEncabezado(hoja, 12, [
    {
      desde: "A",
      hasta: "C",
      titulo: "INSPECCIÓN",
    },
    {
      desde: "D",
      hasta: "F",
      titulo: "RESPONSABLE",
    },
    {
      desde: "G",
      hasta: "H",
      titulo: "SEDE / ÁREA",
    },
    {
      desde: "I",
      hasta: "J",
      titulo: "FECHA",
    },
    {
      desde: "K",
      hasta: "L",
      titulo: "PLANES PENDIENTES",
    },
  ]);

  hoja.mergeCells("A13:C13");
  hoja.mergeCells("D13:F13");
  hoja.mergeCells("G13:H13");
  hoja.mergeCells("I13:J13");
  hoja.mergeCells("K13:L13");

  hoja.getCell("A13").value = {
    formula:
      'IF($C$10="","",' +
      `IFERROR(VLOOKUP($C$10,${rangoResumen},1,FALSE),` +
      '"No encontrado"))',

    result: "",
  };

  hoja.getCell("D13").value = {
    formula:
      'IF($C$10="","",' + `IFERROR(VLOOKUP($C$10,${rangoResumen},6,FALSE),""))`,

    result: "",
  };

  hoja.getCell("G13").value = {
    formula:
      'IF($C$10="","",' +
      `IFERROR(VLOOKUP($C$10,${rangoResumen},3,FALSE)` +
      '&" / "&' +
      `VLOOKUP($C$10,${rangoResumen},4,FALSE),""))`,

    result: "",
  };

  hoja.getCell("I13").value = {
    formula:
      'IF($C$10="","",' + `IFERROR(VLOOKUP($C$10,${rangoResumen},2,FALSE),""))`,

    result: "",
  };

  hoja.getCell("K13").value = {
    formula:
      'IF($C$10="","",' +
      `IFERROR(VLOOKUP($C$10,${rangoResumen},12,FALSE),""))`,

    result: "",
  };

  crearSeccion(hoja, 15, "C. ÚLTIMAS INSPECCIONES REALIZADAS");

  crearEncabezado(hoja, 16, [
    {
      desde: "A",
      hasta: "C",
      titulo: "INSPECCIÓN",
    },
    {
      desde: "D",
      hasta: "F",
      titulo: "RESPONSABLE",
    },
    {
      desde: "G",
      hasta: "H",
      titulo: "SEDE / ÁREA",
    },
    {
      desde: "I",
      hasta: "I",
      titulo: "FECHA",
    },
    {
      desde: "J",
      hasta: "J",
      titulo: "EPP",
    },
    {
      desde: "K",
      hasta: "K",
      titulo: "NOVEDADES",
    },
    {
      desde: "L",
      hasta: "L",
      titulo: "PLANES",
    },
  ]);

  const ultimasInspecciones = inspeccionesOrdenadas.slice(0, 3);

  for (let indice = 0; indice < 3; indice += 1) {
    const numeroFila = 17 + indice;

    const inspeccion = ultimasInspecciones[indice];

    hoja.mergeCells(`A${numeroFila}:C${numeroFila}`);

    hoja.mergeCells(`D${numeroFila}:F${numeroFila}`);

    hoja.mergeCells(`G${numeroFila}:H${numeroFila}`);

    aplicarEstiloFilaDatos(hoja, numeroFila);

    if (!inspeccion) {
      continue;
    }

    const cantidadPlanes = planes.filter(
      (plan) => plan.inspeccion_id === inspeccion.inspeccion_id,
    ).length;

    hoja.getCell(`A${numeroFila}`).value = inspeccion.inspeccion_id || "";

    hoja.getCell(`D${numeroFila}`).value =
      inspeccion.responsable_inspeccion || "";

    hoja.getCell(`G${numeroFila}`).value =
      `${inspeccion.sede_operacion || ""}` +
      ` / ${inspeccion.area_trabajo || ""}`;

    hoja.getCell(`I${numeroFila}`).value = obtenerFechaVisible(
      inspeccion.fecha,
    );

    hoja.getCell(`J${numeroFila}`).value = obtenerNumero(
      inspeccion.total_epp_evaluados,
    );

    hoja.getCell(`K${numeroFila}`).value = obtenerNumero(
      inspeccion.epp_con_novedad,
    );

    hoja.getCell(`L${numeroFila}`).value = cantidadPlanes;
  }

  crearSeccion(hoja, 21, "D. CUMPLIMIENTO GLOBAL EPP");

  crearEncabezado(hoja, 22, [
    {
      desde: "A",
      hasta: "D",
      titulo: "INDICADOR",
    },
    {
      desde: "E",
      hasta: "F",
      titulo: "TOTAL",
    },
    {
      desde: "G",
      hasta: "H",
      titulo: "SIN NOVEDAD",
    },
    {
      desde: "I",
      hasta: "J",
      titulo: "CON NOVEDAD",
    },
    {
      desde: "K",
      hasta: "L",
      titulo: "% CON NOVEDAD",
    },
  ]);

  const indicadores = [
    {
      fila: 23,

      nombre: "Trabajadores evaluados",

      total: seguimiento.length,

      conNovedad: totalTrabajadoresConNovedad,
    },
    {
      fila: 24,

      nombre: "Elementos EPP evaluados",

      total: totalEppEvaluados,

      conNovedad: totalEppConNovedad,
    },
  ];

  for (const indicador of indicadores) {
    const numeroFila = indicador.fila;

    hoja.mergeCells(`A${numeroFila}:D${numeroFila}`);

    hoja.mergeCells(`E${numeroFila}:F${numeroFila}`);

    hoja.mergeCells(`G${numeroFila}:H${numeroFila}`);

    hoja.mergeCells(`I${numeroFila}:J${numeroFila}`);

    hoja.mergeCells(`K${numeroFila}:L${numeroFila}`);

    aplicarEstiloFilaDatos(hoja, numeroFila);

    hoja.getCell(`A${numeroFila}`).value = indicador.nombre;

    hoja.getCell(`E${numeroFila}`).value = indicador.total;

    hoja.getCell(`G${numeroFila}`).value =
      indicador.total - indicador.conNovedad;

    hoja.getCell(`I${numeroFila}`).value = indicador.conNovedad;

    hoja.getCell(`K${numeroFila}`).value = {
      formula: `IFERROR(I${numeroFila}/E${numeroFila},0)`,

      result: indicador.total > 0 ? indicador.conNovedad / indicador.total : 0,
    };

    hoja.getCell(`K${numeroFila}`).numFmt = "0%";

    aplicarFondo(hoja.getCell(`G${numeroFila}`), COLORES.verdeFondo);

    aplicarFondo(hoja.getCell(`I${numeroFila}`), COLORES.amarilloFondo);
  }

  crearSeccion(hoja, 26, "E. ESTADO DE PLANES DE ACCIÓN");

  crearEncabezado(hoja, 27, [
    {
      desde: "A",
      hasta: "B",
      titulo: "TOTAL",
    },
    {
      desde: "C",
      hasta: "D",
      titulo: "PENDIENTES",
    },
    {
      desde: "E",
      hasta: "F",
      titulo: "CUMPLIDOS",
    },
    {
      desde: "G",
      hasta: "H",
      titulo: "VENCIDOS",
    },
    {
      desde: "I",
      hasta: "J",
      titulo: "PRÓXIMOS A VENCER",
    },
    {
      desde: "K",
      hasta: "L",
      titulo: "% CUMPLIMIENTO",
    },
  ]);

  const indicadoresPlanes = [
    {
      inicio: "A",
      fin: "B",

      formula: `SUM('_RESUMEN'!K2:K${ultimaFilaResumen})`,

      resultado: planes.length,

      fondo: COLORES.azulClaro,
    },
    {
      inicio: "C",
      fin: "D",

      formula: `SUM('_RESUMEN'!L2:L${ultimaFilaResumen})`,

      resultado: planesPendientes.length,

      fondo: COLORES.amarilloFondo,
    },
    {
      inicio: "E",
      fin: "F",

      formula: `SUM('_RESUMEN'!M2:M${ultimaFilaResumen})`,

      resultado: planesCumplidos.length,

      fondo: COLORES.verdeFondo,
    },
    {
      inicio: "G",
      fin: "H",

      formula: `SUM('_RESUMEN'!N2:N${ultimaFilaResumen})`,

      resultado: planesVencidos.length,

      fondo: COLORES.rojoFondo,
    },
    {
      inicio: "I",
      fin: "J",

      formula: `SUM('_RESUMEN'!O2:O${ultimaFilaResumen})`,

      resultado: planesProximosVencer.length,

      fondo: COLORES.amarilloFondo,
    },
    {
      inicio: "K",
      fin: "L",

      formula: "IFERROR(E28/A28,0)",

      resultado: planes.length > 0 ? planesCumplidos.length / planes.length : 0,

      fondo: COLORES.verdeFondo,

      porcentaje: true,
    },
  ];

  for (const indicador of indicadoresPlanes) {
    hoja.mergeCells(`${indicador.inicio}28:${indicador.fin}28`);

    const celda = hoja.getCell(`${indicador.inicio}28`);

    celda.value = {
      formula: indicador.formula,

      result: indicador.resultado,
    };

    if (indicador.porcentaje) {
      celda.numFmt = "0%";
    }

    aplicarFondo(celda, indicador.fondo);

    aplicarTexto(celda, {
      tamaño: 13,
      negrita: true,
    });

    aplicarBorde(celda);
  }

  hoja.getRow(28).height = 25;

  crearSeccion(hoja, 30, "F. PLANES PENDIENTES PRIORITARIOS");

  crearEncabezado(hoja, 31, [
    {
      desde: "A",
      hasta: "C",
      titulo: "INSPECCIÓN",
    },
    {
      desde: "D",
      hasta: "F",
      titulo: "TRABAJADOR",
    },
    {
      desde: "G",
      hasta: "I",
      titulo: "ELEMENTO EPP",
    },
    {
      desde: "J",
      hasta: "K",
      titulo: "FECHA COMPROMISO",
    },
    {
      desde: "L",
      hasta: "L",
      titulo: "DÍAS",
    },
  ]);

  const planesPrioritarios = [...planesPendientes]
    .sort(
      (primero, segundo) =>
        obtenerFechaComparable(primero.fecha_plan_accion) -
        obtenerFechaComparable(segundo.fecha_plan_accion),
    )
    .slice(0, 3);

  for (let indice = 0; indice < 3; indice += 1) {
    const numeroFila = 32 + indice;

    hoja.mergeCells(`A${numeroFila}:C${numeroFila}`);

    hoja.mergeCells(`D${numeroFila}:F${numeroFila}`);

    hoja.mergeCells(`G${numeroFila}:I${numeroFila}`);

    hoja.mergeCells(`J${numeroFila}:K${numeroFila}`);

    aplicarEstiloFilaDatos(hoja, numeroFila);

    const plan = planesPrioritarios[indice];

    if (!plan) {
      continue;
    }

    hoja.getCell(`A${numeroFila}`).value = plan.inspeccion_id || "";

    hoja.getCell(`D${numeroFila}`).value = plan.nombre_trabajador || "";

    hoja.getCell(`G${numeroFila}`).value = plan.elemento_epp || "";

    hoja.getCell(`J${numeroFila}`).value = obtenerFechaVisible(
      plan.fecha_plan_accion,
    );

    const dias = obtenerDiasRestantes(plan.fecha_plan_accion);

    const celdaDias = hoja.getCell(`L${numeroFila}`);

    celdaDias.value = dias === null ? "" : dias;

    if (dias !== null && dias < 0) {
      aplicarFondo(celdaDias, COLORES.rojoFondo);

      aplicarTexto(celdaDias, {
        color: COLORES.rojoTexto,

        negrita: true,
      });
    } else if (dias !== null && dias <= 3) {
      aplicarFondo(celdaDias, COLORES.amarilloFondo);

      aplicarTexto(celdaDias, {
        color: COLORES.amarilloTexto,

        negrita: true,
      });
    }
  }

  crearSeccion(hoja, 36, "G. LEYENDA DE ESTADOS");

  const leyendas = [
    {
      inicio: "A",
      fin: "C",

      texto: "B = Bueno",

      fondo: COLORES.verdeFondo,
    },
    {
      inicio: "D",
      fin: "F",

      texto: "R = Regular",

      fondo: COLORES.amarilloFondo,
    },
    {
      inicio: "G",
      fin: "I",

      texto: "M = Malo",

      fondo: COLORES.rojoFondo,
    },
    {
      inicio: "J",
      fin: "L",

      texto: "NA = No aplica",

      fondo: COLORES.grisClaro,
    },
  ];

  for (const leyenda of leyendas) {
    hoja.mergeCells(`${leyenda.inicio}37:${leyenda.fin}37`);

    const celda = hoja.getCell(`${leyenda.inicio}37`);

    celda.value = leyenda.texto;

    aplicarFondo(celda, leyenda.fondo);

    aplicarTexto(celda, {
      tamaño: 9,
      negrita: true,
    });

    aplicarBorde(celda);
  }

  return {
    hoja: "General",

    totalInspecciones: inspecciones.length,

    totalTrabajadores: seguimiento.length,

    totalEppEvaluados,

    totalPlanes: planes.length,

    planesPendientes: planesPendientes.length,

    planesCumplidos: planesCumplidos.length,

    planesVencidos: planesVencidos.length,

    planesProximosVencer: planesProximosVencer.length,
  };
}

module.exports = {
  construirHojaGeneralEpp,
};
