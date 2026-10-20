const { recorrerRango } = require("./inicio.lienzo");

const { FILA_FINAL_FORMATO } = require("../../../../shared/services/excel.service");

/**
 * Hojas del seguimiento EPP cuyos datos o fórmulas provienen de la base de
 * datos o del aplicativo. Se protegen para que no se editen desde Excel.
 *
 * En `03 - Planes de Acción` solo quedan libres las columnas Responsable del
 * Cierre y Fecha de Cierre, donde se registra a mano el cierre de cada plan;
 * todas las demás son de lectura.
 */

const HOJAS_PROTEGIDAS = [
  "Inicio",
  "01 - Inspecciones",
  "02 - Seguimiento EPP",
  "03 - Planes de Acción",
  "_RESUMEN",
  "General",
];

/**
 * Celdas que el usuario sí puede escribir en hojas protegidas. En General se
 * escribe el identificador de la inspección que se quiere buscar. En la hoja
 * de planes se registran el responsable (columna R) y la fecha de cierre
 * (columna S) en todas las filas con formato, para que los planes nuevos que
 * se agreguen a la tabla también se puedan cerrar.
 */

const RANGOS_LIBRES = {
  General: ["C10:F10"],
  "03 - Planes de Acción": [`R2:S${FILA_FINAL_FORMATO}`],
};

/**
 * Acciones que siguen permitidas con la hoja protegida y no alteran los
 * datos: filtrar, y seleccionar o copiar celdas. En ExcelJS `true` significa
 * permitido; el ancho de columnas, el alto de filas y la inserción o
 * eliminación de filas y columnas quedan bloqueados. Los objetos, como los
 * íconos del tablero, tampoco se pueden mover ni borrar.
 */

const PERMISOS_HOJA = {
  objects: false,
  scenarios: false,
  selectLockedCells: true,
  selectUnlockedCells: true,
  autoFilter: true,
};

/**
 * Desbloquea un rango de celdas para que se pueda editar con la hoja protegida.
 *
 * @param {ExcelJS.Worksheet} hoja Hoja que contiene el rango.
 * @param {string} rango Rango, por ejemplo `C10:F10`.
 * @returns {void}
 */

function desbloquearRango(hoja, rango) {
  recorrerRango(rango, ({ referencia }) => {
    hoja.getCell(referencia).protection = { locked: false };
  });
}

/**
 * Protege las hojas del seguimiento EPP alimentadas por la base de datos.
 *
 * Solo afecta lo que se puede editar desde Excel: el aplicativo genera el
 * archivo completo y no se ve afectado. El proceso que lee los cierres de la
 * hoja 03 tampoco, porque las columnas de cierre quedan libres.
 *
 * @async
 * @param {ExcelJS.Workbook} workbook Libro del seguimiento EPP ya construido.
 * @param {Object} [opciones] Opciones de protección.
 * @param {string} [opciones.clave] Contraseña de protección; si se omite, las
 * hojas se protegen sin contraseña.
 * @returns {Promise<{hojas: string[], conClave: boolean}>} Hojas protegidas.
 */

async function protegerHojasEpp(workbook, { clave = "" } = {}) {
  const protegidas = [];

  for (const nombre of HOJAS_PROTEGIDAS) {
    const hoja = workbook.getWorksheet(nombre);

    if (!hoja) {
      continue;
    }

    for (const rango of RANGOS_LIBRES[nombre] || []) {
      desbloquearRango(hoja, rango);
    }

    await hoja.protect(clave, PERMISOS_HOJA);

    protegidas.push(nombre);
  }

  return { hojas: protegidas, conClave: Boolean(clave) };
}

/**
 * Protege las hojas sin impedir que se genere el libro: la protección es un
 * cambio de presentación, así que si falla se informa y se continúa.
 *
 * La contraseña es opcional y se toma de `EXCEL_EPP_CLAVE_PROTECCION`.
 *
 * @async
 * @param {ExcelJS.Workbook} workbook Libro del seguimiento EPP ya construido.
 * @returns {Promise<Object>} Hojas protegidas, o el motivo por el que no se
 * aplicó.
 */

async function protegerHojasEppSeguro(workbook) {
  try {
    return {
      aplicada: true,
      ...(await protegerHojasEpp(workbook, {
        clave: process.env.EXCEL_EPP_CLAVE_PROTECCION || "",
      })),
    };
  } catch (error) {
    console.error("[EPP Excel] No se pudo proteger las hojas:", error);

    return { aplicada: false, error: error.message };
  }
}

module.exports = {
  HOJAS_PROTEGIDAS,
  protegerHojasEpp,
  protegerHojasEppSeguro,
};
