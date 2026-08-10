# SST_INSPECCION

Sistema web para la gestión y registro de inspecciones de Seguridad y Salud en el Trabajo (SST).

## Descripción general

Esta aplicación centraliza el registro de inspecciones SST, el almacenamiento de evidencias en OneDrive y la gestión de aprobaciones para tres roles: Inspector, Jefe de Área y COPASST.

El frontend se ejecuta como una aplicación estática servida por Express. El backend valida los datos, guarda la inspección en Neon (Postgres), sube las fotos de evidencia a OneDrive, genera un PDF y envía notificaciones por correo cuando todas las aprobaciones están completas.

## Objetivo del proyecto

Proveer una solución de inspección SST que:
- capture datos generales y detalles de cada sección (extintores, camillas, señalizaciones, equipos tecnológicos, botiquines),
- almacene la inspección en una base de datos normalizada,
- guarde la evidencia binaria en OneDrive,
- preserve un flujo de aprobación distribuido entre niveles de responsabilidad,
- genere y entregue un informe final en PDF.

## Problema que resuelve

El proyecto resuelve la necesidad de documentar inspecciones SST de forma estructurada, permitiendo:
- envío de evidencia fotográfica,
- trazabilidad de aprobaciones sin firma manuscrita / biométrica,
- centralización de datos en Postgres,
- generación de PDF y archivo final en OneDrive,
- notificación por correo automático al completar el circuito de aprobaciones.

## Arquitectura general

La aplicación sigue un patrón MVC ligero:
- `app.js` expone rutas HTTP y sirve archivos estáticos.
- Los controladores (`controllers/`) manejan la entrada de las rutas y delegan a los modelos.
- Los modelos (`models/`) validan payloads, acceden a la base de datos y comunican con Microsoft Graph.
- El frontend estático (`views/`) implementa el formulario, la experiencia de aprobación y el dashboard.

---

# Tecnologías utilizadas

- Backend: Node.js, Express 5
- Frontend: HTML, CSS, JavaScript (módulos ES)
- Base de datos: PostgreSQL (Neon)
- ORM: No usa ORM; usa `pg` con consultas SQL directas
- Framework: Express
- Lenguaje: JavaScript
- Herramientas:
  - `dotenv` para variables de entorno
  - `multer` para parsing multipart/form-data
  - `pdfkit` para generación de PDF
  - `exifr` para lectura de metadatos EXIF
  - `pg` para conexión a Postgres
  - `playwright` está presente en `package.json` pero no se utiliza en el código de servidor/cliente actual

---

# Requisitos

- Node: v18 o superior
- npm: v9 o superior
- Base de datos PostgreSQL accesible desde la aplicación (`DATABASE_URL`)
- Cuenta y permisos de Microsoft 365 / Azure para Graph API:
  - `Mail.Send`
  - `Files.ReadWrite`


---

# Instalación

1. Clona el repositorio usando la URL correcta de tu proyecto:

```bash
git clone <repo-url>
cd sstInspeccion
```

> Nota: la URL de clonación no pudo determinarse automáticamente desde este análisis.

2. Instala dependencias:

```bash
npm install
```

3. Configura variables de entorno en un archivo `.env` en la raíz.

4. Ejecuta migraciones para crear el esquema en Neon/Postgres:

```bash
npm run migrate
```

5. Inicia el servidor:

```bash
npm start
```

---

# Variables de entorno

| Nombre | Descripción | Ejemplo | Obligatoria |
|--------|-------------|---------|-------------|
| `DATABASE_URL` | Cadena de conexión a Neon/Postgres usada por `pg` | `postgresql://user:pass@host:5432/db?sslmode=require` | Sí |
| `MS_TENANT_ID` | Tenant ID de Azure AD para autenticación Microsoft Graph | `2f222215-b158-4d99-b1fa-ecab65ba97aa` | Sí |
| `MS_CLIENT_ID` | Client ID de la aplicación registrada en Azure AD | `bf22dba8-2118-4fd4-b989-d9730886a7a2` | Sí |
| `MS_CLIENT_SECRET` | Client secret de Azure AD para el flujo client_credentials | `******` | Sí |
| `ONEDRIVE_USER_ID` | Usuario de OneDrive / Microsoft Graph que almacena evidencias y PDFs | `correo@empresa.com` | Sí |
| `ONEDRIVE_EXCEL_PATH` | Ruta del archivo Excel en OneDrive usada para derivar la carpeta de evidencias | `/PRUEBA_INSPECCION_EXTINTORES/inspeccion_sst.xlsm` | Sí |
| `GRAPH_EMAIL_TO_TEST` | Correo de fallback cuando la sede no resuelve un destinatario automático | `correo@ejemplo.com` | No |
| `PORT` | Puerto en el que arranca el servidor Express | `3000` | No |
| `ONEDRIVE_EVIDENCIAS_PATH` | Ruta alternativa de carpeta de evidencias en OneDrive | `/EVIDENCIAS` | No |
| `APP_URL` | URL pública usada por el dashboard para reconstruir enlaces de aprobación | `https://mi-app.com` | No |

---

# Ejecución

- `npm start`: inicia el servidor en `src/backend/app.js`.
- `npm run migrate`: ejecuta el script de migración de esquema en `src/backend/db/migrate.js`.

## Modo desarrollo

El proyecto no incluye un script de watch o `dev` configurado. Use `npm start` después de instalar dependencias.

## Modo producción

Se ejecuta con `npm start`. Asegúrate de que las variables de entorno estén configuradas y que la base de datos sea accesible.

---

# Rutas disponibles

## Páginas públicas

- `GET /` — Página de inicio.
- `GET /inspeccion-sst` — Formulario completo de inspección SST.
- `GET /aprobar/:token` — Página de aprobación para Jefe de Área / COPASST.
- `GET /estadisticas` — Panel de estadísticas.

## API de inspección y aprobación

- `POST /enviar-onedrive-extintor` — Guarda la inspección en Neon, sube evidencias a OneDrive y devuelve los links de aprobación.
- `POST /pdf-prueba` — Genera un PDF de prueba de la inspección y devuelve el archivo.
- `POST /enviar-pdf-prueba-correo` — Genera el PDF y lo envía por correo.
- `GET /api/aprobaciones/:token` — Devuelve el resumen de la inspección para el rol del token.
- `GET /api/aprobaciones/:token/preview` — Genera una vista previa del PDF de la inspección con estado actual.
- `POST /api/aprobaciones/:token` — Registra la aprobación de nombre para el rol correspondiente.

## API de estadísticas

- `GET /api/estadisticas/resumen` — KPIs y distribución por sede.
- `GET /api/estadisticas/inspecciones` — Listado paginado de inspecciones con filtros.

## API de recuperación de enlaces

- `GET /api/inspecciones/:id/links` — Recupera los links de aprobación y preview para una inspección existente.

---

# Estructura del proyecto

SSTINSPECCION/
│
├── .claude/
│   └── launch.json
│
├── node_modules/
│
├── src/
│   │
│   ├── backend/
│   │   ├── controllers/
│   │   ├── db/
│   │   ├── models/
│   │   └── utils/
│   │
│   ├── app.js
│   │
│   └── views/
│       ├── css/
│       ├── html/
│       ├── img/
│       └── js/
│
├── .env
├── .gitignore
├── package-lock.json
├── package.json
└── README.md

# Flujo general del sistema

1. El usuario abre `/inspeccion-sst` y completa el formulario dividido en secciones.
2. Al enviar, el frontend envía `POST /enviar-onedrive-extintor` con el payload JSON y las fotos.
3. El backend valida los datos, sube las fotos a OneDrive y guarda la inspección en Neon.
4. El Inspector queda aprobado automáticamente. Se generan links únicos para Jefe de Área y COPASST.
5. Cada responsable visita `/aprobar/:token`, ingresa su nombre y aprueba.
6. Cuando las 3 aprobaciones están completas, el backend regenera el PDF final, lo archiva en OneDrive y envía un correo de notificación.
7. El dashboard en `/estadisticas` permite consultar el estado de las inspecciones y recuperar links cuando sea necesario.

---

# Dependencias entre módulos

- `app.js` → registra rutas y referencia controladores.
- Controladores → delegan validación y persistencia a modelos.
- `inspeccion.controller.js` → usa `inspeccion.model.js` para validación, subida de evidencias y guardado.
- `aprobaciones.controller.js` → usa `aprobaciones.model.js` para estado de aprobación y `inspeccion.model.js` para regenerar datos completos.
- `pdfInspeccion.controller.js` → genera PDF y envía correo, tanto para preview como para el cierre del flujo.
- `views/js/` → frontend dinámico que alimenta `app.js` mediante las rutas y APIs expuestas.

---

# Buenas prácticas del proyecto

- Separación clara entre controladores HTTP y lógica de negocio/modelo.
- Validación de payload en el backend antes de persistir.
- Normalización de datos de formulario en modelos específicos por sección.
- Uso de transacciones para garantizar la integridad al guardar inspecciones completas.
- Uso de OneDrive para binarios y Postgres para datos estructurados.
- Comentarios en el código para describir módulos y responsabilidades.

---

# Scripts disponibles

- `npm start`: inicia el servidor Express.
- `npm run migrate`: crea o actualiza el esquema de la base de datos.

---

# Notas importantes

- No hay pruebas automatizadas configuradas.
- El backend depende de que el entorno de Node disponga de `fetch` global (Node 18+).
- Solo se debe subir `.env` en entornos locales seguros; no se debe versionar.
- Aunque el proyecto contiene `nodemailer` y `playwright` en `package.json`, el flujo de correo actual usa Microsoft Graph API directamente.
