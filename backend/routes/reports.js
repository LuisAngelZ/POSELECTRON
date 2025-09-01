// ===== PARTE 3: ACTUALIZAR server/routes/reports.js =====
// Reemplaza completamente tu archivo reports.js con este código:

const express = require('express');
const router = express.Router();
const ReportController = require('../controllers/reportController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Todas las rutas de reportes requieren autenticación
router.use(authenticateToken);

// ============================
// RUTAS PÚBLICAS (usuarios autenticados)
// ============================

// Dashboard principal con métricas en tiempo real
// GET /api/reports/dashboard
router.get('/dashboard', ReportController.dashboard);

// Reporte diario básico
// GET /api/reports/daily?date=2024-01-15
router.get('/daily', ReportController.dailyReport);

// Reporte semanal
// GET /api/reports/weekly?startDate=2024-01-08
router.get('/weekly', ReportController.weeklyReport);

// Reporte de productos más vendidos
// GET /api/reports/products
router.get('/products', ReportController.productReport);

// ============================
// RUTAS ADMINISTRATIVAS (solo administradores)
// ============================

// Reporte mensual completo
// GET /api/reports/monthly?year=2024&month=1
router.get('/monthly', requireAdmin, ReportController.monthlyReport);

// Reporte de rendimiento de usuarios
// GET /api/reports/users?startDate=2024-01-01&endDate=2024-01-31
router.get('/users', requireAdmin, ReportController.userReport);

// Reporte personalizado por fechas
// GET /api/reports/custom?startDate=2024-01-01&endDate=2024-01-31
router.get('/custom', requireAdmin, ReportController.customDateReport);

// ============================
// RUTA DE AYUDA
// ============================

// Obtener información sobre las rutas disponibles
router.get('/help', (req, res) => {
    res.json({
        success: true,
        message: 'Rutas de reportes disponibles',
        routes: {
            public: [
                {
                    method: 'GET',
                    path: '/api/reports/dashboard',
                    description: 'Dashboard principal con métricas del día y mes actual',
                    auth: 'Usuario autenticado',
                    example_response: {
                        dashboard: {
                            today: { sales: 23, amount: 1247.50, average: 54.24 },
                            this_month: { sales: 156, amount: 18456.75, average: 118.31 },
                            top_products_today: [
                                { product_name: "Pizza Margherita", total_quantity: 8 }
                            ]
                        }
                    }
                },
                {
                    method: 'GET',
                    path: '/api/reports/daily?date=2024-01-15',
                    description: 'Reporte completo de ventas de un día específico',
                    auth: 'Usuario autenticado',
                    parameters: {
                        date: 'YYYY-MM-DD (opcional, por defecto hoy)'
                    }
                },
                {
                    method: 'GET',
                    path: '/api/reports/weekly?startDate=2024-01-08',
                    description: 'Reporte de ventas de los últimos 7 días',
                    auth: 'Usuario autenticado',
                    parameters: {
                        startDate: 'YYYY-MM-DD (opcional, por defecto hace 7 días)'
                    }
                },
                {
                    method: 'GET',
                    path: '/api/reports/products',
                    description: 'Reporte de productos más vendidos y estadísticas',
                    auth: 'Usuario autenticado'
                }
            ],
            admin: [
                {
                    method: 'GET',
                    path: '/api/reports/monthly?year=2024&month=1',
                    description: 'Reporte mensual completo con detalles por día',
                    auth: 'Solo administradores',
                    parameters: {
                        year: 'Año (opcional, por defecto año actual)',
                        month: 'Mes 1-12 (opcional, por defecto mes actual)'
                    }
                },
                {
                    method: 'GET',
                    path: '/api/reports/users?startDate=2024-01-01&endDate=2024-01-31',
                    description: 'Reporte de rendimiento de usuarios por período',
                    auth: 'Solo administradores',
                    parameters: {
                        startDate: 'YYYY-MM-DD (opcional, por defecto hace 30 días)',
                        endDate: 'YYYY-MM-DD (opcional, por defecto hoy)'
                    }
                },
                {
                    method: 'GET',
                    path: '/api/reports/custom?startDate=2024-01-01&endDate=2024-01-31',
                    description: 'Reporte personalizado por rango de fechas',
                    auth: 'Solo administradores',
                    parameters: {
                        startDate: 'YYYY-MM-DD (requerido)',
                        endDate: 'YYYY-MM-DD (requerido)'
                    }
                }
            ]
        },
        data_structure: {
            sales_table: {
                id: 'INTEGER PRIMARY KEY',
                customer_name: 'VARCHAR',
                user_id: 'INTEGER (FK)',
                total: 'DECIMAL',
                table_number: 'VARCHAR',
                created_at: 'DATETIME'
            },
            sale_details_table: {
                id: 'INTEGER PRIMARY KEY',
                sale_id: 'INTEGER (FK)',
                product_id: 'INTEGER (FK)',
                product_name: 'VARCHAR',
                quantity: 'INTEGER',
                unit_price: 'DECIMAL',
                subtotal: 'DECIMAL'
            }
        },
        notes: [
            'Todos los reportes usan datos reales de la base de datos',
            'Los reportes incluyen precios sin decimales (formato boliviano)',
            'Dashboard se actualiza en tiempo real cada 30 segundos',
            'Reportes administrativos incluyen más detalles y estadísticas',
            'Las fechas deben estar en formato YYYY-MM-DD',
            'Los horarios se muestran en hora local del servidor'
        ]
    });
});

module.exports = router;