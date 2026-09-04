# SST Inspección

Sistema web para registrar, aprobar y consultar inspecciones de **Seguridad y Salud en el Trabajo (SST)** y **Elementos de Protección Personal (EPP)**.

La aplicación administra evidencias fotográficas, genera informes PDF, integra archivos con OneDrive mediante Microsoft Graph y actualiza libros de seguimiento para SST y EPP.

## Funcionalidades principales

### Inspecciones SST

El formulario SST permite inspeccionar:

- Extintores.
- Camillas.
- Señalizaciones.
- Equipos tecnológicos.
- Botiquines y sus insumos.

Cada módulo dispone de campos, calificaciones, validaciones y evidencias propias. Según la sede seleccionada, el formulario puede permitir omitir determinados módulos.

| Valor | Significado |
| --- | --- |
| `B` | Bueno |
| `R` | Regular |
| `M` | Malo |
| `NC` | No contiene |
| `NA` | No aplica |

### Inspecciones EPP

Una inspección EPP puede incluir varios trabajadores. Para cada uno se registra:

- Nombre, código y cargo o labor.
- Elementos EPP asignados desde un catálogo configurable.
- Condición y uso de cada elemento.
- Plan de acción y fecha límite cuando corresponda.
- Observaciones.
- Evidencia fotográfica.

Las calificaciones EPP son `B`, `R`, `M` y `NA`. Cuando la condición o el uso se califican como `R` o `M`, el sistema exige un plan de acción y una fecha límite.

### Aprobaciones

Al registrar una inspección, el inspector queda aprobado automáticamente. El sistema genera enlaces individuales para el Jefe de Área y COPASST.

Cada enlace utiliza un token único. Desde la página de aprobación se puede consultar el resumen, abrir una vista previa del informe y registrar el nombre del aprobador.

Cuando se completan las aprobaciones requeridas, el backend:

1. Recupera los datos y evidencias de la inspección.
2. Genera el informe PDF correspondiente a SST o EPP.
3. Optimiza el PDF cuando la configuración lo permite.
4. Almacena el informe en OneDrive.
5. Envía el correo con el resultado.
6. Actualiza el archivo de seguimiento correspondiente.

### Evidencias y optimización

Los formularios permiten adjuntar múltiples evidencias en los módulos SST y una evidencia por trabajador en EPP.

El frontend incluye un optimizador reutilizable que valida archivos JPEG, PNG y WebP, selecciona una estrategia según el tamaño, redimensiona sin alterar la proporción y conserva el archivo original cuando la optimización no produce una reducción útil o presenta un error.

El backend obtiene y almacena las evidencias mediante Microsoft Graph. También utiliza la fecha disponible en los archivos como respaldo para determinar la fecha de evidencia.

### Informes PDF

Existen generadores independientes para SST y EPP. Los informes incluyen, según el tipo de inspección:

- Información general.
- Elementos inspeccionados o trabajadores evaluados.
- Calificaciones y hallazgos.
- Planes de acción.
- Evidencias.
- Aprobaciones.

La optimización de PDF utiliza Ghostscript y puede configurarse mediante variables de entorno.

### Estadísticas

La aplicación ofrece paneles independientes para SST y EPP con indicadores, filtros, ordenamiento, paginación, recuperación de enlaces de aprobación, vista previa del informe y actualización manual del seguimiento en OneDrive.

### Seguimiento en Excel

El seguimiento SST actualiza un libro existente mediante modificación de su XML interno. Incluye hojas para extintores, camillas, señalizaciones, equipos tecnológicos, botiquines, resumen de inspecciones y tablero General. Durante la actualización se conservan los estilos de la plantilla, se ajustan los rangos de las tablas y se fuerza el recálculo de fórmulas.

El seguimiento EPP genera o actualiza hojas para inspecciones, trabajadores, resultados EPP, planes de acción, resumen consolidado y tablero General.

Los cierres registrados en el Excel EPP pueden sincronizarse nuevamente con PostgreSQL mediante un endpoint protegido. El workflow `.github/workflows/sincronizar-epp.yml` ejecuta esta sincronización.

## Flujo general

```mermaid
flowchart TD
    A[Formulario SST o EPP] --> B[Validación frontend]
    B --> C[Validación backend]
    C --> D[PostgreSQL y evidencias]
    D --> E[Enlaces de aprobación]
    E --> F[Jefe de Área y COPASST]
    F --> G{Aprobaciones completas}
    G -- No --> E
    G -- Sí --> H[Generación y optimización PDF]
    H --> I[OneDrive y correo]
    I --> J[Seguimiento Excel SST o EPP]
```

## Arquitectura

El proyecto utiliza una arquitectura MVC modular.

### Backend

- `src/backend/app.js`: configuración de Express, archivos estáticos y rutas.
- `src/backend/controllers/`: coordinación de solicitudes HTTP y respuestas.
- `src/backend/models/`: consultas PostgreSQL y operaciones transaccionales.
- `src/backend/services/`: PDF, correo, Microsoft Graph y seguimiento Excel.
- `src/backend/validators/`: normalización y reglas de validación SST/EPP.
- `src/backend/middlewares/`: autorización de procesos protegidos.
- `src/backend/utils/`: optimización PDF, fechas, solicitudes y manipulación XML.
- `src/backend/db/`: conexión y migraciones de PostgreSQL.

### Frontend

El frontend utiliza HTML, CSS y JavaScript Vanilla:

- `src/views/html/`: inicio, formularios, aprobación y estadísticas.
- `src/views/css/`: estilos de las vistas.
- `src/views/js/inspeccion-sst.js`: navegación, validación y envío SST.
- `src/views/js/inspeccion-epp.js`: navegación, resumen y envío EPP.
- `src/views/js/trabajadoresEpp.js`: trabajadores, catálogo, planes y evidencias EPP.
- `src/views/js/extintores.js`, `camillas.js`, `senalizaciones.js`, `equiposTecnologicos.js` y `botiquines.js`: módulos SST.
- `src/views/js/aprobar.js`: aprobación común para SST y EPP.
- `src/views/js/estadisticas.js` y `estadisticas-epp.js`: paneles estadísticos.
- `src/views/js/imageOptimizer.js`: optimización de imágenes.
- `src/views/js/shared.js`: datos y utilidades compartidas.

## Tecnologías

- Node.js y Express.
- PostgreSQL mediante `pg`.
- Multer para archivos en memoria.
- PDFKit para informes.
- Ghostscript para optimización de PDF.
- Microsoft Graph para OneDrive y correo.
- ExcelJS y @param {AdmZip} zip para seguimiento Excel.
- `exifr` para metadatos de imágenes.
- HTML5, CSS3, JavaScript ES6+, Fetch, FormData, Canvas API y Flatpickr.

## Estructura principal

```text
sstInspeccion/
├── .github/
│   └── workflows/
│       └── sincronizar-epp.yml
├── src/
│   ├── backend/
│   │   ├── app.js
│   │   ├── controllers/
│   │   ├── db/
│   │   │   └── migrations/
│   │   ├── middlewares/
│   │   ├── models/
│   │   ├── services/
│   │   │   ├── seguimientoEppExcel/
│   │   │   └── seguimientoSstExcel/
│   │   ├── utils/
│   │   └── validators/
│   └── views/
│       ├── css/
│       ├── html/
│       ├── img/
│       └── js/
├── package.json
└── README.md
```

## Base de datos

El proyecto utiliza PostgreSQL o Neon PostgreSQL.

### SST

- `inspecciones`: información general, estado y aprobaciones.
- `extintores`.
- `camillas`.
- `senalizaciones`.
- `equipos_tecnologicos`.
- `botiquines`.
- `botiquin_items`.

### EPP

- `inspecciones`: información general, estado y aprobaciones.
- `evaluaciones_epp`: trabajadores evaluados dentro de la inspección.
- `detalle_evaluacion_epp`: elementos, calificaciones y planes de acción.
- `elementos_epp`: catálogo configurable de EPP.

Las operaciones críticas de registro utilizan transacciones para mantener la consistencia entre la inspección y sus detalles.

## Endpoints principales

### Vistas

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/` | Página principal |
| `GET` | `/inspeccion-sst` | Formulario SST |
| `GET` | `/inspeccion-epp` | Formulario EPP |
| `GET` | `/aprobar/:token` | Página de aprobación |
| `GET` | `/estadisticas` | Dashboard SST |
| `GET` | `/estadisticas-epp` | Dashboard EPP |

### Inspecciones y catálogo

| Método | Ruta | Descripción |
| --- | --- | --- |
| `POST` | `/enviar-onedrive-extintor` | Registra una inspección SST |
| `POST` | `/enviar-inspeccion-epp` | Registra una inspección EPP |
| `GET` | `/api/catalogo-epp` | Obtiene el catálogo EPP |
| `GET` | `/api/catalogo-epp/predeterminados` | Obtiene los EPP predeterminados |
| `GET` | `/api/inspecciones/:id/links` | Recupera enlaces y token de vista previa |

### Aprobaciones y estadísticas

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/api/aprobaciones/:token` | Consulta la inspección asociada con un token |
| `POST` | `/api/aprobaciones/:token` | Registra una aprobación |
| `GET` | `/api/aprobaciones/:token/preview` | Obtiene la vista previa del informe |
| `GET` | `/api/estadisticas/resumen` | Obtiene indicadores SST |
| `GET` | `/api/estadisticas/inspecciones` | Lista inspecciones SST |
| `GET` | `/api/estadisticas-epp/resumen` | Obtiene indicadores EPP |
| `GET` | `/api/estadisticas-epp/inspecciones` | Lista inspecciones EPP |

### Seguimiento Excel

| Método | Ruta | Descripción |
| --- | --- | --- |
| `POST` | `/api/excel/sst/actualizar-onedrive` | Actualiza el seguimiento SST |
| `POST` | `/api/excel/epp/actualizar-onedrive` | Actualiza el seguimiento EPP |
| `POST` | `/api/excel/epp/sincronizar-cierres` | Sincroniza cierres EPP con PostgreSQL |

Los endpoints `/pdf-prueba` y `/enviar-pdf-prueba-correo` se conservan como utilidades de prueba.

## Requisitos e instalación

- Node.js y npm.
- PostgreSQL o Neon PostgreSQL.
- Aplicación registrada en Microsoft Entra ID.
- Usuario y rutas de OneDrive configurados.
- Ghostscript si la optimización PDF está habilitada.

```bash
git clone https://github.com/DuvanBonilla/sstInspeccion.git
cd sstInspeccion
npm install
```

## Variables de entorno

Crea un archivo `.env` en la raíz. No almacenes credenciales reales en el repositorio.

| Variable | Requerida | Descripción |
| --- | --- | --- |
| `DATABASE_URL` | Sí | Conexión PostgreSQL |
| `MS_TENANT_ID` | Sí | Tenant de Microsoft Entra ID |
| `MS_CLIENT_ID` | Sí | Identificador de la aplicación |
| `MS_CLIENT_SECRET` | Sí | Secreto de la aplicación |
| `ONEDRIVE_USER_ID` | Sí | Usuario propietario de los archivos |
| `ONEDRIVE_EXCEL_PATH` | Sí | Ruta del seguimiento SST |
| `ONEDRIVE_EPP_EXCEL_PATH` | Para EPP | Ruta `.xlsx` del seguimiento EPP |
| `ONEDRIVE_EVIDENCIAS_PATH` | Opcional | Ruta base personalizada para evidencias |
| `APP_URL` | Recomendada | URL pública utilizada para construir enlaces |
| `AZURE_EPP_SYNC_SECRET` | Para sincronización | Secreto Bearer del endpoint de cierres EPP |
| `GRAPH_EMAIL_TO_TEST` | Opcional | Destinatario de pruebas de correo |
| `PORT` | Opcional | Puerto HTTP; predeterminado `3000` |
| `GHOSTSCRIPT_PATH` | Opcional | Ruta al ejecutable de Ghostscript |
| `PDF_OPTIMIZE` | Opcional | Usa `false` para desactivar la optimización |
| `PDF_COMPRESSION_PROFILE` | Opcional | Perfil de compresión predeterminado |
| `PDF_OPTIMIZER_TIMEOUT_MS` | Opcional | Tiempo máximo del proceso |
| `PDF_MAX_INPUT_SIZE_MB` | Opcional | Tamaño máximo que se puede optimizar |
| `PDF_OPTIMIZER_DEBUG` | Opcional | Controla los logs del optimizador |
| `PDF_OPTIMIZER_WARNINGS` | Opcional | Controla sus advertencias |

Ejemplo sin credenciales reales:

```dotenv
PORT=3000
APP_URL=http://localhost:3000
DATABASE_URL=postgresql://usuario:clave@servidor:5432/base_datos

MS_TENANT_ID=tenant-id
MS_CLIENT_ID=client-id
MS_CLIENT_SECRET=client-secret
ONEDRIVE_USER_ID=usuario@dominio.com

ONEDRIVE_EXCEL_PATH=/ruta/seguimiento_sst.xlsm
ONEDRIVE_EPP_EXCEL_PATH=/ruta/seguimiento_epp.xlsx
ONEDRIVE_EVIDENCIAS_PATH=/ruta/evidencias

AZURE_EPP_SYNC_SECRET=secreto-compartido
```

## Ejecución

Iniciar el servidor:

```bash
npm start
```

Por defecto queda disponible en `http://localhost:3000`.

Ejecutar la migración configurada:

```bash
npm run migrate
```

Antes de ejecutar migraciones, comprueba que `DATABASE_URL` corresponda al entorno correcto.

## Documentación con JSDoc

JSDoc está instalado como dependencia de desarrollo. Los bloques `/** ... */` de las funciones relevantes pueden convertirse en documentación HTML.

Backend:

```bash
npx jsdoc -r src/backend -d docs/backend
```

Frontend:

```bash
npx jsdoc -r src/views/js -d docs/frontend
```

Toda la documentación JavaScript:

```bash
npx jsdoc -r src/backend src/views/js -d docs
```

Abrir el resultado:

- Windows: `start docs/index.html`
- Linux: `xdg-open docs/index.html`
- macOS: `open docs/index.html`

La carpeta `docs/` es un artefacto generado y puede reconstruirse en cualquier momento.

## Optimización de PDF

Verificar Ghostscript:

```bash
# Linux
gs --version
```

```powershell
# Windows
gswin64c --version
where.exe gswin64c
```

Si Ghostscript no está en el `PATH`, configura `GHOSTSCRIPT_PATH`.

## Seguridad

- Las credenciales se cargan mediante variables de entorno.
- Las consultas PostgreSQL utilizan parámetros.
- Los datos se validan en frontend y backend.
- Las aprobaciones utilizan tokens individuales.
- La sincronización de cierres EPP exige un secreto Bearer.
- Las operaciones críticas utilizan transacciones.

No publiques archivos `.env`, secretos de Microsoft Graph ni cadenas de conexión.

## Solución de problemas

### PostgreSQL no conecta

Verifica `DATABASE_URL`, las credenciales, la disponibilidad del servidor y la configuración SSL.

### Microsoft Graph u OneDrive falla

Verifica las credenciales `MS_*`, `ONEDRIVE_USER_ID`, las rutas configuradas y los permisos de la aplicación.

### El Excel está bloqueado

Cierra el libro en Excel o OneDrive y vuelve a intentar cuando el recurso deje de estar bloqueado.

### Las fórmulas SST no se actualizan

Abre el archivo con una aplicación compatible con recálculo. El servicio elimina valores anteriores y configura el libro para recalcular al abrirse.

### Ghostscript no está disponible

Instálalo, configura `GHOSTSCRIPT_PATH` o desactiva la optimización mediante `PDF_OPTIMIZE=false`.

### Un enlace de aprobación falla

Comprueba que el token exista, corresponda con la inspección esperada y no haya sido utilizado previamente.

## Mantenimiento

1. Identifica si el cambio corresponde a SST, EPP o código compartido.
2. Verifica las validaciones en frontend y backend.
3. Prueba las aprobaciones cuando cambien controladores, modelos, PDF o correo.
4. Prueba ambos módulos cuando se modifiquen servicios compartidos.
5. Comprueba el Excel después de cambiar modelos, XML, columnas o fórmulas.
6. Regenera JSDoc cuando cambien funciones documentadas.

## Estado actual

- Formularios independientes para SST y EPP.
- Catálogo configurable de EPP.
- Evidencias múltiples en SST y por trabajador en EPP.
- Validaciones específicas por módulo.
- Aprobaciones mediante tokens.
- PDF y correo al completar las aprobaciones.
- Optimización de imágenes y PDF.
- Integración con PostgreSQL, Microsoft Graph y OneDrive.
- Dashboards SST y EPP.
- Seguimientos Excel independientes.
- Sincronización de cierres EPP desde Excel hacia PostgreSQL.
- Documentación de funciones mediante JSDoc.

## Versión

- Aplicación: `1.0.0`.
- Rama documentada: `main`.
- Referencia revisada: commit `4263941` (`feature: JSDoc`).
- Última actualización del README: septiembre de 2026.
