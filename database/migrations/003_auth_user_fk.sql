-- FASE 4.2 — Migración 003 (MANUAL: no la ejecuta server.js ni initSchema).
-- Reemplaza a 001 y 002 (bórralas): user_id pasa de TEXT a UUID con clave foránea
-- a users(id). Se puede ejecutar varias veces; si ya está aplicada, no hace nada.
--
-- ⚠ OPERACIONES DESTRUCTIVAS (solo si user_id todavía es TEXT):
--   1) DELETE FROM materias WHERE user_id no es el id de un usuario de la tabla users
--      (incluye todo lo de 'demo123'; sus tareas se borran en cascada).
--   2) DELETE FROM tareas   WHERE user_id no es el id de un usuario de la tabla users.
-- Las filas de usuarios reales registrados con la FASE 4.2 NO se borran.
-- No toca users ni sessions. Si algo falla, todo se revierte (transacción).
--
-- Requisito: haber arrancado el servidor (npm start) para que existan users y sessions.
-- Uso:  node database/run-migration.js 003_auth_user_fk.sql --confirmar

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.users') IS NULL OR to_regclass('public.sessions') IS NULL THEN
    RAISE EXCEPTION 'Faltan las tablas users/sessions: ejecuta npm start una vez (schema.sql las crea).';
  END IF;

  IF (SELECT data_type FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'materias' AND column_name = 'user_id') = 'text' THEN

    DELETE FROM materias WHERE user_id NOT IN (SELECT id::text FROM users);
    DELETE FROM tareas   WHERE user_id NOT IN (SELECT id::text FROM users);

    ALTER TABLE materias ALTER COLUMN user_id TYPE uuid USING user_id::uuid;
    ALTER TABLE tareas   ALTER COLUMN user_id TYPE uuid USING user_id::uuid;

    ALTER TABLE materias ADD CONSTRAINT materias_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;
    ALTER TABLE tareas ADD CONSTRAINT tareas_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;
  END IF;
END $$;

-- Solo existe si alguna vez ejecutaste la 001 (ya no se usa).
ALTER TABLE tareas   DROP COLUMN IF EXISTS owner_id;
ALTER TABLE materias DROP COLUMN IF EXISTS owner_id;

COMMIT;

-- Verificación: SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_name IN ('materias','tareas') AND column_name = 'user_id';   -- uuid