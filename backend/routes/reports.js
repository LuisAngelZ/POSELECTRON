// server/routes/reports.js
const express = require('express');
const router = express.Router();
const ReportController = require('../controllers/reportController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Todas las rutas de reportes requieren autenticación
router.use(authenticateToken);

// Dashboard principal (todos los usuarios autenticados)
router.get('/dashboard', ReportController.dashboard);

// Reportes básicos (todos los usuarios autenticados)
router.get('/daily', ReportController.dailyReport);
router.get('/products', ReportController.productReport);

// Reportes avanzados (solo administradores)
router.get('/monthly', requireAdmin, ReportController.monthlyReport);
router.get('/users', requireAdmin, ReportController.userReport);

module.exports = router;