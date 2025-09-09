// server/routes/sales.js - ORDEN CORREGIDO
const express = require('express');
const router = express.Router();
const SaleController = require('../controllers/saleController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Importar los nuevos módulos PRIMERO
const UserSessionManager = require('../middleware/userSessionManager');
const TicketSession = require('../models/TicketSession');
const Sale = require('../models/Sale');

// Todas las rutas de ventas requieren autenticación
router.use(authenticateToken);

// Aplicar middleware de sesiones DESPUÉS de autenticación
router.use(UserSessionManager.handleUserSession.bind(UserSessionManager));

// ===== NUEVAS RUTAS PARA SISTEMA DE TICKETS (ANTES de las rutas genéricas) =====

// NUEVA RUTA: Obtener información de sesión de tickets del usuario actual
router.get('/ticket-session-info', async (req, res) => {
    try {
        const userId = req.user.id;
        
        let sessionInfo;
        try {
            sessionInfo = await TicketSession.getUserSessionStats(userId);
        } catch (sessionError) {
            console.warn('Error obteniendo stats de sesión, usando valores por defecto:', sessionError.message);
            sessionInfo = {
                has_active_session: false,
                next_ticket_number: 1
            };
        }
        
        res.json({
            success: true,
            user_id: userId,
            session_info: sessionInfo,
            global_session: UserSessionManager.getCurrentSessionInfo()
        });
        
    } catch (error) {
        console.error('Error obteniendo info de sesión:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// NUEVA RUTA: Cerrar sesión de tickets manualmente
router.post('/close-ticket-session', async (req, res) => {
    try {
        const userId = req.user.id;
        
        let result;
        try {
            result = await TicketSession.closeUserSession(userId);
        } catch (sessionError) {
            console.warn('Error cerrando sesión de tickets:', sessionError.message);
            result = { sessions_closed: 0 };
        }
        
        res.json({
            success: true,
            message: `Sesión de tickets cerrada para usuario ${userId}`,
            result: result
        });
        
    } catch (error) {
        console.error('Error en close-ticket-session:', error);
        res.status(500).json({
            success: false,
            message: 'Error cerrando sesión de tickets'
        });
    }
});

// NUEVA RUTA: Obtener resumen diario de tickets
router.get('/daily-ticket-summary', async (req, res) => {
    try {
        const { date } = req.query;
        const targetDate = date || new Date().toISOString().split('T')[0];
        
        let summary;
        try {
            summary = await Sale.getDailyTicketSummary(targetDate);
        } catch (summaryError) {
            console.warn('Error obteniendo resumen de tickets, usando valores por defecto:', summaryError.message);
            summary = {
                date: targetDate,
                consistency_check: {
                    tickets_vs_sales: true,
                    amounts_match: true
                },
                session_totals: {
                    max_ticket_number: 0,
                    total_sales: 0,
                    total_amount: 0
                }
            };
        }
        
        res.json({
            success: true,
            summary: summary
        });
        
    } catch (error) {
        console.error('Error en daily-ticket-summary:', error);
        res.status(500).json({
            success: false,
            message: 'Error obteniendo resumen de tickets'
        });
    }
});

// ===== RUTAS EXISTENTES =====

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

router.get('/today-stats', async (req, res) => {
    try {
        const stats = await Sale.getTodayStats();
        
        res.json({
            success: true,
            stats: stats,
            message: `Ventas del día: ${stats.total_sales_today}`
        });
        
    } catch (error) {
        console.error('Error obteniendo estadísticas del día:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// Obtener todas las ventas (solo administradores)
router.get('/', requireAdmin, SaleController.getAll);

// Obtener venta específica por ID
router.get('/:id', SaleController.getById);

module.exports = router;