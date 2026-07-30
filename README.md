# SST_INSPECCION

Sistema web para la gestión y registro de inspecciones de Seguridad y Salud en el Trabajo (SST). Permite diligenciar formularios de inspección (extintores, camillas, señalización, equipos tecnológicos y botiquines) en 7 pasos (el último es un resumen final antes de enviar), recolectar la aprobación de 3 responsables (Inspector, Jefe de Área, COPASST) — nombre y cédula, sin firma manuscrita/biométrica por restricción legal — y generar y enviar por correo el PDF final, con copia archivada en OneDrive. El Inspector (quien diligencia el formulario) queda aprobado automáticamente con los datos de la info general; solo Jefe de Área y COPASST reciben un link individual para aprobar.

La inspección completa (datos generales + secciones + estado de las 3 aprobaciones) se guarda normalizada en **Neon (Postgres)**: una tabla por sección (extintores, camillas, señalizaciones, equipos tecnológicos, botiquines), todas con llave foránea a la inspección. OneDrive queda solo para binarios: las fotos de evidencia y la copia final del PDF.

## Tecnologías

- **Node.js** + **Express 5** — servidor HTTP y rutas
- **Multer** — recepción de archivos (evidencias fotográficas)
- **PDFKit** — generación de PDFs
- **Neon (Postgres)** + **pg** — almacenamiento de la inspección y estado de aprobaciones
- **Microsoft Graph API** — envío de correos y almacenamiento de evidencias/PDF en OneDrive
- **exifr** — extracción de metadatos EXIF de las fotos (fecha de toma)
- **dotenv** — variables de entorno

## Requisitos previos

- **Node.js v18 o superior** — [descargar en nodejs.org](https://nodejs.org)
- **npm v9 o superior** (viene incluido con Node.js)
- Cuenta de **Microsoft 365 / Azure** con permisos de Graph API configurados (`Mail.Send`, `Files.ReadWrite`)
- Base de datos en **[Neon](https://neon.tech)** (plan free es suficiente)

## Instalación

```bash
# 1. Clonar el repositorio
git clone https://github.com/usuario/sstInspeccion
cd SST_INSPECCION-

# 2. Instalar dependencias (OBLIGATORIO antes de iniciar)
npm install
```

> `npm install` descarga todos los paquetes del proyecto de una sola vez. Sin este paso el servidor no arranca.

## Variables de entorno

Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

```env
# Neon (Postgres) — inspecciones y estado de aprobaciones
DATABASE_URL=postgresql://usuario:password@ep-xxxx.aws.neon.tech/nombrebd?sslmode=require

# Azure AD — autenticación Microsoft Graph
MS_TENANT_ID=tu_tenant_id
MS_CLIENT_ID=tu_client_id
MS_CLIENT_SECRET=tu_client_secret

# OneDrive (solo se usa para archivar evidencias y el PDF final)
ONEDRIVE_USER_ID=correo@empresa.com
ONEDRIVE_EXCEL_PATH=/CARPETA/archivo.xlsm

# Correo destinatario de prueba (fallback si la sede no coincide)
GRAPH_EMAIL_TO_TEST=correo@ejemplo.com

# Puerto del servidor (opcional, por defecto 3000)
PORT=3000
```

> **Importante:** Nunca subas el archivo `.env` al repositorio. Ya está incluido en `.gitignore`. Al desplegar (por ejemplo en Render), estas mismas variables hay que agregarlas manualmente en la configuración del servicio — el `.env` local no se sube ni se lee en producción.

Las credenciales de Azure (`MS_TENANT_ID`, `MS_CLIENT_ID`, `MS_CLIENT_SECRET`) se obtienen desde el [portal de Azure](https://portal.azure.com) en **Registros de aplicaciones**. `DATABASE_URL` se obtiene del panel de [Neon](https://neon.tech) al crear el proyecto. Antes de arrancar el servidor por primera vez, corre `npm run migrate` para crear la tabla `inspecciones` en Neon.

## Ejecución

```bash
npm run migrate   # solo la primera vez (crea la tabla inspecciones en Neon)
npm start
```

El servidor quedará disponible en `http://localhost:3000`

## Rutas disponibles

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/` | Pantalla de inicio |
| GET | `/inspeccion-sst` | Formulario de inspección SST |
| GET | `/aprobar/:token` | Página de aprobación (Jefe de Área / COPASST — el Inspector no usa link, queda aprobado al guardar) |
| POST | `/enviar-onedrive-extintor` | Guarda la inspección en Neon + evidencias en OneDrive; aprueba al Inspector automáticamente y devuelve los links de Jefe y COPASST |
| POST | `/pdf-prueba` | Genera y descarga el PDF de la inspección (vista previa, sin aprobar) |
| POST | `/enviar-pdf-prueba-correo` | Genera el PDF y lo envía por correo (uso manual) |
| GET | `/api/aprobaciones/:token` | Resumen de la inspección para el rol dueño del token |
| POST | `/api/aprobaciones/:token` | Guarda la aprobación; si completa las 3, archiva el PDF final y envía el correo |

## Estructura del proyecto

```
SST_INSPECCION-/
├── src/
│   ├── backend/                         # Todo el servidor (Modelo + Controlador)
│   │   ├── app.js                       # Punto de entrada del servidor
│   │   ├── db/
│   │   │   ├── pool.js                  # Conexión a Neon (Postgres)
│   │   │   └── migrate.js               # Crea/actualiza el esquema en Neon
│   │   ├── controllers/
│   │   │   ├── inspeccion.controller.js    # Guarda la inspección (Neon + evidencias OneDrive)
│   │   │   ├── pdfInspeccion.controller.js # Generación de PDF y envío de correo
│   │   │   └── aprobaciones.controller.js  # Aprobación y envío final tras las 3 aprobaciones
│   │   ├── models/                      # Validación/normalización por sección + acceso a datos (Neon/OneDrive)
│   │   └── utils/                       # Utilidades compartidas (fecha de evidencia)
│   └── views/                           # Frontend estático (Vista): HTML, CSS, JS, imágenes
├── .env                                  # Variables de entorno (NO subir al repo)
├── .gitignore
├── package.json
└── package-lock.json
```
