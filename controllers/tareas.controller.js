const { obtenerMateria } = require('../models/materia.model');
const tareas = require('../models/tarea.model');

const MATERIA_INVALIDA = { errors: ['La materia indicada no existe.'] };
const FK_VIOLATION = '23503'; // la materia se borró justo mientras se guardaba la tarea

async function crearTarea(req, res, next) {
  try {
    const { errors, data } = tareas.validarTarea(req.body);
    if (errors.length) return res.status(400).json({ errors });

    if (data.subjectId && !(await obtenerMateria(req.userId, data.subjectId))) {
      return res.status(400).json(MATERIA_INVALIDA);
    }

    const tarea = await tareas.crearTarea(req.userId, {
      ...data,
      subtasks: [],
      done: false,
      completedAt: null,
    });
    res.status(201).json(tarea);
  } catch (error) {
    if (error.code === FK_VIOLATION) return res.status(400).json(MATERIA_INVALIDA);
    next(error);
  }
}

async function listarTareas(req, res, next) {
  try {
    const { subjectId, done } = req.query;
    const filtros = {};
    if (subjectId) filtros.subjectId = subjectId;
    if (done === 'true' || done === 'false') filtros.done = done === 'true';
    res.json(await tareas.listarTareas(req.userId, filtros));
  } catch (error) {
    next(error);
  }
}

async function eliminarTarea(req, res, next) {
  try {
    const eliminada = await tareas.eliminarTarea(req.userId, req.params.id);
    if (!eliminada) return res.status(404).json({ error: 'La tarea no existe.' });
    res.json({ mensaje: 'Tarea eliminada.' });
  } catch (error) {
    next(error);
  }
}

async function actualizarTarea(req, res, next) {
  try {
    const actual = await tareas.obtenerTarea(req.userId, req.params.id);
    if (!actual) return res.status(404).json({ error: 'La tarea no existe.' });

    const merged = { ...actual, ...req.body };
    const { errors, data } = tareas.validarTarea(merged);
    if (errors.length) return res.status(400).json({ errors });

    // Si cambia de materia, debe ser una materia del mismo usuario
    if (data.subjectId && data.subjectId !== actual.subjectId
        && !(await obtenerMateria(req.userId, data.subjectId))) {
      return res.status(400).json(MATERIA_INVALIDA);
    }

    const subtasks = Array.isArray(merged.subtasks)
      ? merged.subtasks
          .filter((s) => s && typeof s === 'object')
          .slice(0, 50)
          .map((s) => ({
            id: String(s.id),
            text: String(s.text ?? '').trim().slice(0, 200),
            done: Boolean(s.done),
          }))
      : [];
    const done = Boolean(merged.done);

    let completedAt = null;
    if (done) {
      const fecha = merged.completedAt ? new Date(merged.completedAt) : new Date();
      completedAt = (Number.isNaN(fecha.getTime()) ? new Date() : fecha).toISOString();
    }

    const tarea = await tareas.actualizarTarea(req.userId, actual.id, {
      ...data,
      subtasks,
      done,
      completedAt,
    });
    if (!tarea) return res.status(404).json({ error: 'La tarea no existe.' });
    res.json(tarea);
  } catch (error) {
    if (error.code === FK_VIOLATION) return res.status(400).json(MATERIA_INVALIDA);
    next(error);
  }
}

module.exports = { crearTarea, listarTareas, eliminarTarea, actualizarTarea };