const { db } = require('../database/firebase');
const { materiasRef, validarMateria, docToObj } = require('../models/materia.model');
const { tareasRef } = require('../models/tarea.model');

async function crearMateria(req, res, next) {
  try {
    const { errors, data } = validarMateria(req.body);
    if (errors.length) return res.status(400).json({ errors });
    const materia = { ...data, createdAt: Date.now() };
    const ref = await materiasRef(req.userId).add(materia);
    res.status(201).json({ id: ref.id, ...materia });
  } catch (error) {
    next(error);
  }
}

async function listarMaterias(req, res, next) {
  try {
    const snap = await materiasRef(req.userId).orderBy('createdAt', 'asc').get();
    res.json(snap.docs.map(docToObj));
  } catch (error) {
    next(error);
  }
}

async function eliminarMateria(req, res, next) {
  try {
    const { id } = req.params;
    const ref = materiasRef(req.userId).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: 'La materia no existe.' });

    const tareasSnap = await tareasRef(req.userId).where('subjectId', '==', id).get();
    const batch = db.batch();
    tareasSnap.docs.forEach((t) => batch.delete(t.ref));
    batch.delete(ref);
    await batch.commit();
    res.json({ mensaje: 'Materia eliminada.', tareasEliminadas: tareasSnap.size });
  } catch (error) {
    next(error);
  }
}

async function actualizarMateria(req, res, next) {
  try {
    const ref = materiasRef(req.userId).doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: 'La materia no existe.' });

    const { errors, data } = validarMateria({ ...doc.data(), ...req.body });
    if (errors.length) return res.status(400).json({ errors });

    await ref.update(data);
    res.json({ id: ref.id, ...data, createdAt: doc.data().createdAt });
  } catch (error) {
    next(error);
  }
}

module.exports = { crearMateria, listarMaterias, eliminarMateria, actualizarMateria };