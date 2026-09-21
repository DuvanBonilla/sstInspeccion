export function crearRegistroInspeccionEppService({
  generarInspeccionId,
  construirPayload,
  construirContenidoFormData,
  enviarInspeccion,
  obtenerValor,
  leerTrabajadores,
  obtenerEvidencias,
  obtenerContactos,
}) {
  function construirInspeccion(inspeccionId) {
    return construirPayload({
      inspeccionId,
      obtenerValor,
      trabajadores: leerTrabajadores(),
    });
  }

  function construirFormData(inspeccionId) {
    const formData = construirContenidoFormData({
      inspeccion: construirInspeccion(inspeccionId),
      evidencias: obtenerEvidencias(),
    });

    formData.append(
      "contactosAprobacion",
      JSON.stringify(obtenerContactos()),
    );

    return formData;
  }

  async function enviar() {
    const inspeccionId = generarInspeccionId();
    const formData = construirFormData(inspeccionId);

    return enviarInspeccion(formData);
  }

  return {
    construirFormData,
    enviar,
  };
}