

const {
  obtenerOCrearHoja,
  configurarColumnas,
  aplicarFormatoFecha,
} = require("../excel.service");



function obtenerFechaLocal(fecha) {
  if (!fecha) {
    return null;
  }

  const valor = fecha instanceof Date ? fecha : new Date(fecha);

  if (Number.isNaN(valor.getTime())) {
    return null;
  }

  return new Date(valor.getFullYear(), valor.getMonth(), valor.getDate());
}

/**
 * Calcula los días restantes para el vencimiento de un plan de acción.
 *
 * Normaliza la fecha de compromiso y la fecha actual para comparar únicamente
 * sus componentes de calendario, sin tener en cuenta la hora.
 *
 * @param {string|Date|null} fechaCompromiso - Fecha límite del plan de acción.
 * @returns {number|null} Días restantes hasta el vencimiento; un valor negativo
 * cuando el plan está vencido, o `null` si la fecha no es válida.
 */

function calcularDiasRestantes(fechaCompromiso) {
  const fechaPlan = obtenerFechaLocal(fechaCompromiso);

  if (!fechaPlan) {
    return null;
  }

  const hoy = obtenerFechaLocal(new Date());

  const diferenciaMilisegundos = fechaPlan.getTime() - hoy.getTime();

  return Math.round(diferenciaMilisegundos / (24 * 60 * 60 * 1000));
}

/**
 * Agrupa y clasifica los planes de acción por inspección.
 *
 * Calcula para cada inspección la cantidad total de planes, los planes
 * pendientes, cumplidos, vencidos y próximos a vencer. Se considera próximo
 * a vencer un plan pendiente con entre cero y tres días restantes.
 *
 * @param {Array<{
 *   inspeccion_id: string,
 *   estado_plan: string,
 *   fecha_plan_accion: string|Date|null
 * }>} planes - Planes de acción que deben clasificarse.
 * @returns {Map<string, {
 *   totalPlanes: number,
 *   planesPendientes: number,
 *   planesCumplidos: number,
 *   planesVencidos: number,
 *   planesProximosVencer: number
 * }>} Resumen de planes agrupado por identificador de inspección.
 */

function clasificarPlanesPorInspeccion(planes) {
  const planesPorInspeccion = new Map();

  for (const plan of planes) {
    const inspeccionId = String(plan.inspeccion_id || "").trim();

    if (!inspeccionId) {
      continue;
    }

    if (!planesPorInspeccion.has(inspeccionId)) {
      planesPorInspeccion.set(inspeccionId, {
        totalPlanes: 0,
        planesPendientes: 0,
        planesCumplidos: 0,
        planesVencidos: 0,
        planesProximosVencer: 0,
      });
    }

    const resumen = planesPorInspeccion.get(inspeccionId);

    resumen.totalPlanes += 1;

    const estadoPlan = String(plan.estado_plan || "")
      .trim()
      .toUpperCase();

    if (estadoPlan === "CUMPLIDO") {
      resumen.planesCumplidos += 1;
      continue;
    }

    resumen.planesPendientes += 1;

    const diasRestantes = calcularDiasRestantes(plan.fecha_plan_accion);

    if (diasRestantes === null) {
      continue;
    }

    if (diasRestantes < 0) {
      resumen.planesVencidos += 1;
      continue;
    }

    if (diasRestantes <= 3) {
      resumen.planesProximosVencer += 1;
    }
  }

  return planesPorInspeccion;
}

/**
 * Construye la hoja consolidada de indicadores del seguimiento EPP.
 *
 * Genera la hoja `_RESUMEN` con una fila por inspección, incluyendo sus
 * datos generales, trabajadores evaluados, novedades EPP y clasificación
 * de los planes de acción.
 *
 * La hoja se mantiene oculta y su información se utiliza como fuente
 * consolidada para el seguimiento y procesamiento posterior del archivo.
 *
 * @param {ExcelJS.Workbook} workbook
 * Libro de Excel donde debe construirse la hoja.
 * @param {Array<Object>} inspecciones
 * Inspecciones EPP obtenidas desde la base de datos.
 * @param {Array<Object>} seguimiento
 * Registros individuales de trabajadores incluidos en el seguimiento.
 * @param {Array<Object>} planes
 * Planes de acción asociados con las inspecciones.
 * @returns {Object} Hoja construida, totales procesados y rango ocupado.Hoja construida, totales procesados y rango ocupado.
 */

function construirHojaResumenEpp(workbook, inspecciones, seguimiento, planes) {
  const hoja = obtenerOCrearHoja(workbook, "_RESUMEN");

  configurarColumnas(hoja, [
    {
      header: "Código Inspección",
      key: "inspeccionId",
      width: 24,
    },
    {
      header: "Fecha",
      key: "fecha",
      width: 16,
    },
    {
      header: "Sede",
      key: "sede",
      width: 20,
    },
    {
      header: "Área",
      key: "area",
      width: 24,
    },
    {
      header: "Estado",
      key: "estado",
      width: 24,
    },
    {
      header: "Responsable",
      key: "responsable",
      width: 28,
    },
    {
      header: "Trabajadores Evaluados",
      key: "trabajadoresEvaluados",
      width: 24,
    },
    {
      header: "Trabajadores con Novedad",
      key: "trabajadoresConNovedad",
      width: 26,
    },
    {
      header: "EPP Evaluados",
      key: "eppEvaluados",
      width: 20,
    },
    {
      header: "EPP con Novedad",
      key: "eppConNovedad",
      width: 22,
    },
    {
      header: "Total Planes",
      key: "totalPlanes",
      width: 18,
    },
    {
      header: "Planes Pendientes",
      key: "planesPendientes",
      width: 22,
    },
    {
      header: "Planes Cumplidos",
      key: "planesCumplidos",
      width: 22,
    },
    {
      header: "Planes Vencidos",
      key: "planesVencidos",
      width: 20,
    },
    {
      header: "Planes Próximos a Vencer",
      key: "planesProximosVencer",
      width: 28,
    },
  ]);

  const planesPorInspeccion = clasificarPlanesPorInspeccion(planes);

  for (const inspeccion of inspecciones) {
    const inspeccionId = String(inspeccion.inspeccion_id || "").trim();

    const resumenPlanes = planesPorInspeccion.get(inspeccionId) || {
      totalPlanes: 0,
      planesPendientes: 0,
      planesCumplidos: 0,
      planesVencidos: 0,
      planesProximosVencer: 0,
    };

    hoja.addRow({
      inspeccionId,

      fecha: inspeccion.fecha || "",

      sede: inspeccion.sede_operacion || "",

      area: inspeccion.area_trabajo || "",

      estado: inspeccion.estado || "",

      responsable: inspeccion.responsable_inspeccion || "",

      trabajadoresEvaluados: Number(inspeccion.total_trabajadores || 0),

      trabajadoresConNovedad: Number(inspeccion.trabajadores_con_novedad || 0),

      eppEvaluados: Number(inspeccion.total_epp_evaluados || 0),

      eppConNovedad: Number(inspeccion.epp_con_novedad || 0),

      totalPlanes: resumenPlanes.totalPlanes,

      planesPendientes: resumenPlanes.planesPendientes,

      planesCumplidos: resumenPlanes.planesCumplidos,

      planesVencidos: resumenPlanes.planesVencidos,

      planesProximosVencer: resumenPlanes.planesProximosVencer,
    });
  }

  const ultimaFila = hoja.rowCount;

  if (ultimaFila >= 2) {
    aplicarFormatoFecha(hoja, "B", 2, ultimaFila);
  }

  hoja.state = "hidden";

  return {
    hoja,

    totalInspecciones: inspecciones.length,

    totalTrabajadores: seguimiento.length,

    totalPlanes: planes.length,

    rango: `A1:O${Math.max(ultimaFila, 1)}`,
  };
}

module.exports = {
  construirHojaResumenEpp,
};
