const { db } = require('../database/firebase');
const PRIORIDADES = ['low', 'medium', 'high'];
const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;           // 2026-08-05
const RE_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;      // 23:59

// users/{userId}/tareas
const tareasRef = (userId) =>
  db.collection('users').doc(userId).collection('tareas');

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

const docToObj = (doc) => ({ id: doc.id, ...doc.data() });

module.exports = { tareasRef, validarTarea, docToObj };