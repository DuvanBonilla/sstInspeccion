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

function calcularDiasRestantes(fechaCompromiso) {
  const fechaPlan = obtenerFechaLocal(fechaCompromiso);

  if (!fechaPlan) {
    return null;
  }

  const hoy = obtenerFechaLocal(new Date());

  const diferenciaMilisegundos = fechaPlan.getTime() - hoy.getTime();

  return Math.round(diferenciaMilisegundos / (24 * 60 * 60 * 1000));
}

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
