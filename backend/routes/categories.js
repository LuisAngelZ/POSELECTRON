// server/routes/categories.js
const express = require('express');
const router = express.Router();
const CategoryController = require('../controllers/categoryController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Todas las rutas de categorías requieren autenticación
router.use(authenticateToken);

// Rutas de lectura (todos los usuarios autenticados)
router.get('/', CategoryController.getAll);
router.get('/stats', CategoryController.getStats);
router.get('/:id', CategoryController.getById);

// Rutas de escritura (solo administradores)
router.post('/', requireAdmin, CategoryController.create);
router.put('/:id', requireAdmin, CategoryController.update);
router.delete('/:id', requireAdmin, CategoryController.delete);

module.exports = router;