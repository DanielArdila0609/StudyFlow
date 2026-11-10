const { materiasRef } = require('../models/materia.model');
const { tareasRef, validarTarea, docToObj } = require('../models/tarea.model');

async function crearTarea(req, res, next) {
  try {
    const { errors, data } = validarTarea(req.body);
    if (errors.length) return res.status(400).json({ errors });

    if (data.subjectId) {
      const materia = await materiasRef(req.userId).doc(data.subjectId).get();
      if (!materia.exists) {
        return res.status(400).json({ errors: ['La materia indicada no existe.'] });
      }
    }

    const tarea = {
      ...data,
      subtasks: [],
      done: false,
      completedAt: null,
      createdAt: Date.now(),
    };
    const ref = await tareasRef(req.userId).add(tarea);
    res.status(201).json({ id: ref.id, ...tarea });
  } catch (error) {
    next(error);
  }
}

async function listarTareas(req, res, next) {
  try {
    let query = tareasRef(req.userId);
    if (req.query.subjectId) query = query.where('subjectId', '==', req.query.subjectId);
    if (req.query.done === 'true' || req.query.done === 'false') {
      query = query.where('done', '==', req.query.done === 'true');
    }
    const snap = await query.get();
    const tareas = snap.docs.map(docToObj).sort((a, b) => b.createdAt - a.createdAt);
    res.json(tareas);
  } catch (error) {
    next(error);
  }
}

async function eliminarTarea(req, res, next) {
  try {
    const ref = tareasRef(req.userId).doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: 'La tarea no existe.' });
    await ref.delete();
    res.json({ mensaje: 'Tarea eliminada.' });
  } catch (error) {
    next(error);
  }
}


async function actualizarTarea(req, res, next) {
  try {
    const ref = tareasRef(req.userId).doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: 'La tarea no existe.' });

    const merged = { ...doc.data(), ...req.body };
    const { errors, data } = validarTarea(merged);
    if (errors.length) return res.status(400).json({ errors });

    const subtasks = Array.isArray(merged.subtasks)
      ? merged.subtasks.slice(0, 50).map((s) => ({
          id: String(s.id),
          text: String(s.text ?? '').trim().slice(0, 200),
          done: Boolean(s.done),
        }))
      : [];
    const done = Boolean(merged.done);
    const completedAt = done ? merged.completedAt || new Date().toISOString() : null;

    await ref.update({ ...data, subtasks, done, completedAt });
    res.json({ id: ref.id, ...data, subtasks, done, completedAt, createdAt: merged.createdAt });
  } catch (error) {
    next(error);
  }
}

module.exports = { crearTarea, listarTareas, eliminarTarea, actualizarTarea };