-- StudyFlow — Esquema PostgreSQL (Render)
-- Idempotente: se puede ejecutar varias veces sin borrar datos.
-- gen_random_uuid() es nativo desde PostgreSQL 13 (no requiere extensiones).

-- Formatos pensados para ser compatibles con el frontend actual:
--   * id: UUID, el driver lo entrega como texto (igual que los IDs de Firestore).
--   * created_at: BIGINT en milisegundos (el frontend lo usa como número).
--   * due_date / due_time: texto 'AAAA-MM-DD' / 'HH:MM' o '' si no hay (como hoy).
--   * completed_at: TIMESTAMPTZ; en JSON sale como ISO 8601 (igual que hoy) o null.
--   * tags: arreglo de texto; subtasks: JSON [{id, text, done}].

-- user_id de materias/tareas es UUID con FK a users(id) (FASE 4.2). Una base que
-- ya existía con user_id TEXT NO se cambia aquí (CREATE TABLE IF NOT EXISTS):
-- usa la migración manual database/migrations/003_auth_user_fk.sql.

-- FASE 4.1 — Usuarios reales. Tabla nueva: no toca materias ni tareas.
--   * email: único, siempre en minúsculas y sin espacios (lo exige el CHECK).
--   * password_hash: hash bcrypt (bcryptjs), nunca la contraseña en texto plano.
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(100) NOT NULL CHECK (char_length(btrim(name)) >= 1),
  email         VARCHAR(254) NOT NULL UNIQUE
                CHECK (email = lower(btrim(email))),
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sesiones (FASE 4.2): el navegador guarda un token aleatorio en una cookie
-- HttpOnly; aquí solo se guarda su hash SHA-256 (si se filtra la BD, no sirve).
CREATE TABLE IF NOT EXISTS sessions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash CHAR(64) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions (expires_at);

CREATE TABLE IF NOT EXISTS materias (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name       VARCHAR(60) NOT NULL CHECK (char_length(btrim(name)) >= 1),
  teacher    VARCHAR(80) NOT NULL DEFAULT '',
  emoji      VARCHAR(16) NOT NULL DEFAULT '📚',
  color      VARCHAR(10) NOT NULL DEFAULT 'red'
             CHECK (color IN ('red', 'blue', 'amber', 'purple', 'green', 'sky', 'pink')),
  created_at BIGINT NOT NULL DEFAULT (extract(epoch FROM now()) * 1000)::bigint
);

CREATE INDEX IF NOT EXISTS idx_materias_user ON materias (user_id, created_at);

CREATE TABLE IF NOT EXISTS tareas (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  -- NULL = tarea sin materia (la API lo devolverá como subjectId: '').
  -- Al borrar una materia se borran sus tareas (igual que el backend actual).
  subject_id   UUID REFERENCES materias (id) ON DELETE CASCADE,
  title        VARCHAR(120) NOT NULL CHECK (char_length(btrim(title)) >= 1),
  priority     VARCHAR(6) NOT NULL DEFAULT 'medium'
               CHECK (priority IN ('low', 'medium', 'high')),
  due_date     VARCHAR(10) NOT NULL DEFAULT ''
               CHECK (due_date = '' OR due_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  due_time     VARCHAR(5) NOT NULL DEFAULT ''
               CHECK (due_time = '' OR due_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  tags         TEXT[] NOT NULL DEFAULT '{}',
  notes        VARCHAR(1000) NOT NULL DEFAULT '',
  subtasks     JSONB NOT NULL DEFAULT '[]'::jsonb,
  done         BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at   BIGINT NOT NULL DEFAULT (extract(epoch FROM now()) * 1000)::bigint
);

CREATE INDEX IF NOT EXISTS idx_tareas_user ON tareas (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tareas_subject ON tareas (subject_id);