const { query } = require('../database/db');

const COLORS = ['red', 'blue', 'amber', 'purple', 'green', 'sky', 'pink'];
const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Un id que no sea UUID nunca existe; así evitamos que PostgreSQL lance error 22P02.
const esUuid = (valor) => typeof valor === 'string' && RE_UUID.test(valor);

// Valida el body y devuelve solo los campos permitidos
function validarMateria(body = {}) {
  const errors = [];
  const name = String(body.name ?? '').trim();
  const teacher = String(body.teacher ?? '').trim();
  const emoji = String(body.emoji ?? '').trim() || '📚';
  const color = String(body.color ?? '').trim() || COLORS[0];

  if (name.length < 1 || name.length > 60) errors.push('El nombre es obligatorio (máximo 60 caracteres).');
  if (teacher.length > 80) errors.push('El nombre del profesor no puede superar 80 caracteres.');
  if (emoji.length > 16) errors.push('El emoji no es válido.');
  if (!COLORS.includes(color)) errors.push(`El color debe ser uno de: ${COLORS.join(', ')}.`);

  return { errors, data: { name, teacher, emoji, color } };
}

// Fila SQL -> JSON que espera el frontend (id string, createdAt numérico)
const filaAMateria = (fila) => ({
  id: fila.id,
  name: fila.name,
  teacher: fila.teacher,
  emoji: fila.emoji,
  color: fila.color,
  createdAt: fila.created_at,
});

async function crearMateria(userId, data) {
  const { rows } = await query(
    `INSERT INTO materias (user_id, name, teacher, emoji, color, created_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [userId, data.name, data.teacher, data.emoji, data.color, Date.now()]
  );
  return filaAMateria(rows[0]);
}

async function listarMaterias(userId) {
  const { rows } = await query(
    'SELECT * FROM materias WHERE user_id = $1 ORDER BY created_at ASC, id ASC',
    [userId]
  );
  return rows.map(filaAMateria);
}

// Devuelve la materia del usuario o null si no existe / no le pertenece
async function obtenerMateria(userId, id) {
  if (!esUuid(id)) return null;
  const { rows } = await query(
    'SELECT * FROM materias WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
  return rows[0] ? filaAMateria(rows[0]) : null;
}

async function actualizarMateria(userId, id, data) {
  if (!esUuid(id)) return null;
  const { rows } = await query(
    `UPDATE materias
        SET name = $3, teacher = $4, emoji = $5, color = $6
      WHERE id = $1 AND user_id = $2
      RETURNING *`,
    [id, userId, data.name, data.teacher, data.emoji, data.color]
  );
  return rows[0] ? filaAMateria(rows[0]) : null;
}

// Borra la materia; sus tareas se eliminan por ON DELETE CASCADE.
// Devuelve la cantidad de tareas eliminadas, o null si la materia no existe.
async function eliminarMateria(userId, id) {
  if (!esUuid(id)) return null;
  const { rows } = await query(
    `WITH tareas_materia AS (
       SELECT count(*)::int AS n FROM tareas WHERE subject_id = $1 AND user_id = $2
     ),
     borrada AS (
       DELETE FROM materias WHERE id = $1 AND user_id = $2 RETURNING id
     )
     SELECT (SELECT count(*)::int FROM borrada) AS borradas,
            (SELECT n FROM tareas_materia) AS tareas`,
    [id, userId]
  );
  return rows[0].borradas === 0 ? null : rows[0].tareas;
}

module.exports = {
  validarMateria,
  esUuid,
  crearMateria,
  listarMaterias,
  obtenerMateria,
  actualizarMateria,
  eliminarMateria,
};