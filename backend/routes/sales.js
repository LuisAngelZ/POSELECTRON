// server/routes/sales.js
const express = require('express');
const router = express.Router();
const SaleController = require('../controllers/saleController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Todas las rutas de ventas requieren autenticación
router.use(authenticateToken);

// Crear nueva venta (todos los usuarios autenticados)
router.post('/', SaleController.create);

// Obtener resumen de ventas
router.get('/summary', SaleController.getSummary);

// Obtener ventas de hoy
router.get('/today', SaleController.getTodaySales);

// Obtener ventas por rango de fechas
router.get('/date-range', SaleController.getByDateRange);

// Obtener ventas por usuario
router.get('/user/:userId', SaleController.getByUser);

// Obtener todas las ventas (solo administradores)
router.get('/', requireAdmin, SaleController.getAll);

// Obtener venta específica por ID
router.get('/:id', SaleController.getById);

module.exports = router;