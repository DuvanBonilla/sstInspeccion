# SST Inspección

Sistema web para la gestión de inspecciones de **Seguridad y Salud en el Trabajo (SST)** y **Elementos de Protección Personal (EPP)**.

La aplicación permite registrar inspecciones, almacenar evidencias fotográficas, gestionar aprobaciones, generar informes PDF, consultar estadísticas y almacenar archivos en OneDrive mediante Microsoft Graph.

---

## Funcionalidades principales

### Inspecciones SST

El módulo SST permite realizar inspecciones de diferentes elementos relacionados con Seguridad y Salud en el Trabajo.

Actualmente incluye:

- Extintores.
- Camillas.
- Señalizaciones.
- Equipos tecnológicos.
- Botiquines.

Cada sección cuenta con sus propios campos, validaciones y evidencias.

Las inspecciones almacenan información general como:

- Fecha.
- Sede operacional.
- Área de trabajo.
- Jefe responsable.
- Cargo del jefe.
- Responsable de la inspección.
- Cargo del responsable.

---

### Inspecciones EPP

El módulo EPP permite realizar inspecciones de Elementos de Protección Personal por trabajador.

Una misma inspección puede contener múltiples trabajadores.

Para cada trabajador se registra:

- Nombre.
- Código.
- Cargo o labor.
- Evaluación de los elementos EPP.
- Plan de acción cuando corresponde.
- Fecha límite del plan de acción.
- Observaciones.
- Evidencia fotográfica.

#### Elementos evaluados

Actualmente se evalúan:

1. Dotación.
2. Botas de seguridad.
3. Casco.
4. Tafilete.
5. Guantes patio.
6. Guantes fríos.
7. Guantes de vaqueta.
8. Gafas claras.
9. Gafas oscuras.
10. Barbuquejo.
11. Guantes de lavado.

Cada elemento se evalúa en:

- **Condición**
- **Uso**

Las calificaciones disponibles son:

| Valor | Significado |
|---|---|
| B | Bueno |
| R | Regular |
| M | Malo |
| NA | No aplica |

Cuando un elemento presenta una calificación **R** o **M** en condición o uso, el sistema exige registrar un **plan de acción** y una **fecha límite**.

Las observaciones son opcionales.

---

### Evidencias

Las inspecciones permiten adjuntar fotografías como evidencia.

Las imágenes son validadas y optimizadas antes de ser enviadas al servidor para reducir su tamaño.

En EPP, las evidencias se relacionan individualmente con cada trabajador.

Los archivos se almacenan en OneDrive y su información se conserva en PostgreSQL para poder recuperarlos posteriormente.

---

### Aprobaciones

El sistema dispone de un módulo de aprobaciones mediante enlaces identificados con tokens únicos.

Las aprobaciones almacenan información como:

- Nombre del aprobador.
- Cédula.
- Fecha y hora de aprobación.

Desde la pantalla de aprobación también es posible consultar una vista previa del informe correspondiente.

Una vez cumplidas las aprobaciones requeridas, el sistema genera el informe final de la inspección.

---

### Informes PDF

El proyecto cuenta con generadores independientes para:

- Informes SST.
- Informes EPP.

Los informes pueden incluir:

- Información general.
- Resultados de la inspección.
- Evaluaciones.
- Evidencias.
- Planes de acción.
- Fechas límite.
- Observaciones.
- Información de aprobación.

Los PDF finales pueden ser optimizados mediante Ghostscript antes de ser almacenados y enviados.

---

### Estadísticas

El sistema cuenta con paneles independientes para:

- Estadísticas SST.
- Estadísticas EPP.

Los paneles consultan información almacenada en PostgreSQL y permiten visualizar información general y aplicar los filtros disponibles en cada módulo.

---

### OneDrive y Microsoft Graph

Microsoft Graph es utilizado para las funciones relacionadas con Microsoft 365.

Actualmente permite:

- Autenticación mediante credenciales de aplicación.
- Almacenamiento de evidencias.
- Recuperación de archivos.
- Almacenamiento de informes PDF.
- Envío de correos electrónicos.

Las credenciales y configuraciones se administran mediante variables de entorno.

---

## Arquitectura

El proyecto utiliza una arquitectura web tradicional.

### Backend

Desarrollado con **Node.js y Express**.

La lógica se distribuye principalmente entre:

- `controllers/` — Controladores de inspecciones, aprobaciones, estadísticas y PDF.
- `models/` — Acceso a datos, validaciones y operaciones relacionadas con las inspecciones.
- `db/` — Configuración y conexión con PostgreSQL.
- `utils/` — Funciones auxiliares utilizadas por diferentes módulos.
- `app.js` — Configuración principal del servidor y rutas.

### Frontend

Desarrollado con:

- HTML.
- CSS.
- JavaScript Vanilla.

No se utiliza un framework frontend.

Las vistas y scripts se encuentran organizados dentro de `src/views`.

---

## Tecnologías utilizadas

### Backend

- Node.js.
- Express.js.
- PostgreSQL.
- `pg`.
- Multer.
- PDFKit.
- dotenv.
- exifr.
- Microsoft Graph.
- Ghostscript.

### Frontend

- HTML5.
- CSS3.
- JavaScript ES6+.
- FormData.
- Canvas API.

---

## Estructura del proyecto

```text
sstInspeccion/
│
├── README.md
├── package.json
├── package-lock.json
│
└── src/
    ├── backend/
    │   ├── app.js
    │   │
    │   ├── controllers/
    │   │   ├── inspeccion.controller.js
    │   │   ├── inspeccionEpp.controller.js
    │   │   ├── aprobaciones.controller.js
    │   │   ├── estadisticas.controller.js
    │   │   ├── pdfInspeccion.controller.js
    │   │   
    │   │
    │   ├── models/
    │   ├── db/
    │   └── utils/
    │
    └── views/
        ├── html/
        ├── css/
        ├── img/
        └── js/
            ├── inspeccion-sst.js
            ├── inspeccion-epp.js
            ├── trabajadoresEpp.js
            ├── estadisticas.js
            ├── estadisticas-epp.js
            ├── aprobar.js
            ├── imageOptimizer.js
            └── shared.js
```

La estructura anterior muestra los componentes principales del proyecto y puede omitir archivos auxiliares.

---

## Base de datos

El proyecto utiliza **PostgreSQL** para almacenar la información de las inspecciones.

### Tabla principal

La tabla:

```text
inspecciones
```

almacena la información general de cada inspección, incluyendo:

- Identificación.
- Número de inspección.
- Tipo de inspección.
- Información general.
- Estado.
- Información relacionada con aprobaciones.
- Tokens.
- Fechas de aprobación.
- Información del PDF final.

### Tablas SST

Las principales tablas utilizadas por SST incluyen:

```text
extintores
camillas
senalizaciones
equipos_tecnologicos
botiquines
botiquin_items
```

Estas tablas mantienen relación con la inspección correspondiente.

### Tablas EPP

El módulo EPP utiliza principalmente:

```text

evaluaciones_epp
```

#### `trabajadores_epp`

Almacena la información de cada trabajador inspeccionado:

- Nombre.
- Código.
- Cargo.
- Plan de acción.
- Fecha del plan de acción.
- Observaciones.
- Información de evidencia.

#### `evaluaciones_epp`

Almacena las evaluaciones realizadas a los elementos EPP de cada trabajador:

- Elemento.
- Condición.
- Uso.

---

## Endpoints principales

### Páginas

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/` | Página principal |
| GET | `/inspeccion-sst` | Formulario SST |
| GET | `/inspeccion-epp` | Formulario EPP |
| GET | `/aprobar/:token` | Página de aprobación |
| GET | `/estadisticas` | Estadísticas SST |
| GET | `/estadisticas-epp` | Estadísticas EPP |

### Inspecciones

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/enviar-onedrive-extintor` | Registra una inspección SST |
| POST | `/enviar-inspeccion-epp` | Registra una inspección EPP |

### Aprobaciones

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/aprobaciones/:token` | Consulta información para una aprobación |
| POST | `/api/aprobaciones/:token` | Registra una aprobación |
| GET | `/api/aprobaciones/:token/preview` | Obtiene la vista previa del informe |

### Estadísticas SST

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/estadisticas/resumen` | Obtiene resumen SST |
| GET | `/api/estadisticas/inspecciones` | Lista inspecciones SST |

### Estadísticas EPP

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/estadisticas-epp/resumen` | Obtiene resumen EPP |
| GET | `/api/estadisticas-epp/inspecciones` | Lista inspecciones EPP |

---

## Requisitos

Para ejecutar el proyecto se requiere:

- Node.js.
- npm.
- PostgreSQL o Neon.
- Ghostscript.
- Acceso a Microsoft Graph.
- Aplicación registrada en Microsoft Entra ID / Azure AD.
- Usuario de OneDrive configurado.
- Navegador web moderno.

---

## Instalación

### 1. Clonar el repositorio

```bash
git clone <repository-url>
cd sstInspeccion
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Crear un archivo `.env` en la raíz del proyecto con las variables requeridas.

No almacenar credenciales reales directamente en el repositorio.

### 4. Preparar la base de datos

Cuando sea necesario crear o actualizar la estructura configurada por el proyecto:

```bash
npm run migrate
```

Antes de ejecutar migraciones sobre producción, verificar que `DATABASE_URL` corresponda al entorno correcto.

### 5. Iniciar el servidor

```bash
npm start
```

---

## Variables de entorno

Entre las principales variables utilizadas se encuentran:

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Cadena de conexión PostgreSQL |
| `MS_TENANT_ID` | Tenant de Microsoft |
| `MS_CLIENT_ID` | Identificador de la aplicación |
| `MS_CLIENT_SECRET` | Secreto de la aplicación |
| `ONEDRIVE_USER_ID` | Usuario utilizado para OneDrive |
| `ONEDRIVE_EXCEL_PATH` | Ruta configurada para recursos de OneDrive |
| `PORT` | Puerto utilizado por el servidor |

Pueden existir variables adicionales dependiendo del entorno y de la configuración utilizada.

Los valores reales de credenciales y secretos no deben almacenarse en este archivo.

---

## Ejecución

Instalar las dependencias:

```bash
npm install
```

Iniciar el servidor:

```bash
npm start
```

Ejecutar la migración configurada:

```bash
npm run migrate
```

---

## Optimización de imágenes

El proyecto incluye `imageOptimizer.js` para procesar las imágenes desde el navegador antes de enviarlas.

Su función principal es:

- Validar imágenes.
- Redimensionarlas cuando sea necesario.
- Reducir su peso.
- Prepararlas para su envío al backend.

---

## Optimización de PDF

Los informes finales pueden ser optimizados mediante Ghostscript.

Para verificar su instalación:

### Windows

```powershell
gswin64c --version
where.exe gswin64c
```

### Linux

```bash
gs --version
```

Ghostscript debe estar disponible desde el entorno donde se ejecuta Node.js.

---

## Seguridad

El proyecto utiliza diferentes mecanismos para proteger la información y mantener la consistencia de los datos:

- Variables de entorno para credenciales.
- Consultas PostgreSQL parametrizadas.
- Validaciones frontend.
- Validaciones backend.
- Tokens individuales para aprobaciones.
- Transacciones de base de datos en operaciones críticas.

Las credenciales, secretos y cadenas de conexión no deben incluirse en el repositorio.

---

## Solución de problemas

### Error de conexión PostgreSQL

Verificar:

- `DATABASE_URL`.
- Credenciales.
- Disponibilidad del servidor.
- Configuración SSL cuando corresponda.

### Error de OneDrive

Verificar:

- Credenciales de Microsoft Graph.
- `ONEDRIVE_USER_ID`.
- Configuración de las rutas.
- Permisos de la aplicación.

### Ghostscript no encontrado

Comprobar que Ghostscript se encuentre instalado y disponible en el `PATH` del sistema.

En Windows:

```powershell
where.exe gswin64c
```

### Error de aprobación

Verificar:

- Que el token exista.
- Estado de la inspección.
- Que la aprobación no haya sido registrada anteriormente.
- Conexión con PostgreSQL.

### Error generando PDF

Verificar:

- Disponibilidad de evidencias.
- Acceso a OneDrive.
- Instalación de Ghostscript.
- Logs del servidor.

---

## Mantenimiento

Al modificar el proyecto se recomienda:

1. Identificar si el cambio corresponde a SST, EPP o un componente compartido.
2. Evitar modificar SST cuando se desarrollen funcionalidades exclusivas de EPP.
3. Verificar las dependencias entre frontend, controladores y modelos.
4. Probar ambos módulos cuando se modifique código compartido.
5. Verificar las aprobaciones y generación de PDF después de cambios relacionados con inspecciones.

---

## Estado actual

Actualmente el proyecto dispone de:

- Inspecciones SST.
- Inspecciones EPP.
- Múltiples trabajadores por inspección EPP.
- Evaluación EPP por condición y uso.
- Planes de acción.
- Fecha límite de planes de acción.
- Evidencias fotográficas.
- Aprobaciones.
- Vista previa de informes.
- Generación de PDF SST.
- Generación de PDF EPP.
- Optimización de imágenes.
- Optimización de PDF con Ghostscript.
- Integración con OneDrive.
- Envío de correo mediante Microsoft Graph.
- Estadísticas independientes para SST y EPP.

---

## Versión

**Versión:** 1.0.0  
**Última actualización:** Agosto 2026  
**Repositorio:** `DuvanBonilla/sstInspeccion`