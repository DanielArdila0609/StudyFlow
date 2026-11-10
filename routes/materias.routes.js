const router = require('express').Router();
const { crearMateria, listarMaterias, eliminarMateria, actualizarMateria } = require('../controllers/materias.controller');
router.patch('/:id', actualizarMateria);
router.post('/', crearMateria);
router.get('/', listarMaterias);
router.delete('/:id', eliminarMateria);

module.exports = router;