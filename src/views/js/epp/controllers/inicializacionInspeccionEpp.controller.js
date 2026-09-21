export function crearInicializacionInspeccionEppController({
  cargarCatalogoEpp,
  console,
  alert,
  inicializarFechaEpp,
  fecha,
  asignarFechaHoy,
  abrirSelectorFecha,
  validacionInformacionGeneral,
  contactosAprobacion,
  inicializarEnvioEpp,
  documento,
  ventana,
  enviarInspeccionEpp,
  navegacion,
  salidaInspeccion,
  trabajadoresManager,
  obtenerValor,
}) {
  async function inicializar() {
    try {
      await cargarCatalogoEpp();
    } catch (error) {
      console.error("[EPP] Error cargando catálogo:", error);

      alert(
        "No fue posible cargar el catálogo de elementos EPP. " +
          "Recarga la página e intenta nuevamente.",
      );

      return;
    }

    try {
      inicializarFechaEpp({
        fecha,
        asignarFechaHoy,
        abrirSelectorFecha,
      });

      validacionInformacionGeneral.inicializar();

      contactosAprobacion.inicializar();

      inicializarEnvioEpp({
        documento,
        ventana,
        enviarInspeccionEpp,
        validarContactos: contactosAprobacion.validar,

        prepararAccionesAprobacion(datos) {
          contactosAprobacion.configurarAcciones({
            ...datos,
            tipoInspeccion: "EPP",
            sede: obtenerValor("sedeOperacion"),
            area: obtenerValor("areaTrabajo"),
          });
        },
      });

      navegacion.inicializar();

      salidaInspeccion.inicializar();

      trabajadoresManager.init();

      navegacion.actualizarPaso();
    } catch (error) {
      console.error("[EPP] Error inicializando formulario:", error);

      alert(
        "No fue posible inicializar el formulario de inspección EPP. " +
          "Recarga la página e intenta nuevamente.",
      );
    }
  }

  return {
    inicializar,
  };
}