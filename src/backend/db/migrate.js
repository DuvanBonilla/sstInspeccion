require("dotenv").config();
const { pool } = require("./pool");

const DDL = `
CREATE TABLE IF NOT EXISTS inspecciones (
  id                      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  inspeccion_id           TEXT UNIQUE NOT NULL,

  fecha                   TEXT,
  sede_operacion          TEXT,
  area_trabajo            TEXT,
  jefe_responsable        TEXT,
  cargo_jefe              TEXT,
  responsable_inspeccion  TEXT,
  cargo_responsable       TEXT,

  estado                  TEXT NOT NULL DEFAULT 'pendiente_aprobacion',

  token_inspector             UUID NOT NULL DEFAULT gen_random_uuid(),
  aprobacion_inspector_cedula TEXT,
  aprobacion_inspector_nombre TEXT,
  aprobacion_inspector_at     TIMESTAMPTZ,

  token_jefe                  UUID NOT NULL DEFAULT gen_random_uuid(),
  aprobacion_jefe_cedula      TEXT,
  aprobacion_jefe_nombre      TEXT,
  aprobacion_jefe_at          TIMESTAMPTZ,

  token_copasst                UUID NOT NULL DEFAULT gen_random_uuid(),
  aprobacion_copasst_cedula    TEXT,
  aprobacion_copasst_nombre    TEXT,
  aprobacion_copasst_at        TIMESTAMPTZ,

  pdf_url                 TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inspecciones_token_inspector ON inspecciones (token_inspector);
CREATE INDEX IF NOT EXISTS idx_inspecciones_token_jefe ON inspecciones (token_jefe);
CREATE INDEX IF NOT EXISTS idx_inspecciones_token_copasst ON inspecciones (token_copasst);
CREATE INDEX IF NOT EXISTS idx_inspecciones_created_at ON inspecciones (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inspecciones_estado ON inspecciones (estado);
CREATE INDEX IF NOT EXISTS idx_inspecciones_sede ON inspecciones (sede_operacion);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inspecciones' AND column_name = 'firma_inspector_cedula') THEN
    ALTER TABLE inspecciones RENAME COLUMN firma_inspector_cedula TO aprobacion_inspector_cedula;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inspecciones' AND column_name = 'firma_inspector_nombre') THEN
    ALTER TABLE inspecciones RENAME COLUMN firma_inspector_nombre TO aprobacion_inspector_nombre;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inspecciones' AND column_name = 'firma_inspector_at') THEN
    ALTER TABLE inspecciones RENAME COLUMN firma_inspector_at TO aprobacion_inspector_at;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inspecciones' AND column_name = 'firma_jefe_cedula') THEN
    ALTER TABLE inspecciones RENAME COLUMN firma_jefe_cedula TO aprobacion_jefe_cedula;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inspecciones' AND column_name = 'firma_jefe_nombre') THEN
    ALTER TABLE inspecciones RENAME COLUMN firma_jefe_nombre TO aprobacion_jefe_nombre;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inspecciones' AND column_name = 'firma_jefe_at') THEN
    ALTER TABLE inspecciones RENAME COLUMN firma_jefe_at TO aprobacion_jefe_at;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inspecciones' AND column_name = 'firma_copasst_cedula') THEN
    ALTER TABLE inspecciones RENAME COLUMN firma_copasst_cedula TO aprobacion_copasst_cedula;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inspecciones' AND column_name = 'firma_copasst_nombre') THEN
    ALTER TABLE inspecciones RENAME COLUMN firma_copasst_nombre TO aprobacion_copasst_nombre;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inspecciones' AND column_name = 'firma_copasst_at') THEN
    ALTER TABLE inspecciones RENAME COLUMN firma_copasst_at TO aprobacion_copasst_at;
  END IF;
END $$;

UPDATE inspecciones SET estado = 'pendiente_aprobacion' WHERE estado = 'pendiente_firmas';
ALTER TABLE inspecciones ALTER COLUMN estado SET DEFAULT 'pendiente_aprobacion';

CREATE TABLE IF NOT EXISTS extintores (
  id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  inspeccion_pk       BIGINT NOT NULL REFERENCES inspecciones(id) ON DELETE CASCADE,
  idx                 INTEGER NOT NULL,
  numero              TEXT,
  ubicacion           TEXT,
  tipo                TEXT,
  capacidad           TEXT,
  mes_recarga         TEXT,
  ano_recarga         TEXT,
  observaciones       TEXT,
  evidencia_ruta      TEXT,
  evidencia_archivo   TEXT,
  evidencia_fecha     TEXT,
  condiciones         JSONB NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_extintores_inspeccion ON extintores (inspeccion_pk);

CREATE TABLE IF NOT EXISTS camillas (
  id                        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  inspeccion_pk             BIGINT NOT NULL REFERENCES inspecciones(id) ON DELETE CASCADE,
  idx                       INTEGER NOT NULL,
  numero                    TEXT,
  ubicacion                 TEXT,
  observaciones             TEXT,
  afectacion_productividad  TEXT,
  evidencia_ruta            TEXT,
  evidencia_archivo         TEXT,
  evidencia_fecha           TEXT,
  condiciones               JSONB NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_camillas_inspeccion ON camillas (inspeccion_pk);

CREATE TABLE IF NOT EXISTS senalizaciones (
  id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  inspeccion_pk       BIGINT NOT NULL REFERENCES inspecciones(id) ON DELETE CASCADE,
  idx                 INTEGER NOT NULL,
  tipo                TEXT,
  ubicacion           TEXT,
  cantidad            TEXT,
  estado              TEXT,
  aseo                TEXT,
  observaciones       TEXT,
  evidencia_ruta      TEXT,
  evidencia_archivo   TEXT,
  evidencia_fecha     TEXT
);
CREATE INDEX IF NOT EXISTS idx_senalizaciones_inspeccion ON senalizaciones (inspeccion_pk);

CREATE TABLE IF NOT EXISTS equipos_tecnologicos (
  id                    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  inspeccion_pk         BIGINT NOT NULL REFERENCES inspecciones(id) ON DELETE CASCADE,
  idx                   INTEGER NOT NULL,
  no                    TEXT,
  equipo_tecnologico    TEXT,
  ubicacion             TEXT,
  cantidad              TEXT,
  estado                TEXT,
  mantenimiento         TEXT,
  observaciones         TEXT,
  afectacion_servicio   TEXT,
  evidencia_ruta        TEXT,
  evidencia_archivo     TEXT,
  evidencia_fecha       TEXT
);
CREATE INDEX IF NOT EXISTS idx_equipos_inspeccion ON equipos_tecnologicos (inspeccion_pk);

CREATE TABLE IF NOT EXISTS botiquines (
  id                    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  inspeccion_pk         BIGINT NOT NULL REFERENCES inspecciones(id) ON DELETE CASCADE,
  idx                   INTEGER NOT NULL,
  numero                TEXT,
  ubicacion             TEXT,
  observacion_general   TEXT,
  evidencia_ruta        TEXT,
  evidencia_archivo     TEXT,
  evidencia_fecha       TEXT
);
CREATE INDEX IF NOT EXISTS idx_botiquines_inspeccion ON botiquines (inspeccion_pk);

CREATE TABLE IF NOT EXISTS botiquin_items (
  id                    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  botiquin_id           BIGINT NOT NULL REFERENCES botiquines(id) ON DELETE CASCADE,
  idx                   INTEGER NOT NULL,
  no                    TEXT,
  item                  TEXT,
  cantidad_ideal        TEXT,
  cantidad_real         TEXT,
  integridad_empaque    TEXT,
  fecha_vencimiento     TEXT,
  plan_intervencion     TEXT,
  fecha_intervencion    TEXT,
  cumplimiento          TEXT,
  observaciones         TEXT,
  afectacion_servicio   TEXT
);
CREATE INDEX IF NOT EXISTS idx_botiquin_items_botiquin ON botiquin_items (botiquin_id);
`;

async function migrar() {
  try {
    await pool.query(DDL);
    console.log("Migración completa: esquema normalizado listo en Neon.");
  } catch (error) {
    console.error("Error migrando:", error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

migrar();
