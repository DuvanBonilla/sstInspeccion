export function inicializarFechaEpp({
  fecha,
  asignarFechaHoy,
  abrirSelectorFecha,
}) {
  if (!fecha) {
    return;
  }

  asignarFechaHoy(fecha);

  fecha.addEventListener("click", () => {
    abrirSelectorFecha(fecha);
  });
}