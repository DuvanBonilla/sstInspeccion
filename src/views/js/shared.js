export const estados = ["B", "R", "M", "NC", "NA"];
export const afectacionServicio = ["SI", "NO"];

export const condiciones = [
  ["acceso", "Acceso"],
  ["visibilidad", "Visibilidad"],
  ["senalizacion", "Señalización"],
  ["paredAltura", "Pared altura"],
  ["piso", "Piso"],
  ["limpieza", "Limpieza"],
  ["rotulo", "Rótulo"],
  ["cilindro", "Cilindro"],
  ["manometro", "Manómetro"],
  ["presion", "Presión"],
  ["pin", "Pin"],
  ["manguera", "Manguera"],
  ["boquilla", "Boquilla"],
  ["corneta", "Corneta"],
  ["pintura", "Pintura"],
  ["manija", "Manija"],
  ["sello", "Sello"],
  ["llaveSpanner", "Llave Spanner"],
  ["otros", "Otros"]
];

export const condicionesCamilla = [
  ["senalizacion", "Señalización"],
  ["acceso", "Acceso"],
  ["estadoSoporte", "Estado del soporte"],
  ["instalacionPared", "Instalación a pared"],
  ["correasSeguridad", "Correas de seguridad"],
  ["limpieza", "Limpieza"],
  ["inmovilizador", "Inmovilizador"]
];

export const tipoOptionsHtml = [
  ["Solkaflam", "Solkaflam"],
  ["CO2", "CO2"],
  ["Multiproposito", "Multipropósito"],
  ["Agua", "Agua"]
].map(([value, label]) => `<option value="${value}">${label}</option>`).join("");

// [clave, etiqueta, cantidadIdeal, tieneVencimiento]
export const itemsBotiquin = [
  ["morral",                 "Morral (Limpio, señalizado, acceso)",                          1,  false],
  ["estructuraFija",         "Estructura fija (Limpio, señalizado, acceso, llaves)",          1,  false],
  ["gasaEsteril4",           "Gasa estéril por 4 unidades.",                                 8,  true],
  ["esparadrapoTela2",       "Esparadrapo en tela de 2 cm.",                                 1,  true],
  ["micropore2",             "Micropore de 2 cm.",                                            1,  true],
  ["bajalenguas",            "Bajalenguas en madera.",                                        10, false],
  ["guantesDesechables",     "Guantes desechables de nitrilo o vinilo x par - En bolsa.",    5,  true],
  ["vendaRigida4",           "Venda en tela rígida 4 cm x 5 cm.",                            1,  true],
  ["vendaRigida5",           "Venda en tela rígida 5 cm x 5 cm.",                            1,  true],
  ["jabonQuirurgico",        "Jabón quirúrgico PH neutro.",                                  1,  true],
  ["solucionSalina",         "Solución salina 100 cc.",                                      2,  true],
  ["termometroDigital",      "Termómetro digital.",                                          1,  false],
  ["alcohol100",             "Alcohol antiseptico por 100 ml.",                              1,  true],
  ["vendasAdhesivas",        "Vendas adhesivas (Curas) - En bolsa.",                         15, true],
  ["vendaTriangular",        "Venda triangular desechable.",                                  1,  false],
  ["linterna",               "Linterna.",                                                     1,  false],
  ["tijerasTrauma",          "Tijeras cortatodo de trauma",                                   1,  false],
  ["apositosOculares",       "Apósitos oculares - En bolsa.",                                8,  true],
  ["silbato",                "Silbato - En bolsa.",                                           1,  false],
  ["monogafa",               "Monogafa de seguridad.",                                        1,  false],
  ["libretaLapicero",        "Libreta y bolígrafo.",                                          1,  false],
  ["manualPrimerosAuxilios", "Manual de primeros auxilios.",                                  1,  false],
  ["inmovilizadores",        "Inmovilizadores.",                                              1,  false],
  ["tapabocas",              "Tapabocas - En bolsa.",                                         10, true],
  ["bolsaRoja",              "Bolsa roja.",                                                   5,  false],
  ["bolsaVerde",             "Bolsa verde.",                                                  5,  false],
  ["algodon",                "Algodón mediano.",                                              1,  true],
  ["candela",                "Candela.",                                                      1,  false]
];

export const equiposTecnologicos = [
  ["sensorHumo", "Sensor de humo"],
  ["sensorMovimiento", "Sensor de movimiento"],
  ["camarasSeguridad", "Cámaras de seguridad"],
  ["alarmaEmergencia", "Alarma de emergencia"]
];

const CAMPOS_OPCIONALES = new Set([
  "observaciones",
  "camillaObservaciones",
  "senalizacionObservaciones",
  "observacionGeneral"
]);

/**
 * Determina si un campo debe excluirse de las validaciones obligatorias.
 *
 * Considera opcionales los campos configurados explícitamente, los relacionados
 * con observaciones y aquellos marcados mediante `data-optional="true"`.
 *
 * @param {HTMLElement} el - Campo del formulario que debe evaluarse.
 * @returns {boolean} `true` si el campo es opcional; de lo contrario, `false`.
 */

export function esCampoOpcional(el) {
  const nombre = (el.name || "").toLowerCase();
  return (
    CAMPOS_OPCIONALES.has(el.name) ||
    nombre.includes("observacion") ||
    el.dataset?.optional === "true"
  );
}

/*
  Bloque de evidencias múltiples — reemplaza el input único de foto por
  N slots (2 por defecto: el primero obligatorio, el resto opcional) más
  un botón para agregar más fotos. Usado por los 5 managers de tarjetas.
*/
function crearSlotEvidenciaHtml(rolePrefix, requerido) {
  return `
    <div class="evidencia-slot" data-role="${rolePrefix}-slot">
      <button type="button" class="remove-evidence-btn" data-action="remove-${rolePrefix}-slot" title="Quitar esta foto">&times;</button>
      <input type="file" accept="image/*" data-role="${rolePrefix}-input" ${requerido ? "" : 'data-optional="true"'} />
      <span class="muted" data-role="${rolePrefix}-nombre">Sin imagen seleccionada.</span>
      <img class="evidence-preview" data-role="${rolePrefix}-preview" alt="Vista previa de evidencia" />
    </div>
  `;
}

/**
 * Genera la estructura HTML de un bloque de evidencias múltiples.
 *
 * Crea una cantidad inicial de espacios para fotografías, dejando el primero
 * como obligatorio y los restantes como opcionales. También incorpora el
 * botón utilizado para agregar nuevas evidencias.
 *
 * @param {string} rolePrefix - Prefijo utilizado para identificar los elementos del bloque.
 * @param {number} [minSlots=2] - Cantidad inicial de espacios para evidencias.
 * @returns {string} Estructura HTML del bloque de evidencias.
 */

export function crearBloqueEvidencias(rolePrefix, minSlots = 2) {
  const slots = Array.from({ length: minSlots }, (_, i) => crearSlotEvidenciaHtml(rolePrefix, i === 0)).join("");
  return `
    <div class="evidencias-wrap" data-role="${rolePrefix}-wrap">
      <div class="evidencias-grid" data-role="${rolePrefix}-slots">${slots}</div>
      <button type="button" class="add-btn add-evidence-btn" data-action="add-${rolePrefix}-slot">+ Agregar otra foto</button>
    </div>
  `;
}

// Marca el primer slot visible como obligatorio y el resto como opcional (tras agregar/quitar slots).
function actualizarRequeridosEvidencia(slotsContainer, rolePrefix) {
  slotsContainer.querySelectorAll(`[data-role="${rolePrefix}-input"]`).forEach((input, i) => {
    if (i === 0) delete input.dataset.optional;
    else input.dataset.optional = "true";
  });
}

export function inicializarBloqueEvidencias(card, rolePrefix) {
  const wrap = card.querySelector(`[data-role="${rolePrefix}-wrap"]`);
  if (!wrap) return;
  const slotsContainer = wrap.querySelector(`[data-role="${rolePrefix}-slots"]`);
  const addBtn = wrap.querySelector(`[data-action="add-${rolePrefix}-slot"]`);

  function wireSlot(slot) {
    const input = slot.querySelector(`[data-role="${rolePrefix}-input"]`);
    const nombre = slot.querySelector(`[data-role="${rolePrefix}-nombre"]`);
    const preview = slot.querySelector(`[data-role="${rolePrefix}-preview"]`);
    const removeBtn = slot.querySelector(`[data-action="remove-${rolePrefix}-slot"]`);

    input.addEventListener("change", () => actualizarPreviewArchivo(input, nombre, preview));

    removeBtn.addEventListener("click", () => {
      if (slotsContainer.children.length > 1) {
        slot.remove();
      } else {
        input.value = "";
        actualizarPreviewArchivo(input, nombre, preview);
      }
      actualizarRequeridosEvidencia(slotsContainer, rolePrefix);
    });
  }

  slotsContainer.querySelectorAll(`[data-role="${rolePrefix}-slot"]`).forEach(wireSlot);

  addBtn?.addEventListener("click", () => {
    const contenedor = document.createElement("div");
    contenedor.innerHTML = crearSlotEvidenciaHtml(rolePrefix, false).trim();
    const nuevoSlot = contenedor.firstElementChild;
    slotsContainer.appendChild(nuevoSlot);
    wireSlot(nuevoSlot);
    actualizarRequeridosEvidencia(slotsContainer, rolePrefix);
  });
}

/**
 * Obtiene los archivos seleccionados en un bloque de evidencias.
 *
 * Recorre los campos correspondientes al prefijo indicado, descarta los
 * espacios vacíos y conserva el orden en el que aparecen las fotografías.
 *
 * @param {HTMLElement} card - Tarjeta que contiene las evidencias.
 * @param {string} rolePrefix - Prefijo que identifica el bloque.
 * @returns {File[]} Archivos seleccionados y ordenados.
 */

export function leerArchivosEvidencia(card, rolePrefix) {
  return Array.from(card.querySelectorAll(`[data-role="${rolePrefix}-input"]`))
    .map((input) => input.files[0])
    .filter(Boolean);
}

export function crearOpciones() {
  return [`<option value="">Seleccione</option>`]
    .concat(estados.map((estado) => `<option value="${estado}">${estado}</option>`))
    .join("");
}

export function crearOpcionesAfectacion() {
  return [`<option value="">Seleccione</option>`]
    .concat(afectacionServicio.map((valor) => `<option value="${valor}">${valor}</option>`))
    .join("");
}

/**
 * Actualiza la vista previa de una evidencia fotográfica.
 *
 * Muestra el nombre y contenido visual del archivo seleccionado. Cuando el
 * campo está vacío, restablece el texto y oculta la imagen de previsualización.
 *
 * @param {HTMLInputElement} input - Campo utilizado para seleccionar el archivo.
 * @param {HTMLElement} nombreEl - Elemento donde se muestra el nombre del archivo.
 * @param {HTMLImageElement} previewEl - Imagen utilizada para la vista previa.
 * @returns {void}
 */

export function actualizarPreviewArchivo(input, nombreEl, previewEl) {
  const archivo = input?.files?.[0];

  if (!archivo) {
    nombreEl.textContent = "Sin imagen seleccionada.";
    previewEl.style.display = "none";
    previewEl.removeAttribute("src");
    return;
  }

  nombreEl.textContent = archivo.name;

  const reader = new FileReader();
  reader.onload = () => {
    previewEl.src = reader.result;
    previewEl.style.display = "block";
  };
  reader.readAsDataURL(archivo);
}

export function activarSoloNumeros() {
  document.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (!target.matches('input[inputmode="numeric"]')) return;

    const limpio = target.value.replace(/\D+/g, "");
    if (target.value !== limpio) {
      target.value = limpio;
    }
  });
}

export function abrirSelectorFecha() {
  const fecha = document.getElementById("fecha");

  if (typeof fecha?.showPicker === "function") {
    fecha.showPicker();
  } else {
    fecha?.focus();
  }
}

export function asignarFechaHoy() {
  const fecha = document.getElementById("fecha");
  if (fecha && !fecha.value) {
    fecha.value = "";
  }
}

/**
 * Procesa una respuesta HTTP recibida desde el servidor.
 *
 * Lee el contenido como texto y, cuando corresponde a JSON, intenta
 * convertirlo en un objeto. Si la respuesta está vacía, contiene un JSON
 * inválido o corresponde a texto plano, genera una estructura de errores.
 *
 * @async
 * @param {Response} respuesta - Respuesta HTTP que debe procesarse.
 * @returns {Promise<Object>} Contenido JSON procesado o estructura con los errores encontrados.
 */

export async function leerRespuesta(respuesta) {
  const contentType = respuesta.headers.get("content-type") || "";
  const texto = await respuesta.text();

  if (!texto) {
    return { errores: ["El servidor no devolvió contenido"] };
  }

  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(texto);
    } catch {
      return { errores: ["Respuesta JSON inválida del servidor"] };
    }
  }

  return { errores: [texto] };
}
