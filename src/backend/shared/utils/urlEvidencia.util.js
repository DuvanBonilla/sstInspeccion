const BIBLIOTECA_ONEDRIVE = "/Documents";

/**
 * Obtiene el enlace actual de una evidencia guardada en OneDrive.
 *
 * El enlace que se guarda al subir la evidencia incluye el nombre de la
 * carpeta de ese momento. Si la carpeta cambia de nombre, ese enlace queda
 * desactualizado, mientras que la ruta de la evidencia sigue siendo la vigente.
 * Por eso el enlace se reconstruye con el inicio del enlace guardado, hasta la
 * biblioteca `Documents`, y la ruta actual de la evidencia.
 *
 * Si falta la ruta o el enlace no pertenece a la biblioteca `Documents`, se
 * devuelve el enlace guardado sin cambios.
 *
 * @param {string|null|undefined} url Enlace guardado de la evidencia.
 * @param {string|null|undefined} ruta Ruta vigente de la evidencia en OneDrive,
 * por ejemplo `/INSPECCIONES_DE_SEGURIDAD/EVIDENCIAS/EPP_1_ABCD.jpg`.
 * @returns {string} Enlace actualizado, o cadena vacía si no hay enlace.
 */

function resolverUrlEvidencia(url, ruta) {
  const enlace = String(url || "").trim();

  const rutaVigente = String(ruta || "").trim();

  if (!enlace || !rutaVigente) {
    return enlace;
  }

  const inicioBiblioteca = enlace.indexOf(`${BIBLIOTECA_ONEDRIVE}/`);

  if (inicioBiblioteca < 0) {
    return enlace;
  }

  const rutaNormalizada = rutaVigente.startsWith("/")
    ? rutaVigente
    : `/${rutaVigente}`;

  return (
    enlace.slice(0, inicioBiblioteca + BIBLIOTECA_ONEDRIVE.length) +
    encodeURI(rutaNormalizada)
  );
}

module.exports = {
  resolverUrlEvidencia,
};
