const materias = require('../models/materia.model');

async function crearMateria(req, res, next) {
  try {
    const { errors, data } = materias.validarMateria(req.body);
    if (errors.length) return res.status(400).json({ errors });
    const materia = await materias.crearMateria(req.userId, data);
    res.status(201).json(materia);
  } catch (error) {
    next(error);
  }
}

async function listarMaterias(req, res, next) {
  try {
    res.json(await materias.listarMaterias(req.userId));
  } catch (error) {
    next(error);
  }
}

async function eliminarMateria(req, res, next) {
  try {
    // Las tareas de la materia se eliminan en cascada (ON DELETE CASCADE)
    const tareasEliminadas = await materias.eliminarMateria(req.userId, req.params.id);
    if (tareasEliminadas === null) return res.status(404).json({ error: 'La materia no existe.' });
    res.json({ mensaje: 'Materia eliminada.', tareasEliminadas });
  } catch (error) {
    next(error);
  }
}

async function actualizarMateria(req, res, next) {
  try {
    const actual = await materias.obtenerMateria(req.userId, req.params.id);
    if (!actual) return res.status(404).json({ error: 'La materia no existe.' });

    const { errors, data } = materias.validarMateria({ ...actual, ...req.body });
    if (errors.length) return res.status(400).json({ errors });

    const materia = await materias.actualizarMateria(req.userId, actual.id, data);
    if (!materia) return res.status(404).json({ error: 'La materia no existe.' });
    res.json(materia);
  } catch (error) {
    next(error);
  }
}

module.exports = { crearMateria, listarMaterias, eliminarMateria, actualizarMateria };