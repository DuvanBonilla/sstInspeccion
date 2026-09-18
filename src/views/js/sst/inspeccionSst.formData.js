const CONFIGURACIONES_EVIDENCIA = [
  {
    selector: "[data-extintor-index]",
    role: "evidencia",
    field: "evidencia",
  },
  {
    selector: "[data-camilla-index]",
    role: "camilla-evidencia",
    field: "evidencia-camilla",
  },
  {
    selector: "[data-senalizacion-index]",
    role: "senalizacion-evidencia",
    field: "evidencia-senalizacion",
  },
  {
    selector: "[data-equipo-tecnologico-index]",
    role: "equipo-tecnologico-evidencia",
    field: "equipo-tecnologico-evidencia",
  },
  {
    selector: "[data-botiquin-index]",
    role: "botiquin-evidencia",
    field: "botiquin-evidencia",
  },
];

/**
 * Optimiza una imagen y la incorpora al FormData.
 */
export async function anexarArchivoOptimizado(
  formData,
  fieldName,
  file,
  { optimizarImagen },
) {
  const archivo = await optimizarImagen(file);

  formData.append(fieldName, archivo);

  formData.append(
    `${fieldName}-lastmod`,
    archivo.lastModified,
  );
}

/**
 * Optimiza y agrega las evidencias de un elemento.
 */
export async function anexarEvidenciasMultiples(
  formData,
  card,
  rolePrefix,
  fieldPrefix,
  itemIndex,
  { optimizarImagen },
) {
  const inputs = card.querySelectorAll(
    `[data-role="${rolePrefix}-input"]`,
  );

  for (const [photoIndex, input] of inputs.entries()) {
    const file = input.files[0];

    if (!file) {
      continue;
    }

    await anexarArchivoOptimizado(
      formData,
      `${fieldPrefix}-${itemIndex}-${photoIndex}`,
      file,
      {
        optimizarImagen,
      },
    );
  }
}

/**
 * Construye el FormData de una inspección SST.
 */
export async function construirFormDataSst({
  inspeccionId,
  numInspeccion = null,
  construirPayload,
  documento,
  optimizarImagen,
  crearFormData = () => new FormData(),
}) {
  const formData = crearFormData();

  const inspeccion = construirPayload(inspeccionId);

  if (numInspeccion != null) {
    inspeccion.numInspeccion = numInspeccion;
  }

  formData.append(
    "payload",
    JSON.stringify(inspeccion),
  );

  for (const configuracion of CONFIGURACIONES_EVIDENCIA) {
    const cards = documento.querySelectorAll(
      configuracion.selector,
    );

    let itemIndex = 0;

    for (const card of cards) {
      await anexarEvidenciasMultiples(
        formData,
        card,
        configuracion.role,
        configuracion.field,
        itemIndex,
        {
          optimizarImagen,
        },
      );

      itemIndex++;
    }
  }

  return formData;
}