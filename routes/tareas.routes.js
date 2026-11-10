const router = require('express').Router();
const { crearTarea, listarTareas, eliminarTarea, actualizarTarea } = require('../controllers/tareas.controller');
router.patch('/:id', actualizarTarea);

router.post('/', crearTarea);
router.get('/', listarTareas);
router.delete('/:id', eliminarTarea);

module.exports = router;