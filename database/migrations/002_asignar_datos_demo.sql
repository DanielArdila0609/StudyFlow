-- FASE 4.1 — Migración 002 (MANUAL; ejecutar hasta la FASE 4.2/4.3).
-- Asocia las materias y tareas de 'demo123' a TU usuario real.
--   1) Ejecuta antes la 001.  2) Crea tu cuenta (FASE 4.2).
--   3) Cambia v_email por el correo de tu cuenta.  4) Ejecuta.
-- Solo rellena owner_id donde está NULL; no cambia user_id ni borra nada.
-- Si el correo no existe, falla y no cambia nada.
--
-- Uso:  node database/run-migration.js 002_asignar_datos_demo.sql --confirmar

BEGIN;

DO $$
DECLARE
  v_email CONSTANT text := 'CAMBIA_ESTE_CORREO@ejemplo.com';
  v_id uuid;
BEGIN
  SELECT id INTO v_id FROM users WHERE email = lower(btrim(v_email));
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'No existe un usuario con el correo %. Crea la cuenta y edita v_email.', v_email;
  END IF;

  UPDATE materias SET owner_id = v_id WHERE user_id = 'demo123' AND owner_id IS NULL;
  UPDATE tareas   SET owner_id = v_id WHERE user_id = 'demo123' AND owner_id IS NULL;
END $$;

COMMIT;