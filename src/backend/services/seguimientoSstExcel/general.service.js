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