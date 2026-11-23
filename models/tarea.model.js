const { query } = require('../database/db');
const { esUuid } = require('./materia.model');

const PRIORIDADES = ['low', 'medium', 'high'];
const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;           // 2026-08-05
const RE_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;      // 23:59

function validarTarea(body = {}) {
  const errors = [];
  const title = String(body.title ?? '').trim();
  const subjectId = String(body.subjectId ?? '').trim();
  const priority = body.priority ?? 'medium';
  const dueDate = String(body.dueDate ?? '').trim();
  const dueTime = String(body.dueTime ?? '').trim();
  const notes = String(body.notes ?? '').trim();

  if (body.tags !== undefined && !Array.isArray(body.tags)) {
    errors.push('tags debe ser un arreglo de textos.');
  }

  const tags = Array.isArray(body.tags)
    ? body.tags.map((t) => String(t).trim()).filter(Boolean)
    : [];

  if (title.length < 1 || title.length > 120) errors.push('El título es obligatorio (máximo 120 caracteres).');
  if (!PRIORIDADES.includes(priority)) errors.push(`La prioridad debe ser: ${PRIORIDADES.join(', ')}.`);
  if (dueDate && (!RE_FECHA.test(dueDate) || Number.isNaN(Date.parse(dueDate)))) {
    errors.push('dueDate debe tener formato AAAA-MM-DD.');
  }
  if (dueTime && !RE_HORA.test(dueTime)) errors.push('dueTime debe tener formato HH:MM.');
  if (tags.length > 10 || tags.some((t) => t.length > 30)) errors.push('Máximo 10 etiquetas de 30 caracteres.');
  if (notes.length > 1000) errors.push('Las notas no pueden superar 1000 caracteres.');

  return { errors, data: { title, subjectId, priority, dueDate, dueTime, tags, notes } };
}

// Fila SQL -> JSON que espera el frontend:
// subjectId '' si no tiene materia, completedAt ISO o null, createdAt numérico.
const filaATarea = (fila) => ({
  id: fila.id,
  title: fila.title,
  subjectId: fila.subject_id || '',
  priority: fila.priority,
  dueDate: fila.due_date,
  dueTime: fila.due_time,
  tags: fila.tags,
  notes: fila.notes,
  subtasks: fila.subtasks,
  done: fila.done,
  completedAt: fila.completed_at ? new Date(fila.completed_at).toISOString() : null,
  createdAt: fila.created_at,
});

// Parámetros comunes de INSERT/UPDATE (tags como text[], subtasks como jsonb)
const camposTarea = (t) => [
  t.subjectId || null,
  t.title,
  t.priority,
  t.dueDate,
  t.dueTime,
  t.tags,
  t.notes,
  JSON.stringify(t.subtasks),
  t.done,
  t.completedAt,
];

async function crearTarea(userId, t) {
  const { rows } = await query(
    `INSERT INTO tareas
       (user_id, subject_id, title, priority, due_date, due_time, tags, notes,
        subtasks, done, completed_at, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7::text[], $8, $9::jsonb, $10, $11, $12)
     RETURNING *`,
    [userId, ...camposTarea(t), Date.now()]
  );
  return filaATarea(rows[0]);
}

// filtros: { subjectId?: string, done?: boolean } — más recientes primero
async function listarTareas(userId, { subjectId, done } = {}) {
  const condiciones = ['user_id = $1'];
  const params = [userId];

  if (subjectId) {
    if (!esUuid(subjectId)) return [];
    params.push(subjectId);
    condiciones.push(`subject_id = $${params.length}`);
  }
  if (typeof done === 'boolean') {
    params.push(done);
    condiciones.push(`done = $${params.length}`);
  }

  const { rows } = await query(
    `SELECT * FROM tareas WHERE ${condiciones.join(' AND ')} ORDER BY created_at DESC, id DESC`,
    params
  );
  return rows.map(filaATarea);
}

// Devuelve la tarea del usuario o null si no existe / no le pertenece
async function obtenerTarea(userId, id) {
  if (!esUuid(id)) return null;
  const { rows } = await query(
    'SELECT * FROM tareas WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
  return rows[0] ? filaATarea(rows[0]) : null;
}

async function actualizarTarea(userId, id, t) {
  if (!esUuid(id)) return null;
  const { rows } = await query(
    `UPDATE tareas
        SET subject_id = $3, title = $4, priority = $5, due_date = $6, due_time = $7,
            tags = $8::text[], notes = $9, subtasks = $10::jsonb, done = $11,
            completed_at = $12
      WHERE id = $1 AND user_id = $2
      RETURNING *`,
    [id, userId, ...camposTarea(t)]
  );
  return rows[0] ? filaATarea(rows[0]) : null;
}

// Devuelve true si la tarea existía y se eliminó
async function eliminarTarea(userId, id) {
  if (!esUuid(id)) return false;
  const { rowCount } = await query(
    'DELETE FROM tareas WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
  return rowCount > 0;
}

module.exports = {
  validarTarea,
  crearTarea,
  listarTareas,
  obtenerTarea,
  actualizarTarea,
  eliminarTarea,
};