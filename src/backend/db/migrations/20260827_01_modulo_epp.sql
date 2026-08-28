BEGIN;

-- 1. Adaptar inspecciones al esquema probado localmente.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'inspecciones'
      AND column_name = 'id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'inspecciones'
      AND column_name = 'inspecciones_id'
  ) THEN
    ALTER TABLE public.inspecciones
      RENAME COLUMN id TO inspecciones_id;
  END IF;
END
$$;

ALTER TABLE public.inspecciones
  DROP COLUMN IF EXISTS num_inspeccion;

DROP SEQUENCE IF EXISTS public.inspecciones_num_inspeccion_seq;

-- 2. Secuencias del módulo EPP.
CREATE SEQUENCE IF NOT EXISTS public.catalogo_epp_id_seq
  AS BIGINT START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

CREATE SEQUENCE IF NOT EXISTS public.trabajadores_epp_id_seq
  AS BIGINT START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

CREATE SEQUENCE IF NOT EXISTS public.evaluaciones_epp_id_seq
  AS BIGINT START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

-- 3. Catálogo maestro de elementos EPP y dotación.
CREATE TABLE IF NOT EXISTS public.elementos_epp (
  id BIGINT NOT NULL
    DEFAULT nextval('public.catalogo_epp_id_seq'::regclass),
  nombre TEXT NOT NULL,
  categoria TEXT NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  predeterminado BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT catalogo_epp_pkey PRIMARY KEY (id),
  CONSTRAINT catalogo_epp_nombre_unique UNIQUE (nombre),
  CONSTRAINT catalogo_epp_categoria_check
    CHECK (categoria IN ('EPP', 'DOTACION'))
);

ALTER SEQUENCE public.catalogo_epp_id_seq
  OWNED BY public.elementos_epp.id;

INSERT INTO public.elementos_epp
  (id, nombre, categoria, activo, predeterminado)
VALUES
  (1, 'CASCO', 'EPP', true, true),
  (2, 'BARBUQUEJO', 'EPP', true, true),
  (3, 'TAFILETE', 'EPP', true, true),
  (4, 'GUANTES EDGE', 'EPP', true, false),
  (5, 'GUANTE VAQUETA', 'EPP', true, false),
  (6, 'FILTRO PARA MASCARILLA', 'EPP', true, false),
  (7, 'GUANTE SHOWA', 'EPP', true, false),
  (8, 'GUANTE SOSEGA TITAN', 'EPP', true, false),
  (9, 'GUANTE NITRILO VERDE CORTO', 'EPP', true, false),
  (10, 'GUANTE NITRILO VERDE LARGO', 'EPP', true, false),
  (11, 'CAPUCHA', 'EPP', true, false),
  (12, 'GUANTE LATEX AZUL', 'EPP', true, false),
  (13, 'GAFAS CLARAS', 'EPP', true, false),
  (14, 'GAFAS OSCURAS', 'EPP', true, false),
  (15, 'MASCARILLA N95 SIN VALVULA', 'EPP', true, false),
  (16, 'MASCARILLA N95 CON VALVULA', 'EPP', true, false),
  (17, 'TAPABOCA DESECHABLE', 'EPP', true, false),
  (18, 'MONOGAFAS', 'EPP', true, false),
  (19, 'IMPERMEABLE DOS PIEZAS', 'EPP', true, false),
  (20, 'MASCARILLA CON FILTRO', 'EPP', true, false),
  (21, 'DELANTAL AMARILLO', 'EPP', true, false),
  (22, 'COFIA', 'EPP', true, false),
  (23, 'PROTECCIÓN AUDITIVA TIPO INSERCIÓN', 'EPP', true, false),
  (24, 'PROTECTOR AUDITIVO TIPO DIADEMA', 'EPP', true, false),
  (25, 'PROTECTOR AUDITIVO ADAPTACIÓN CASCO', 'EPP', true, false),
  (26, 'YOYO RETRACTIL', 'EPP', true, false),
  (27, 'BATAS', 'EPP', true, false),
  (28, 'ESLINGAS', 'EPP', true, false),
  (29, 'MOSQUETON', 'EPP', true, false),
  (30, 'ARNÉS', 'EPP', true, false),
  (31, 'CINTA', 'EPP', true, false),
  (32, 'GORRO TIPO ARABE', 'EPP', true, false),
  (33, 'PROTECCIÓN FACIAL', 'EPP', true, false),
  (34, 'CAMIBUSOS', 'DOTACION', true, false),
  (35, 'OVEROL BLANCO', 'DOTACION', true, false),
  (36, 'OVEROL AZUL', 'DOTACION', true, false),
  (37, 'BOTAS PANTANERAS CON PUNTERA', 'DOTACION', true, false),
  (38, 'BOTAS CON PUNTERA', 'DOTACION', true, true),
  (39, 'CAMISA ADMINISTRATIVA DAMA', 'DOTACION', true, false),
  (40, 'CAMISA ADMINISTRATIVA HOMBRE', 'DOTACION', true, false),
  (41, 'CAMISA PRACTICANTE', 'DOTACION', true, false),
  (42, 'JEAN', 'DOTACION', true, false),
  (43, 'JEAN ADMINISTRATIVA', 'DOTACION', true, false),
  (44, 'CHALECO SALAVIDAS', 'DOTACION', true, false),
  (45, 'CAMISA COORDINADOR', 'DOTACION', true, false),
  (46, 'CHALECO', 'DOTACION', true, false),
  (47, 'CAMISA Y PANTALÓN ANTIFLUIDO', 'DOTACION', true, false),
  (48, 'CALZADO ANTIDESLIZANTE', 'DOTACION', true, false)
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  categoria = EXCLUDED.categoria,
  activo = EXCLUDED.activo,
  predeterminado = EXCLUDED.predeterminado,
  updated_at = now();

SELECT setval(
  'public.catalogo_epp_id_seq',
  (SELECT MAX(id) FROM public.elementos_epp),
  true
);

-- 4. Trabajadores evaluados en cada inspección EPP.
CREATE TABLE IF NOT EXISTS public.evaluaciones_epp (
  id BIGINT NOT NULL
    DEFAULT nextval('public.trabajadores_epp_id_seq'::regclass),
  inspecciones_id BIGINT NOT NULL,
  idx INTEGER NOT NULL,
  nombre TEXT NOT NULL,
  codigo TEXT NOT NULL,
  cargo TEXT NOT NULL,
  observaciones TEXT NULL,
  evidencia_ruta TEXT NULL,
  evidencia_archivo TEXT NULL,
  evidencia_fecha TIMESTAMPTZ NULL,
  evidencia_url TEXT NULL,

  CONSTRAINT trabajadores_epp_pkey PRIMARY KEY (id),
  CONSTRAINT trabajadores_epp_inspeccion_idx_key
    UNIQUE (inspecciones_id, idx),
  CONSTRAINT trabajadores_epp_inspeccion_pk_fkey
    FOREIGN KEY (inspecciones_id)
    REFERENCES public.inspecciones(inspecciones_id)
    ON DELETE CASCADE
);

ALTER SEQUENCE public.trabajadores_epp_id_seq
  OWNED BY public.evaluaciones_epp.id;

-- 5. Evaluación y plan de acción por elemento.
CREATE TABLE IF NOT EXISTS public.detalle_evaluacion_epp (
  id BIGINT NOT NULL
    DEFAULT nextval('public.evaluaciones_epp_id_seq'::regclass),
  evaluacion_epp_id BIGINT NOT NULL,
  condicion TEXT NOT NULL,
  uso TEXT NOT NULL,
  plan_accion TEXT NULL,
  fecha_plan_accion DATE NULL,
  elemento_epp_id BIGINT NOT NULL,
  estado_plan TEXT NULL,
  fecha_cierre TIMESTAMPTZ NULL,
  responsable_cierre TEXT NULL,

  CONSTRAINT evaluaciones_epp_pkey PRIMARY KEY (id),
  CONSTRAINT evaluaciones_epp_trabajador_elemento_key
    UNIQUE (evaluacion_epp_id, elemento_epp_id),
  CONSTRAINT detalle_evaluacion_epp_evaluacion_epp_id_fkey
    FOREIGN KEY (evaluacion_epp_id)
    REFERENCES public.evaluaciones_epp(id)
    ON DELETE CASCADE,
  CONSTRAINT evaluaciones_epp_catalogo_epp_fkey
    FOREIGN KEY (elemento_epp_id)
    REFERENCES public.elementos_epp(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT evaluaciones_epp_condicion_check
    CHECK (condicion IN ('M', 'R', 'B', 'NA')),
  CONSTRAINT evaluaciones_epp_uso_check
    CHECK (uso IN ('M', 'R', 'B', 'NA')),
  CONSTRAINT chk_detalle_epp_estado_plan
    CHECK (estado_plan IS NULL OR estado_plan IN ('PENDIENTE', 'CUMPLIDO'))
);

ALTER SEQUENCE public.evaluaciones_epp_id_seq
  OWNED BY public.detalle_evaluacion_epp.id;

-- 6. Control de ejecución diaria de las alertas EPP.
CREATE TABLE IF NOT EXISTS public.alertas_epp_envios (
  fecha_alerta DATE NOT NULL,
  tipo_alerta TEXT NOT NULL DEFAULT 'EPP_DIARIA',
  estado TEXT NOT NULL,
  destinatario TEXT NOT NULL,
  total_planes INTEGER NOT NULL DEFAULT 0,
  intentos INTEGER NOT NULL DEFAULT 1,
  enviado_at TIMESTAMPTZ NULL,
  ultimo_error TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT alertas_epp_envios_pk
    PRIMARY KEY (fecha_alerta, tipo_alerta),
  CONSTRAINT alertas_epp_envios_estado_check
    CHECK (estado IN ('EN_PROCESO', 'ENVIADO', 'FALLIDO')),
  CONSTRAINT alertas_epp_envios_tipo_check
    CHECK (NULLIF(TRIM(tipo_alerta), '') IS NOT NULL),
  CONSTRAINT alertas_epp_envios_destinatario_check
    CHECK (NULLIF(TRIM(destinatario), '') IS NOT NULL),
  CONSTRAINT alertas_epp_envios_total_check
    CHECK (total_planes >= 0),
  CONSTRAINT alertas_epp_envios_intentos_check
    CHECK (intentos >= 1)
);

DO $$
DECLARE
  tabla TEXT;
BEGIN
  FOREACH tabla IN ARRAY ARRAY[
    'extintores',
    'camillas',
    'senalizaciones',
    'botiquines',
    'equipos_tecnologicos'
  ]
  LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = tabla
        AND column_name = 'inspeccion_pk'
    ) AND NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = tabla
        AND column_name = 'inspecciones_id'
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.%I RENAME COLUMN inspeccion_pk TO inspecciones_id',
        tabla
      );
    END IF;
  END LOOP;
END
$$;

COMMIT;