const {
  obtenerXml,
  reemplazarXml,
  escaparXml,
} = require("../../utils/excelXml.util");

const RUTA_HOJA_GENERAL =
  "xl/worksheets/sheet1.xml";

const RUTA_WORKBOOK =
  "xl/workbook.xml";

const FORMULAS_CELDAS = {
  B7:
    "COUNTA(_RESUMEN!A2:A10000)",

  C7:
    "COUNTA(Extintores!A2:A10000)",

  D7:
    "COUNTA(Camillas!A2:A10000)",

  E7:
    "COUNTA(Señalizacion!A2:A10000)",

  F7:
    "COUNTA('Equipo_T.A.D.E'!A2:A10000)",

  G7:
    "COUNTA(Botiquin!A2:A10000)",

  H7:
    'IFERROR(_RESUMEN!B2,"")',

  E13:
    'IFERROR(INDEX(_RESUMEN!B2:B10000,MATCH(C11,_RESUMEN!A2:A10000,0)),"")',

  E17:
    'IFERROR(_RESUMEN!B2,"")',

  E18:
    'IFERROR(_RESUMEN!B3,"")',

  E19:
    'IFERROR(_RESUMEN!B4,"")',

  F33:
    "IF(E33=0,0,D33/E33)",

  F34:
    "IF(E34=0,0,D34/E34)",

  F35:
    "IF(E35=0,0,D35/E35)",

  F36:
    "IF(E36=0,0,D36/E36)",

  F37:
    "IF(E37=0,0,D37/E37)",
};

const RANGOS_DESPLAZADOS = [
  {
    hoja:
      "Extintores",

    filaActual:
      3,
  },

  {
    hoja:
      "Camillas",

    filaActual:
      3,
  },

  {
    hoja:
      "Señalizacion",

    filaActual:
      3,
  },

  {
    hoja:
      "'Equipo_T.A.D.E'",

    filaActual:
      6,
  },

  {
    hoja:
      "Botiquin",

    filaActual:
      30,
  },
];

const RUTA_RELACIONES_WORKBOOK =
  "xl/_rels/workbook.xml.rels";

const RUTA_TIPOS_CONTENIDO =
  "[Content_Types].xml";

const RUTA_CADENA_CALCULO =
  "xl/calcChain.xml";

function escaparExpresionRegular(texto) {
  return String(texto).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );
}

function corregirRangosFormula(formula) {
  let resultado = formula;

  for (const {
    hoja,
    filaActual,
  } of RANGOS_DESPLAZADOS) {
    const expresion = new RegExp(
      `(${escaparExpresionRegular(hoja)}!\\$?[A-Z]{1,3}\\$?)${filaActual}(?=:)`,
      "g",
    );

    resultado = resultado.replace(
      expresion,
      "$12",
    );
  }

  return resultado;
}

/**
 * Corrige los rangos desplazados en las fórmulas existentes de la hoja General.
 *
 * Recorre las etiquetas de fórmula del XML, ajusta las referencias iniciales
 * de las hojas de seguimiento y contabiliza cuántas fórmulas fueron modificadas.
 *
 * @param {string} hojaXml - Contenido XML de la hoja General.
 * @returns {{xml: string, formulasCorregidas: number}}
 * XML actualizado y cantidad de fórmulas cuyos rangos fueron corregidos.
 */

function actualizarFormulasExistentes(hojaXml) {
  let formulasCorregidas = 0;

  const xmlActualizado = hojaXml.replace(
    /<f\b([^>]*)>([\s\S]*?)<\/f>/g,
    (coincidencia, atributos, formula) => {
      const formulaCorregida =
        corregirRangosFormula(formula);

      if (
        formulaCorregida !== formula
      ) {
        formulasCorregidas += 1;
      }

      return (
        `<f${atributos}>` +
        `${formulaCorregida}` +
        `</f>`
      );
    },
  );

  return {
    xml:
      xmlActualizado,

    formulasCorregidas,
  };
}

/**
 * Reemplaza la fórmula de una celda específica dentro del XML de la hoja.
 *
 * Conserva los demás atributos y contenidos de la celda, elimina la fórmula
 * y el valor calculado anteriores e incorpora la nueva expresión escapada.
 *
 * @param {string} hojaXml - Contenido XML de la hoja General.
 * @param {string} referencia - Referencia de la celda que debe modificarse.
 * @param {string} formula - Nueva fórmula que debe asignarse.
 * @returns {string} XML con la fórmula de la celda actualizada.
 * @throws {Error} Si la referencia indicada no existe en la hoja General.
 */

function reemplazarFormulaCelda(
  hojaXml,
  referencia,
  formula,
) {
  const expresionCelda = new RegExp(
    `<c\\b([^>]*\\br="${referencia}"[^>]*)>([\\s\\S]*?)<\\/c>`,
  );

  let encontrada = false;

  const xmlActualizado =
    hojaXml.replace(
      expresionCelda,
      (
        coincidencia,
        atributos,
        contenido,
      ) => {
        encontrada = true;

        const contenidoSinFormula =
          contenido.replace(
            /<f\b[^>]*>[\s\S]*?<\/f>|<f\b[^>]*\/>/,
            "",
          );

        const contenidoSinValorAnterior =
          contenidoSinFormula.replace(
            /<v\b[^>]*>[\s\S]*?<\/v>|<v\b[^>]*\/>/,
            "",
          );

        return (
          `<c${atributos}>` +
          `<f>${escaparXml(formula)}</f>` +
          `${contenidoSinValorAnterior}` +
          `</c>`
        );
      },
    );

  if (!encontrada) {
    throw new Error(
      `No se encontró la celda ${referencia} en la hoja General`,
    );
  }

  return xmlActualizado;
}

/**
 * Actualiza las fórmulas específicas configuradas para la hoja General.
 *
 * Recorre el mapa `FORMULAS_CELDAS` y reemplaza la fórmula de cada referencia
 * mediante la modificación directa del XML.
 *
 * @param {string} hojaXml - Contenido XML de la hoja General.
 * @returns {string} XML con todas las fórmulas puntuales actualizadas.
 * @throws {Error} Si alguna de las celdas configuradas no existe.
 */

function corregirFormulasPuntuales(hojaXml) {
  let xmlActualizado = hojaXml;

  for (const [
    referencia,
    formula,
  ] of Object.entries(
    FORMULAS_CELDAS,
  )) {
    xmlActualizado =
      reemplazarFormulaCelda(
        xmlActualizado,
        referencia,
        formula,
      );
  }

  return xmlActualizado;
}

/**
 * Elimina los valores calculados almacenados para las celdas con fórmula.
 *
 * Conserva las fórmulas y retira sus resultados anteriores para que Excel
 * vuelva a calcularlos cuando se abra el archivo.
 *
 * @param {string} hojaXml - Contenido XML de la hoja General.
 * @returns {string} XML sin valores calculados obsoletos en las celdas con fórmula.
 */

function limpiarValoresCalculados(hojaXml) {
  return hojaXml.replace(
    /<c\b([^>]*)>([\s\S]*?)<\/c>/g,
    (
      coincidencia,
      atributos,
      contenido,
    ) => {
      if (
        !/<f\b/.test(contenido)
      ) {
        return coincidencia;
      }

      const contenidoSinValorAnterior =
        contenido.replace(
          /<v\b[^>]*>[\s\S]*?<\/v>|<v\b[^>]*\/>/,
          "",
        );

      return (
        `<c${atributos}>` +
        `${contenidoSinValorAnterior}` +
        `</c>`
      );
    },
  );
}

/**
 * Configura el libro para recalcular automáticamente todas sus fórmulas.
 *
 * Actualiza o crea el elemento `calcPr` del XML principal y activa el cálculo
 * automático, el recálculo completo al abrir y el recálculo forzado.
 *
 * @param {string} workbookXml - Contenido XML principal del libro.
 * @returns {string} XML del libro con el recálculo automático habilitado.
 */

function activarRecalculoAutomatico(workbookXml) {
  const atributosRecalculo = [
    'calcMode="auto"',
    'fullCalcOnLoad="1"',
    'forceFullCalc="1"',
  ];

  if (
    /<calcPr\b[^>]*\/>/.test(
      workbookXml,
    )
  ) {
    return workbookXml.replace(
      /<calcPr\b([^>]*)\/>/,
      (
        coincidencia,
        atributos,
      ) => {
        let atributosActualizados =
          atributos;

        for (const nombre of [
          "calcMode",
          "fullCalcOnLoad",
          "forceFullCalc",
        ]) {
          const expresion =
            new RegExp(
              `\\s+${nombre}="[^"]*"`,
              "g",
            );

          atributosActualizados =
            atributosActualizados.replace(
              expresion,
              "",
            );
        }

        return (
          `<calcPr` +
          `${atributosActualizados} ` +
          `${atributosRecalculo.join(" ")}` +
          `/>`
        );
      },
    );
  }

  return workbookXml.replace(
    "</workbook>",
    (
      `<calcPr ` +
      `${atributosRecalculo.join(" ")}` +
      `/>` +
      `</workbook>`
    ),
  );
}

/**
 * Elimina la cadena de cálculo almacenada en el archivo Excel.
 *
 * Retira las referencias a `calcChain.xml` de las relaciones y tipos de
 * contenido del libro, y elimina el archivo interno cuando está presente.
 * Esto permite que Excel reconstruya la cadena al abrir el documento.
 *
 * @param {@param {AdmZip} zip} zip - Archivo Excel abierto como contenedor ZIP.
 * @returns {boolean} `true` cuando finaliza el proceso de eliminación.
 */

function eliminarCadenaCalculo(zip) {
  const relacionesWorkbookXml =
    obtenerXml(
      zip,
      RUTA_RELACIONES_WORKBOOK,
    );

  const tiposContenidoXml =
    obtenerXml(
      zip,
      RUTA_TIPOS_CONTENIDO,
    );

  const relacionesActualizadas =
    relacionesWorkbookXml.replace(
      /<Relationship\b[^>]*Type="http:\/\/schemas\.openxmlformats\.org\/officeDocument\/2006\/relationships\/calcChain"[^>]*\/>/g,
      "",
    );

  const tiposContenidoActualizados =
    tiposContenidoXml.replace(
      /<Override\b[^>]*PartName="\/xl\/calcChain\.xml"[^>]*\/>/g,
      "",
    );

  reemplazarXml(
    zip,
    RUTA_RELACIONES_WORKBOOK,
    relacionesActualizadas,
  );

  reemplazarXml(
    zip,
    RUTA_TIPOS_CONTENIDO,
    tiposContenidoActualizados,
  );

  if (zip.getEntry(RUTA_CADENA_CALCULO)) {
    zip.deleteFile(RUTA_CADENA_CALCULO);
  }

  return true;
}

/**
 * Actualiza las fórmulas y la configuración de cálculo de la hoja General.
 *
 * Corrige los rangos de fórmulas existentes, reemplaza las fórmulas puntuales,
 * elimina resultados calculados anteriormente y activa el recálculo automático
 * del libro. Finalmente elimina la cadena de cálculo para que Excel la genere
 * nuevamente al abrir el archivo.
 *
 * @param {@param {AdmZip} zip} zip - Archivo Excel abierto como contenedor ZIP.
 * @returns {{
 *   hoja: string,
 *   formulasPuntualesActualizadas: number,
 *   formulasConRangosCorregidos: number,
 *   recalculoAutomatico: boolean,
 *   cadenaCalculoEliminada: boolean
 * }} Resultado de la actualización de la hoja General.
 */

function actualizarGeneral(zip) {
  const hojaXml = obtenerXml(
    zip,
    RUTA_HOJA_GENERAL,
  );

  const workbookXml = obtenerXml(
    zip,
    RUTA_WORKBOOK,
  );

  const {
    xml: hojaConRangosCorregidos,
    formulasCorregidas,
  } = actualizarFormulasExistentes(
    hojaXml,
  );

  const hojaConFormulasCorregidas =
    corregirFormulasPuntuales(
      hojaConRangosCorregidos,
    );

  const hojaListaParaRecalcular =
    limpiarValoresCalculados(
      hojaConFormulasCorregidas,
    );

  const workbookActualizado =
    activarRecalculoAutomatico(
      workbookXml,
    );

  reemplazarXml(
    zip,
    RUTA_HOJA_GENERAL,
    hojaListaParaRecalcular,
  );

  reemplazarXml(
    zip,
    RUTA_WORKBOOK,
    workbookActualizado,
  );

  const cadenaCalculoEliminada =
  eliminarCadenaCalculo(zip);

  return {
    hoja:
      "General",

    formulasPuntualesActualizadas:
      Object.keys(
        FORMULAS_CELDAS,
      ).length,

    formulasConRangosCorregidos:
      formulasCorregidas,

    recalculoAutomatico:
      true,

    cadenaCalculoEliminada,
  };
}

module.exports = {
  actualizarGeneral,
};