/**
 * Consulta el catálogo de elementos EPP disponible en el backend.
 *
 * Este módulo se limita a realizar la solicitud y validar el contrato
 * básico de la respuesta. No administra estado ni elementos del DOM.
 *
 * @param {Function} [fetchFn=globalThis.fetch] Función utilizada para
 * realizar la solicitud HTTP.
 * @returns {Promise<Array>} Elementos contenidos en el catálogo.
 * @throws {Error} Cuando la solicitud falla o la respuesta es inválida.
 */
export async function consultarCatalogoEpp(
  fetchFn = globalThis.fetch,
) {
  const response = await fetchFn("/api/catalogo-epp");

  if (!response.ok) {
    throw new Error(
      `Error cargando catálogo EPP. HTTP ${response.status}`,
    );
  }

  const data = await response.json();

  if (!data.ok || !Array.isArray(data.elementos)) {
    throw new Error("Respuesta inválida del catálogo EPP");
  }

  return data.elementos;
}