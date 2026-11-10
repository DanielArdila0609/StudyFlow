const { db } = require('../database/firebase');
const COLORS = ['red', 'blue', 'amber', 'purple', 'green', 'sky', 'pink'];

// users/{userId}/materias
const materiasRef = (userId) =>
  db.collection('users').doc(userId).collection('materias');

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

const docToObj = (doc) => ({ id: doc.id, ...doc.data() });

module.exports = { materiasRef, validarMateria, docToObj };