/**
 * Prueba de regresión del mapa de rutas del backend.
 *
 * Verifica que la aplicación registre exactamente los endpoints esperados:
 * mismo método, misma ruta, mismo orden, misma cantidad de middlewares y el
 * mismo controlador final. Sirve como red de seguridad durante la
 * reorganización del backend por módulos: si al mover un archivo una ruta
 * deja de registrarse o apunta a otro controlador, esta prueba falla.
 *
 * No abre conexiones a la base de datos: el pool de PostgreSQL solo se
 * conecta cuando se ejecuta una consulta.
 */

const test = require("node:test");
const assert = require("node:assert/strict");

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgres://prueba:prueba@localhost:5432/prueba";
}

const app = require("../../../src/backend/app");

/**
 * Recorre la pila de Express (incluidos los routers anidados) y devuelve
 * cada ruta como "MÉTODO /ruta -> cantidadHandlers controladorFinal".
 */
function listarRutas(stack, salida = []) {
  for (const layer of stack) {
    if (layer.route) {
      const handlers = layer.route.stack.map((capa) => capa.handle);
      const final = handlers[handlers.length - 1];

      const metodos = Object.keys(layer.route.methods).filter(
        (metodo) => layer.route.methods[metodo],
      );

      for (const metodo of metodos) {
        salida.push(
          `${metodo.toUpperCase()} ${layer.route.path} -> ${handlers.length} ${final.name}`,
        );
      }
    } else if (layer.handle && Array.isArray(layer.handle.stack)) {
      listarRutas(layer.handle.stack, salida);
    }
  }

  return salida;
}

const RUTAS_ESPERADAS = [
  "GET / -> 1 mostrarInicio",
  "GET /inspeccion-sst -> 1 mostrarInspeccionSst",
  "GET /inspeccion-epp -> 1 mostrarInspeccionEpp",
  "GET /aprobar/:token -> 1 mostrarAprobar",
  "GET /estadisticas -> 1 mostrarEstadisticas",
  "GET /estadisticas-epp -> 1 mostrarEstadisticasEpp",
  "POST /enviar-onedrive-extintor -> 2 enviarExtintorOneDrive",
  "POST /enviar-inspeccion-epp -> 2 enviarInspeccionEpp",
  "POST /pdf-prueba -> 2 generarPdfPrueba",
  "POST /enviar-pdf-prueba-correo -> 2 enviarPdfPruebaCorreo",
  "GET /api/inspecciones/:id/links -> 1 obtenerLinks",
  "GET /api/aprobaciones/:token -> 1 obtenerResumenAprobacion",
  "GET /api/aprobaciones/:token/preview -> 1 previsualizarAprobacion",
  "POST /api/aprobaciones/:token -> 1 registrarAprobacion",
  "POST /api/inspecciones/:id/reiniciar-aprobaciones -> 1 reiniciarAprobaciones",
  "POST /api/inspecciones/:id/reinicio-aprobaciones/solicitar-codigo -> 1 solicitarCodigoReinicioAprobaciones",
  "POST /api/inspecciones/:id/reinicio-aprobaciones/confirmar -> 1 confirmarReinicioAprobaciones",
  "GET /api/estadisticas/resumen -> 1 obtenerResumen",
  "GET /api/estadisticas/inspecciones -> 1 listarInspecciones",
  "GET /api/estadisticas-epp/resumen -> 1 obtenerResumenEpp",
  "GET /api/estadisticas-epp/inspecciones -> 1 listarInspeccionesEpp",
  "POST /api/excel/epp/actualizar-onedrive -> 1 actualizarExcelSeguimientoEpp",
  "POST /api/excel/sst/actualizar-onedrive -> 1 actualizarExcelSeguimientoSst",
  "POST /api/excel/epp/sincronizar-cierres -> 2 sincronizarCierresExcelEpp",
  "GET /api/catalogo-epp -> 1 listarCatalogoEpp",
  "GET /api/catalogo-epp/predeterminados -> 1 listarEppPredeterminados",
];

test("la aplicación registra exactamente las rutas esperadas", () => {
  const pilaPrincipal = (app.router || app._router).stack;
  const rutas = listarRutas(pilaPrincipal);

  assert.deepEqual(rutas, RUTAS_ESPERADAS);
});
