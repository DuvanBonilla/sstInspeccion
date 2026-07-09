# SST_INSPECCION

Sistema web para la gestión y registro de inspecciones de Seguridad y Salud en el Trabajo (SST). Permite diligenciar formularios de inspección (extintores, camillas, señalización, equipos tecnológicos y botiquines), generar PDFs del informe y enviarlo automáticamente por correo con copia en OneDrive.

## Tecnologías

- **Node.js** + **Express 5** — servidor HTTP y rutas
- **Multer** — recepción de archivos (evidencias fotográficas)
- **PDFKit** — generación de PDFs
- **Microsoft Graph API** — envío de correos y almacenamiento en OneDrive
- **exifr** — extracción de metadatos EXIF de las fotos (fecha de toma)
- **dotenv** — variables de entorno

## Requisitos previos

- **Node.js v18 o superior** — [descargar en nodejs.org](https://nodejs.org)
- **npm v9 o superior** (viene incluido con Node.js)
- Cuenta de **Microsoft 365 / Azure** con permisos de Graph API configurados (`Mail.Send`, `Files.ReadWrite`)
- Archivo **Excel (.xlsm)** existente en OneDrive con las tablas nombradas correctamente

## Instalación

```bash
# 1. Clonar el repositorio
git clone https://github.com/HEYDY116/SST_INSPECCION-.git
cd SST_INSPECCION-

# 2. Instalar dependencias (OBLIGATORIO antes de iniciar)
npm install
```

> `npm install` descarga todos los paquetes del proyecto de una sola vez. Sin este paso el servidor no arranca.

## Variables de entorno

Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

```env
# Azure AD — autenticación Microsoft Graph
MS_TENANT_ID=tu_tenant_id
MS_CLIENT_ID=tu_client_id
MS_CLIENT_SECRET=tu_client_secret

# OneDrive
ONEDRIVE_USER_ID=correo@empresa.com
ONEDRIVE_EXCEL_PATH=/CARPETA/archivo.xlsm

# Nombres de las tablas en el Excel de OneDrive
ONEDRIVE_TABLE_NAME=TablaExtintores
ONEDRIVE_TABLE_NAME_CAMILLA=TablaCamilla
ONEDRIVE_TABLE_NAME_SENALIZACION=TablaSeñalizacion
ONEDRIVE_TABLE_NAME_EQUIPO_TECNOLOGICO=TablaEquipo_T.A.D.E
ONEDRIVE_TABLE_NAME_BOTIQUIN=TablaBotiquin

# Correo destinatario de prueba (fallback si la sede no coincide)
GRAPH_EMAIL_TO_TEST=correo@ejemplo.com

# Puerto del servidor (opcional, por defecto 3000)
PORT=3000
```

> **Importante:** Nunca subas el archivo `.env` al repositorio. Ya está incluido en `.gitignore`.

Las credenciales de Azure (`MS_TENANT_ID`, `MS_CLIENT_ID`, `MS_CLIENT_SECRET`) se obtienen desde el [portal de Azure](https://portal.azure.com) en **Registros de aplicaciones**.

## Ejecución

```bash
npm start
```

El servidor quedará disponible en `http://localhost:3000`

## Rutas disponibles

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/` | Pantalla de inicio |
| GET | `/inspeccion-sst` | Formulario de inspección SST |
| POST | `/enviar-onedrive-extintor` | Guarda la inspección en OneDrive (Excel + imágenes) |
| POST | `/pdf-prueba` | Genera y descarga el PDF de la inspección |
| POST | `/enviar-pdf-prueba-correo` | Genera el PDF y lo envía por correo |

## Estructura del proyecto

```
SST_INSPECCION-/
├── src/
│   ├── app.js                          # Punto de entrada del servidor
│   ├── controllers/
│   │   ├── inspeccion.controller.js    # Lógica OneDrive / Excel
│   │   └── pdfInspeccion.controller.js # Generación de PDF y envío de correo
│   ├── models/                         # Estructuras de datos por sección
│   └── views/                          # Frontend estático (HTML, CSS, JS, imágenes)
├── .env                                # Variables de entorno (NO subir al repo)
├── .gitignore
├── package.json
└── package-lock.json
```
