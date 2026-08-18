/**
 * ============================================================
 * PDF OPTIMIZER
 * ------------------------------------------------------------
 * Módulo reutilizable para optimizar documentos PDF generados
 * por el servidor antes de almacenarlos o enviarlos.
 *
 * API pública:
 *
 *   await optimizarPdf(pdfBuffer)
 *
 *   await optimizarPdf(pdfBuffer, {
 *     profile: "inspection",
 *     fileName: "inspeccion-sst.pdf"
 *   })
 *
 * El módulo:
 *  - valida el Buffer recibido;
 *  - analiza el tamaño y la cabecera del PDF;
 *  - selecciona una estrategia según el perfil;
 *  - ejecuta Ghostscript;
 *  - compara el resultado con el original;
 *  - nunca devuelve un PDF más pesado que el original;
 *  - conserva el PDF original ante cualquier error.
 *
 * No conoce:
 *  - PDFKit;
 *  - OneDrive;
 *  - Microsoft Graph;
 *  - inspecciones SST;
 *  - correos electrónicos.
 * ============================================================
 */

const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");

const execFileAsync = promisify(execFile);

/**
 * Versión interna del módulo.
 */
const PDF_OPTIMIZER_VERSION = "1.0.0";

/**
 * Unidades de almacenamiento.
 */
const KB = 1024;
const MB = 1024 * KB;

/**
 * Perfiles disponibles.
 *
 * Los perfiles son propios del proyecto. Cada uno define los
 * parámetros que posteriormente se enviarán a Ghostscript.
 */
const PROFILES = Object.freeze({
    inspection: Object.freeze({
        smallFileLimit: 500 * KB,
        minimumReductionPercent: 3,
        targetSize: 1 * MB,

        medium: Object.freeze({
            pdfSettings: "/ebook",
            imageResolution: 120,
            jpegQuality: 82,
        }),

        large: Object.freeze({
            pdfSettings: "/ebook",
            imageResolution: 100,
            jpegQuality: 76,
        }),

        maximum: Object.freeze({
            pdfSettings: "/screen",
            imageResolution: 85,
            jpegQuality: 68,
        }),
    }),

    archive: Object.freeze({
        smallFileLimit: 1 * MB,
        minimumReductionPercent: 3,
        targetSize: 2 * MB,

        medium: Object.freeze({
            pdfSettings: "/printer",
            imageResolution: 150,
            jpegQuality: 88,
        }),

        large: Object.freeze({
            pdfSettings: "/ebook",
            imageResolution: 130,
            jpegQuality: 84,
        }),

        maximum: Object.freeze({
            pdfSettings: "/ebook",
            imageResolution: 110,
            jpegQuality: 78,
        }),
    }),

    maximum: Object.freeze({
        smallFileLimit: 250 * KB,
        minimumReductionPercent: 1,
        targetSize: 1 * MB,

        medium: Object.freeze({
            pdfSettings: "/screen",
            imageResolution: 96,
            jpegQuality: 72,
        }),

        large: Object.freeze({
            pdfSettings: "/screen",
            imageResolution: 82,
            jpegQuality: 65,
        }),

        maximum: Object.freeze({
            pdfSettings: "/screen",
            imageResolution: 72,
            jpegQuality: 58,
        }),
    }),
});

/**
 * Configuración central del optimizador.
 */
const PDF_OPTIMIZER_CONFIG = Object.freeze({
    enabled: process.env.PDF_OPTIMIZE !== "false",
    defaultProfile: process.env.PDF_COMPRESSION_PROFILE || "inspection",
    profiles: PROFILES,
    debug: process.env.PDF_OPTIMIZER_DEBUG !== "false",
    showWarnings: process.env.PDF_OPTIMIZER_WARNINGS !== "false",

    /**
     * En Windows el ejecutable normalmente es gswin64c.
     * En Linux y Render normalmente es gs.
     *
     * GHOSTSCRIPT_PATH permite sobrescribirlo cuando sea necesario.
     */
    ghostscriptExecutable:
        process.env.GHOSTSCRIPT_PATH ||
        (process.platform === "win32" ? "gswin64c" : "gs"),

    /**
     * Tiempo máximo permitido para cada ejecución.
     */
    timeoutMs: Number(process.env.PDF_OPTIMIZER_TIMEOUT_MS) || 60_000,

    /**
     * Evita que un Buffer accidentalmente enorme consuma demasiados
     * recursos del servidor.
     */
    maximumInputSize:
        (Number(process.env.PDF_MAX_INPUT_SIZE_MB) || 100) * MB,
});

/**
 * Obtiene el perfil solicitado.
 *
 * Si el nombre recibido no existe, devuelve el perfil
 * predeterminado configurado para el módulo.
 *
 * @param {string} profileName Nombre del perfil.
 * @returns {Object} Configuración del perfil seleccionado.
 */
function obtenerPerfil(profileName) {
    const nombreSolicitado = String(profileName || "").trim();

    return (
        PDF_OPTIMIZER_CONFIG.profiles[nombreSolicitado] ||
        PDF_OPTIMIZER_CONFIG.profiles[
        PDF_OPTIMIZER_CONFIG.defaultProfile
        ] ||
        PDF_OPTIMIZER_CONFIG.profiles.inspection
    );
}

/**
 * Valida que el valor recibido sea un Buffer con apariencia
 * de documento PDF.
 *
 * Esta función no ejecuta Ghostscript ni modifica el archivo.
 *
 * @param {Buffer} pdfBuffer Buffer que se quiere optimizar.
 * @returns {{ok: boolean, motivo: string|null}}
 */
function validarPdf(pdfBuffer) {
    if (!Buffer.isBuffer(pdfBuffer)) {
        return {
            ok: false,
            motivo: "El valor recibido no es un Buffer.",
        };
    }

    if (pdfBuffer.length <= 0) {
        return {
            ok: false,
            motivo: "El Buffer PDF está vacío.",
        };
    }

    if (pdfBuffer.length > PDF_OPTIMIZER_CONFIG.maximumInputSize) {
        const limiteMB =
            PDF_OPTIMIZER_CONFIG.maximumInputSize / MB;

        return {
            ok: false,
            motivo:
                `El PDF supera el límite permitido de ` +
                `${limiteMB.toFixed(0)} MB.`,
        };
    }

    /**
     * Los documentos PDF normales comienzan con "%PDF-".
     *
     * Se revisan los primeros bytes sin convertir el documento
     * completo a texto.
     */
    const header = pdfBuffer
        .subarray(0, Math.min(pdfBuffer.length, 8))
        .toString("ascii");

    if (!header.startsWith("%PDF-")) {
        return {
            ok: false,
            motivo: "El Buffer recibido no contiene una cabecera PDF válida.",
        };
    }

    /**
     * Una comprobación sencilla para descartar un Buffer incompleto.
     * El marcador %%EOF normalmente se encuentra al final del PDF.
     */
    const tailStart = Math.max(0, pdfBuffer.length - 2048);
    const tail = pdfBuffer
        .subarray(tailStart)
        .toString("latin1");

    if (!tail.includes("%%EOF")) {
        return {
            ok: false,
            motivo:
                "El documento no contiene el marcador final %%EOF y podría estar incompleto.",
        };
    }

    return {
        ok: true,
        motivo: null,
    };
}

/**
 * Analiza características básicas del documento PDF.
 *
 * No modifica el Buffer y no depende de librerías adicionales.
 *
 * El conteo de páginas es estimado mediante objetos /Type /Page.
 * Ghostscript seguirá siendo quien valide definitivamente el PDF
 * durante la optimización.
 *
 * @param {Buffer} pdfBuffer Buffer PDF válido.
 * @returns {{
 *   size: number,
 *   sizeKB: number,
 *   sizeMB: number,
 *   version: string,
 *   estimatedPageCount: number
 * }}
 */
function analizarPdf(pdfBuffer) {
    const header = pdfBuffer
        .subarray(0, Math.min(pdfBuffer.length, 16))
        .toString("ascii");

    const versionMatch = header.match(/%PDF-(\d+\.\d+)/);

    /**
     * Para buscar objetos de páginas usamos latin1, que conserva
     * cada byte como un carácter y evita problemas con binarios.
     */
    const pdfText = pdfBuffer.toString("latin1");

    /**
     * Evita contar /Type /Pages, que corresponde al árbol de páginas.
     */
    const pageMatches =
        pdfText.match(/\/Type\s*\/Page(?!s)\b/g) || [];

    return {
        size: pdfBuffer.length,
        sizeKB: Number((pdfBuffer.length / KB).toFixed(2)),
        sizeMB: Number((pdfBuffer.length / MB).toFixed(2)),
        version: versionMatch?.[1] || "desconocida",
        estimatedPageCount: pageMatches.length,
    };
}

/**
 * ============================================================
 * Obtiene la estrategia de compresión adecuada para el PDF.
 *
 * Esta función analiza el tamaño del documento y selecciona
 * automáticamente el nivel de optimización que se enviará a
 * Ghostscript.
 *
 * No modifica el PDF.
 * No ejecuta Ghostscript.
 *
 * @param {Object} pdfInfo Resultado de analizarPdf().
 * @param {Object} profile Perfil obtenido mediante obtenerPerfil().
 *
 * @returns {{
 *   optimize: boolean,
 *   reason: string,
 *   level: string|null,
 *   settings: Object|null
 * }}
 * ============================================================
 */
function obtenerEstrategiaCompresion(pdfInfo, profile) {

    if (!pdfInfo || !profile) {
        return {
            optimize: false,
            reason: "No fue posible determinar la estrategia de compresión.",
            level: null,
            settings: null
        };
    }

    /**
     * Si el PDF ya es pequeño,
     * no vale la pena volver a comprimirlo.
     */
    if (pdfInfo.size <= profile.smallFileLimit) {

        return {
            optimize: false,
            reason: "El PDF ya se encuentra optimizado.",
            level: null,
            settings: null
        };

    }

    /**
     * PDF mediano
     */
    if (pdfInfo.size <= profile.targetSize * 3) {

        return {
            optimize: true,
            reason: "Compresión estándar.",
            level: "medium",
            settings: profile.medium
        };

    }

    /**
     * PDF grande
     */
    if (pdfInfo.size <= profile.targetSize * 8) {

        return {
            optimize: true,
            reason: "Compresión alta.",
            level: "large",
            settings: profile.large
        };

    }

    /**
     * PDF muy grande.
     */
    return {

        optimize: true,

        reason: "Compresión máxima.",

        level: "maximum",

        settings: profile.maximum

    };

}

/**
 * ============================================================
 * Crea las rutas temporales que utilizará Ghostscript.
 *
 * Se generan nombres únicos utilizando crypto.randomUUID()
 * para evitar conflictos cuando múltiples usuarios generan
 * PDFs al mismo tiempo.
 *
 * No crea los archivos físicamente.
 *
 * @param {string} [prefix="pdf"]
 *
 * @returns {{
 *   id: string,
 *   tempDirectory: string,
 *   inputPath: string,
 *   outputPath: string
 * }}
 * ============================================================
 */
function crearArchivosTemporales(prefix = "pdf") {

    const id = crypto.randomUUID();

    const tempDirectory = os.tmpdir();

    return {

        id,

        tempDirectory,

        inputPath: path.join(
            tempDirectory,
            `${prefix}_${id}_input.pdf`
        ),

        outputPath: path.join(
            tempDirectory,
            `${prefix}_${id}_output.pdf`
        )

    };

}

/**
 * ============================================================
 * Guarda el Buffer PDF en un archivo temporal.
 *
 * Esta función únicamente escribe el Buffer recibido en disco.
 * No realiza ninguna optimización.
 *
 * @param {Buffer} pdfBuffer Buffer del PDF.
 * @param {string} inputPath Ruta donde se almacenará temporalmente.
 *
 * @returns {Promise<void>}
 * ============================================================
 */
async function guardarPdfTemporal(pdfBuffer, inputPath) {

    await fs.writeFile(inputPath, pdfBuffer);

    if (PDF_OPTIMIZER_CONFIG.debug) {

        const stats = await fs.stat(inputPath);

        console.info("");

        console.info("📄 PDF temporal creado");

        console.info(`   Ruta : ${inputPath}`);

        console.info(
            `   Tamaño : ${(stats.size / MB).toFixed(2)} MB`
        );

        console.info("");

    }

}

/**
 * ============================================================
 * Ejecuta Ghostscript utilizando la estrategia seleccionada.
 *
 * Esta función únicamente invoca Ghostscript.
 *
 * No compara resultados.
 * No lee el PDF optimizado.
 * No elimina archivos temporales.
 *
 * @param {string} inputPath
 * @param {string} outputPath
 * @param {Object} settings
 *
 * @returns {Promise<{
 *      executionTime:number
 * }>}
 * ============================================================
 */
async function ejecutarGhostscript(
    inputPath,
    outputPath,
    settings
) {

    const startedAt = Date.now();

    const args = [

        "-sDEVICE=pdfwrite",

        "-dCompatibilityLevel=1.4",

        "-dNOPAUSE",

        "-dQUIET",

        "-dBATCH",

        `-dPDFSETTINGS=${settings.pdfSettings}`,

        "-dAutoRotatePages=/None",

        "-dCompressFonts=true",

        "-dSubsetFonts=true",

        "-dEmbedAllFonts=true",

        "-dDetectDuplicateImages=true",

        "-dDownsampleColorImages=true",

        "-dColorImageDownsampleType=/Bicubic",

        `-dColorImageResolution=${settings.imageResolution}`,

        "-dDownsampleGrayImages=true",

        "-dGrayImageDownsampleType=/Bicubic",

        `-dGrayImageResolution=${settings.imageResolution}`,

        "-dDownsampleMonoImages=true",

        "-dMonoImageDownsampleType=/Subsample",

        `-dMonoImageResolution=${settings.imageResolution}`,

        `-sOutputFile=${outputPath}`,

        inputPath

    ];

    if (PDF_OPTIMIZER_CONFIG.debug) {

        console.info("");

        console.info("🚀 Ejecutando Ghostscript...");

        console.info(`   Perfil      : ${settings.pdfSettings}`);

        console.info(`   Resolución  : ${settings.imageResolution} dpi`);

        console.info(`   Entrada     : ${inputPath}`);

        console.info(`   Salida      : ${outputPath}`);

        console.info("");

    }

    try {

        const result = await execFileAsync(

            PDF_OPTIMIZER_CONFIG.ghostscriptExecutable,

            args,

            {

                timeout: PDF_OPTIMIZER_CONFIG.timeoutMs,

                windowsHide: true,

                maxBuffer: 20 * MB

            }

        );

        const executionTime = Date.now() - startedAt;

        if (PDF_OPTIMIZER_CONFIG.debug) {

            console.info("✅ Ghostscript finalizó correctamente.");

            console.info(`   Tiempo : ${executionTime} ms`);

            console.info("");

        }

        return {

            executionTime,

            stdout: result.stdout,

            stderr: result.stderr

        };

    }

    catch (error) {

        throw new Error(

            [

                "Ghostscript no pudo optimizar el PDF.",

                error.message

            ].join("\n")

        );

    }

}

/**
 * ============================================================
 * Lee el PDF generado por Ghostscript.
 *
 * Esta función únicamente carga el archivo optimizado desde
 * disco y devuelve su contenido junto con información básica.
 *
 * @param {string} outputPath
 *
 * @returns {Promise<{
 *      buffer: Buffer,
 *      size: number,
 *      sizeKB: number,
 *      sizeMB: number
 * }>}
 * ============================================================
 */
async function leerPdfOptimizado(outputPath) {

    const buffer = await fs.readFile(outputPath);

    const stats = await fs.stat(outputPath);

    if (PDF_OPTIMIZER_CONFIG.debug) {

        console.info("");

        console.info("📄 PDF optimizado leído");

        console.info(`   Ruta    : ${outputPath}`);

        console.info(
            `   Tamaño : ${(stats.size / MB).toFixed(2)} MB`
        );

        console.info("");

    }

    return {

        buffer,

        size: stats.size,

        sizeKB: Number((stats.size / KB).toFixed(2)),

        sizeMB: Number((stats.size / MB).toFixed(2))

    };

}

/**
 * ============================================================
 * Compara el PDF original contra el PDF optimizado.
 *
 * Esta función determina si la optimización obtenida realmente
 * justifica reemplazar el documento original.
 *
 * Nunca modifica los Buffers.
 *
 * @param {Object} originalInfo Resultado de analizarPdf().
 * @param {Object} optimizedInfo Resultado de leerPdfOptimizado().
 * @param {Object} profile Perfil seleccionado.
 *
 * @returns {{
 *      useOptimized:boolean,
 *      reductionPercent:number,
 *      savedBytes:number,
 *      originalSize:number,
 *      optimizedSize:number,
 *      reason:string
 * }}
 * ============================================================
 */
function validarResultado(
    originalInfo,
    optimizedInfo,
    profile
) {

    const savedBytes =
        originalInfo.size - optimizedInfo.size;

    const reductionPercent = Number(

        (
            (savedBytes / originalInfo.size) * 100
        ).toFixed(2)

    );

    /**
     * Ghostscript produjo un archivo más grande.
     */
    if (savedBytes <= 0) {

        return {

            useOptimized: false,

            reductionPercent: 0,

            savedBytes: 0,

            originalSize: originalInfo.size,

            optimizedSize: optimizedInfo.size,

            reason:
                "El PDF optimizado es más grande que el original."

        };

    }

    /**
     * La reducción obtenida no alcanza el mínimo
     * configurado para el perfil.
     */
    if (
        reductionPercent <
        profile.minimumReductionPercent
    ) {

        return {

            useOptimized: false,

            reductionPercent,

            savedBytes,

            originalSize: originalInfo.size,

            optimizedSize: optimizedInfo.size,

            reason:
                `La reducción (${reductionPercent}%) ` +
                `no supera el mínimo requerido ` +
                `(${profile.minimumReductionPercent}%).`

        };

    }

    /**
     * El PDF optimizado es mejor.
     */
    return {

        useOptimized: true,

        reductionPercent,

        savedBytes,

        originalSize: originalInfo.size,

        optimizedSize: optimizedInfo.size,

        reason:
            "La optimización cumple los criterios del perfil."

    };

}

/**
 * ============================================================
 * Registra en consola las estadísticas de la optimización.
 *
 * Esta función únicamente muestra información cuando el modo
 * debug está habilitado.
 *
 * @param {Object} options
 * ============================================================
 */
function registrarEstadisticas({

    fileName = "Documento.pdf",

    profileName,

    originalInfo,

    optimizedInfo,

    validation,

    executionTime

}) {

    if (!PDF_OPTIMIZER_CONFIG.debug) {
        return;
    }

}


/**
 * ============================================================
 * Elimina los archivos temporales utilizados durante el proceso
 * de optimización.
 *
 * Nunca lanza una excepción.
 *
 * @param {{
 *      inputPath:string,
 *      outputPath:string
 * }} tempFiles
 *
 * @returns {Promise<void>}
 * ============================================================
 */
async function limpiarTemporales(tempFiles = {}) {

    const archivos = [

        tempFiles.inputPath,

        tempFiles.outputPath

    ].filter(Boolean);

    for (const archivo of archivos) {

        try {

            await fs.unlink(archivo);

            if (PDF_OPTIMIZER_CONFIG.debug) {

                console.info(`🗑 Temporal eliminado: ${archivo}`);

            }

        }

        catch (error) {

            /**
             * Si el archivo ya no existe,
             * simplemente continuamos.
             */
            if (error.code === "ENOENT") {
                continue;
            }

            if (PDF_OPTIMIZER_CONFIG.showWarnings) {

                console.warn("");

                console.warn("⚠ No fue posible eliminar un archivo temporal.");

                console.warn(`   Archivo : ${archivo}`);

                console.warn(`   Motivo  : ${error.message}`);

                console.warn("");

            }

        }

    }

}

/**
 * ============================================================
 * Optimiza un documento PDF utilizando Ghostscript.
 *
 * Si ocurre cualquier error durante el proceso,
 * el PDF original será devuelto.
 *
 * @param {Buffer} pdfBuffer
 * @param {{
 *      profile?:string,
 *      fileName?:string
 * }} options
 *
 * @returns {Promise<Buffer>}
 * ============================================================
 */
async function optimizarPdf(
    pdfBuffer,
    options = {}
) {

    /**
     * Si la optimización está deshabilitada
     * simplemente devolvemos el PDF original.
     */
    if (!PDF_OPTIMIZER_CONFIG.enabled) {
        return pdfBuffer;
    }

    const startedAt = Date.now();

    const profileName =
        options.profile ||
        PDF_OPTIMIZER_CONFIG.defaultProfile;

    const fileName =
        options.fileName ||
        "Documento.pdf";

    const profile =
        obtenerPerfil(profileName);

    /**
     * Validar PDF
     */
    const validation =
        validarPdf(pdfBuffer);

    if (!validation.ok) {

        if (PDF_OPTIMIZER_CONFIG.showWarnings) {

            console.warn("");

            console.warn("⚠ PDF Optimizer");

            console.warn(validation.motivo);

            console.warn("");

        }

        return pdfBuffer;

    }

    /**
     * Analizar PDF
     */
    const originalInfo =
        analizarPdf(pdfBuffer);

    /**
     * Determinar estrategia.
     */
    const strategy =
        obtenerEstrategiaCompresion(
            originalInfo,
            profile
        );

    /**
     * No vale la pena optimizar.
     */
    if (!strategy.optimize) {

        if (PDF_OPTIMIZER_CONFIG.debug) {

            console.info("");

            console.info("📄 PDF Optimizer");

            console.info(strategy.reason);

            console.info("");

        }

        return pdfBuffer;

    }

    /**
     * Crear archivos temporales.
     */
    const tempFiles =
        crearArchivosTemporales(profileName);

    try {

        /**
         * Guardar PDF temporal.
         */
        await guardarPdfTemporal(
            pdfBuffer,
            tempFiles.inputPath
        );

        /**
         * Ejecutar Ghostscript.
         */
        const ghostscriptResult =
            await ejecutarGhostscript(

                tempFiles.inputPath,

                tempFiles.outputPath,

                strategy.settings

            );

        /**
         * Leer PDF optimizado.
         */
        const optimizedInfo =
            await leerPdfOptimizado(
                tempFiles.outputPath
            );

        /**
         * Comparar resultados.
         */
        const comparison =
            validarResultado(

                originalInfo,

                optimizedInfo,

                profile

            );

        /**
         * Registrar estadísticas.
         */
        registrarEstadisticas({

            fileName,

            profileName,

            originalInfo,

            optimizedInfo,

            validation: comparison,

            executionTime:
                Date.now() - startedAt

        });

        /**
         * Escoger cuál PDF devolver.
         */
        if (comparison.useOptimized) {

            return optimizedInfo.buffer;

        }

        return pdfBuffer;

    }

    catch (error) {

        if (PDF_OPTIMIZER_CONFIG.showWarnings) {

            console.warn("");

            console.warn("⚠ PDF Optimizer");

            console.warn(error.message);

            console.warn("");

        }

        return pdfBuffer;

    }

    finally {

        await limpiarTemporales(tempFiles);

    }

}

module.exports = {
  optimizarPdf,
  PDF_OPTIMIZER_VERSION
};