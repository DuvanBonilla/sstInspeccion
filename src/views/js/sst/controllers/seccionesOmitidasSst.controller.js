export const SECCIONES_OMITIBLES_SST = [
  {
    key: "extintores",
    step: 2,
    containerId: "extintores-container",
    btnOmitirId: "btn-omitir-extintores",
    mensajeId: "mensaje-omitido-extintores",
    btnAgregarId: "btn-agregar-extintor",
    siguientePaso: 3,
  },
  {
    key: "camillas",
    step: 3,
    containerId: "camillas-container",
    btnOmitirId: "btn-omitir-camillas",
    mensajeId: "mensaje-omitido-camillas",
    btnAgregarId: "btn-agregar-camilla",
    siguientePaso: 4,
  },
  {
    key: "senalizaciones",
    step: 4,
    containerId: "senalizaciones-container",
    btnOmitirId: "btn-omitir-senalizaciones",
    mensajeId: "mensaje-omitido-senalizaciones",
    btnAgregarId: "btn-agregar-senalizacion",
    siguientePaso: 5,
  },
  {
    key: "botiquines",
    step: 5,
    containerId: "botiquines-container",
    btnOmitirId: "btn-omitir-botiquines",
    mensajeId: "mensaje-omitido-botiquines",
    btnAgregarId: "btn-agregar-botiquin",
    siguientePaso: 6,
  },
  {
    key: "equiposTecnologicos",
    step: 6,
    containerId: "equipos-tecnologicos-container",
    btnOmitirId: "btn-omitir-equipos",
    mensajeId: "mensaje-omitido-equipos",
    btnAgregarId: null,
    siguientePaso: 7,
  },
];

export function crearSeccionesOmitidasSstController({
  documento,
  seccionesOmitibles = SECCIONES_OMITIBLES_SST,
}) {
  const seccionesOmitidas = Object.fromEntries(
    seccionesOmitibles.map((seccion) => [
      seccion.key,
      false,
    ]),
  );

  function esSedeUrabana() {
    const sede =
      documento.getElementById("sedeOperacion")
        ?.value || "";

    return ["urab", "santa marta"].some(
      (valor) =>
        sede.toLowerCase().includes(valor),
    );
  }

  function actualizarTextoOmitir(seccion) {
    const boton = documento.getElementById(
      seccion.btnOmitirId,
    );

    if (!boton) {
      return;
    }

    boton.textContent =
      seccionesOmitidas[seccion.key]
        ? "Incluir sección"
        : "Omitir sección";
  }

  function omitirSeccion(seccion) {
    seccionesOmitidas[seccion.key] = true;

    documento
      .getElementById(seccion.containerId)
      ?.classList.add("hidden");

    documento
      .getElementById(seccion.mensajeId)
      ?.classList.remove("hidden");

    if (seccion.btnAgregarId) {
      documento
        .getElementById(seccion.btnAgregarId)
        ?.classList.add("hidden");
    }

    actualizarTextoOmitir(seccion);
  }

  function incluirSeccion(seccion) {
    seccionesOmitidas[seccion.key] = false;

    documento
      .getElementById(seccion.containerId)
      ?.classList.remove("hidden");

    documento
      .getElementById(seccion.mensajeId)
      ?.classList.add("hidden");

    if (seccion.btnAgregarId) {
      documento
        .getElementById(seccion.btnAgregarId)
        ?.classList.remove("hidden");
    }

    actualizarTextoOmitir(seccion);
  }

  function actualizarVisibilidadOmitir() {
    const sedePermitida = esSedeUrabana();

    seccionesOmitibles.forEach((seccion) => {
      documento
        .getElementById(seccion.btnOmitirId)
        ?.classList.toggle(
          "hidden",
          !sedePermitida,
        );

      if (
        !sedePermitida &&
        seccionesOmitidas[seccion.key]
      ) {
        incluirSeccion(seccion);
      }
    });
  }

  function alternarSeccion(
    seccion,
    navegarAlPaso,
  ) {
    if (seccionesOmitidas[seccion.key]) {
      incluirSeccion(seccion);

      return;
    }

    omitirSeccion(seccion);

    if (seccion.siguientePaso) {
      navegarAlPaso(seccion.siguientePaso);
    }
  }

  function inicializar({
    navegarAlPaso = () => {},
  } = {}) {
    seccionesOmitibles.forEach((seccion) => {
      documento
        .getElementById(seccion.btnOmitirId)
        ?.addEventListener("click", () => {
          alternarSeccion(
            seccion,
            navegarAlPaso,
          );
        });
    });

    const sede =
      documento.getElementById("sedeOperacion");

    sede?.addEventListener(
      "input",
      actualizarVisibilidadOmitir,
    );

    sede?.addEventListener(
      "change",
      actualizarVisibilidadOmitir,
    );

    actualizarVisibilidadOmitir();
  }

  return {
    seccionesOmitibles,
    seccionesOmitidas,
    esSedeUrabana,
    actualizarVisibilidadOmitir,
    actualizarTextoOmitir,
    omitirSeccion,
    incluirSeccion,
    alternarSeccion,
    inicializar,
  };
}