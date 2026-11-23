-- FASE 4.1 — Migración 001 (MANUAL: no la ejecuta server.js ni initSchema).
-- Prepara la relación futura users -> materias / tareas.
-- Es ADITIVA: solo agrega columnas NULL e índices. No modifica ni borra filas;
-- user_id (TEXT, 'demo123') queda intacto y el backend actual sigue igual.
-- Se puede ejecutar varias veces sin efectos extra.
--
-- Requisito: haber arrancado el servidor una vez (npm start) para que exista users.
-- Uso:  node database/run-migration.js 001_users_relations.sql --confirmar

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.users') IS NULL THEN
    RAISE EXCEPTION 'Falta la tabla users: ejecuta npm start una vez (schema.sql la crea).';
  END IF;
END $$;

ALTER TABLE materias ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES users (id) ON DELETE CASCADE;
ALTER TABLE tareas   ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES users (id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_materias_owner ON materias (owner_id, created_at);
CREATE INDEX IF NOT EXISTS idx_tareas_owner   ON tareas (owner_id, created_at DESC);

COMMIT;

-- Verificación (los conteos deben ser iguales antes y después):
--   SELECT (SELECT count(*) FROM materias) AS materias,
--          (SELECT count(*) FROM tareas)   AS tareas,
--          (SELECT count(*) FROM materias WHERE user_id = 'demo123') AS materias_demo,
--          (SELECT count(*) FROM tareas   WHERE user_id = 'demo123') AS tareas_demo;
--
-- Reversión (solo quita las columnas nuevas; no toca tus datos):
--   ALTER TABLE tareas   DROP COLUMN IF EXISTS owner_id;
--   ALTER TABLE materias DROP COLUMN IF EXISTS owner_id;