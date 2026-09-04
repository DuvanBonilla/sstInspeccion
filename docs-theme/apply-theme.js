const fs = require("fs");
const path = require("path");

const raizProyecto = path.resolve(__dirname, "..");
const carpetaDocs = path.join(raizProyecto, "docs");
const cssOrigen = path.join(__dirname, "sst-docs.css");
const carpetaEstilos = path.join(carpetaDocs, "styles");
const cssDestino = path.join(carpetaEstilos, "sst-docs.css");

const referenciaCss =
  '<link type="text/css" rel="stylesheet" href="styles/sst-docs.css">';

if (!fs.existsSync(carpetaDocs)) {
  throw new Error(
    "No existe la carpeta docs. Ejecuta primero la generación de JSDoc.",
  );
}

fs.mkdirSync(carpetaEstilos, { recursive: true });
fs.copyFileSync(cssOrigen, cssDestino);

const archivosHtml = fs
  .readdirSync(carpetaDocs)
  .filter((archivo) => archivo.endsWith(".html"));

for (const archivo of archivosHtml) {
  const rutaArchivo = path.join(carpetaDocs, archivo);
  let contenido = fs.readFileSync(rutaArchivo, "utf8");

  if (contenido.includes("styles/sst-docs.css")) {
    continue;
  }

  contenido = contenido.replace(
    "</head>",
    `    ${referenciaCss}\n</head>`,
  );

  fs.writeFileSync(rutaArchivo, contenido, "utf8");
}

console.log(
  `Tema SST aplicado correctamente en ${archivosHtml.length} archivos HTML.`,
);