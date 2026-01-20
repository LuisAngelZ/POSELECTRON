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
// Debug de fechas y tiempos
// GET /api/reports/debug-datetime
router.get('/debug-datetime', ReportController.debugDateTime);
// Función para corregir fechas (solo admin)
// POST /api/reports/fix-dates
router.post('/fix-dates', requireAdmin, ReportController.fixExistingDates);

// Dashboard principal con métricas en tiempo real
// GET /api/reports/dashboard
router.get('/dashboard', ReportController.dashboard);

// Reporte diario básico
// GET /api/reports/daily?date=2024-01-15
router.get('/daily', ReportController.dailyReport);

// Reporte filtrado
// GET /api/reports/filtered?start_date=2024-01-01&end_date=2024-01-31&payment_type=cash
router.get('/filtered', ReportController.filteredReport);

// Ventas por día para el gráfico
// GET /api/reports/sales-by-day?days=7
router.get('/sales-by-day', ReportController.getSalesByDay);

// Top productos
// GET /api/reports/top-products?period=today|week|month
router.get('/top-products', ReportController.getTopProducts);

// Reporte semanal
// GET /api/reports/weekly?startDate=2024-01-08
router.get('/weekly', ReportController.weeklyReport);

// Reporte de productos más vendidos
// GET /api/reports/products
router.get('/products', ReportController.productReport);

// ============================
// RUTAS PARA REPORTES DE VENTAS POR PRODUCTO
// ============================

// Ventas por producto del día
// GET /api/reports/products/day?date=2024-01-15
router.get('/products/day', async (req, res) => {
    try {
        const SaleDetail = require('../models/SaleDetail');
        const { date } = req.query;
        
        const products = await SaleDetail.getProductSalesByDay(date);
        
        res.json({
            success: true,
            date: date || require('../utils/dateUtils').getLocalDate(),
            total_products: products.length,
            products: products,
            summary: {
                total_quantity: products.reduce((sum, p) => sum + p.total_quantity, 0),
                total_revenue: products.reduce((sum, p) => sum + p.total_revenue, 0)
            }
        });
    } catch (error) {
        console.error('Error en reporte de productos del día:', error);
        res.status(500).json({
            success: false,
            message: 'Error obteniendo reporte de productos del día',
            error: error.message
        });
    }
});

// Ventas por producto del mes
// GET /api/reports/products/month?yearMonth=2024-01
router.get('/products/month', async (req, res) => {
    try {
        const SaleDetail = require('../models/SaleDetail');
        const { yearMonth } = req.query;
        
        const products = await SaleDetail.getProductSalesByMonth(yearMonth);
        
        res.json({
            success: true,
            month: yearMonth || require('../utils/dateUtils').getCurrentMonth(),
            total_products: products.length,
            products: products,
            summary: {
                total_quantity: products.reduce((sum, p) => sum + p.total_quantity, 0),
                total_revenue: products.reduce((sum, p) => sum + p.total_revenue, 0),
                total_days_with_sales: Math.max(...products.map(p => p.days_sold || 0))
            }
        });
    } catch (error) {
        console.error('Error en reporte de productos del mes:', error);
        res.status(500).json({
            success: false,
            message: 'Error obteniendo reporte de productos del mes',
            error: error.message
        });
    }
});

// Ventas por producto del año
// GET /api/reports/products/year?year=2024
router.get('/products/year', async (req, res) => {
    try {
        const SaleDetail = require('../models/SaleDetail');
        const { year } = req.query;
        
        const products = await SaleDetail.getProductSalesByYear(year);
        
        res.json({
            success: true,
            year: year || require('../utils/dateUtils').getCurrentYear(),
            total_products: products.length,
            products: products,
            summary: {
                total_quantity: products.reduce((sum, p) => sum + p.total_quantity, 0),
                total_revenue: products.reduce((sum, p) => sum + p.total_revenue, 0),
                total_days_with_sales: Math.max(...products.map(p => p.days_sold || 0))
            }
        });
    } catch (error) {
        console.error('Error en reporte de productos del año:', error);
        res.status(500).json({
            success: false,
            message: 'Error obteniendo reporte de productos del año',
            error: error.message
        });
    }
});

// Ventas de un producto específico por día
// GET /api/reports/products/:productId/day?date=2024-01-15
router.get('/products/:productId/day', async (req, res) => {
    try {
        const SaleDetail = require('../models/SaleDetail');
        const { productId } = req.params;
        const { date } = req.query;
        
        const productSales = await SaleDetail.getSpecificProductSalesByDay(productId, date);
        
        if (!productSales) {
            return res.json({
                success: true,
                date: date || require('../utils/dateUtils').getLocalDate(),
                product_id: productId,
                message: 'No hay ventas de este producto en la fecha especificada',
                sales: null
            });
        }
        
        res.json({
            success: true,
            date: date || require('../utils/dateUtils').getLocalDate(),
            product_id: productId,
            sales: productSales
        });
    } catch (error) {
        console.error('Error en reporte de producto específico:', error);
        res.status(500).json({
            success: false,
            message: 'Error obteniendo reporte del producto',
            error: error.message
        });
    }
});

// Reporte personalizado de productos por rango de fechas
// GET /api/reports/products/custom?startDate=2024-01-01&endDate=2024-01-31
router.get('/products/custom', async (req, res) => {
    try {
        const SaleDetail = require('../models/SaleDetail');
        const { startDate, endDate } = req.query;
        
        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Se requieren startDate y endDate en formato YYYY-MM-DD'
            });
        }
        
        const products = await SaleDetail.getProductSalesReport(startDate, endDate);
        
        res.json({
            success: true,
            start_date: startDate,
            end_date: endDate,
            total_products: products.length,
            products: products,
            summary: {
                total_quantity: products.reduce((sum, p) => sum + p.total_quantity, 0),
                total_revenue: products.reduce((sum, p) => sum + p.total_revenue, 0),
                avg_daily_revenue: products.reduce((sum, p) => sum + (p.avg_daily_revenue || 0), 0)
            }
        });
    } catch (error) {
        console.error('Error en reporte personalizado de productos:', error);
        res.status(500).json({
            success: false,
            message: 'Error obteniendo reporte personalizado de productos',
            error: error.message
        });
    }
});

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
                },
                {
                    method: 'GET',
                    path: '/api/reports/products/day?date=2024-01-15',
                    description: 'Ventas por producto del día específico o hoy',
                    auth: 'Usuario autenticado',
                    parameters: {
                        date: 'YYYY-MM-DD (opcional, por defecto hoy)'
                    },
                    response_example: {
                        date: '2024-01-15',
                        total_products: 12,
                        products: [
                            {
                                product_id: 5,
                                product_name: 'Pizza Margherita',
                                total_quantity: 15,
                                total_revenue: 375.00,
                                times_sold: 8
                            }
                        ]
                    }
                },
                {
                    method: 'GET',
                    path: '/api/reports/products/month?yearMonth=2024-01',
                    description: 'Ventas por producto del mes específico o mes actual',
                    auth: 'Usuario autenticado',
                    parameters: {
                        yearMonth: 'YYYY-MM (opcional, por defecto mes actual)'
                    }
                },
                {
                    method: 'GET',
                    path: '/api/reports/products/year?year=2024',
                    description: 'Ventas por producto del año específico o año actual',
                    auth: 'Usuario autenticado',
                    parameters: {
                        year: 'YYYY (opcional, por defecto año actual)'
                    }
                },
                {
                    method: 'GET',
                    path: '/api/reports/products/:productId/day?date=2024-01-15',
                    description: 'Ventas de un producto específico en un día',
                    auth: 'Usuario autenticado',
                    parameters: {
                        productId: 'ID del producto (requerido)',
                        date: 'YYYY-MM-DD (opcional, por defecto hoy)'
                    }
                },
                {
                    method: 'GET',
                    path: '/api/reports/products/custom?startDate=2024-01-01&endDate=2024-01-31',
                    description: 'Reporte de productos por rango de fechas personalizado',
                    auth: 'Usuario autenticado',
                    parameters: {
                        startDate: 'YYYY-MM-DD (requerido)',
                        endDate: 'YYYY-MM-DD (requerido)'
                    }
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
        ], 
        debug_routes: {
            datetime_debug: {
                method: 'GET',
                path: '/api/reports/debug-datetime',
                description: 'Debug completo del sistema de fechas y tiempos',
                auth: 'Usuario autenticado',
                returns: {
                    system_info: 'Información del sistema',
                    bolivia_time: 'Hora calculada de Bolivia',
                    sales_today: 'Ventas encontradas para hoy',
                    recommendations: 'Recomendaciones para solucionar problemas'
                }
            },
            fix_dates: {
                method: 'POST',
                path: '/api/reports/fix-dates',
                description: 'Herramienta para corregir fechas inconsistentes (CUIDADO)',
                auth: 'Solo administradores',
                warning: 'Requiere backup antes de usar'
            }
        },
        
        datetime_improvements: {
            problem_solved: 'Inconsistencias de timezone SQLite',
            solution: 'Funciones manuales de hora Bolivia (UTC-4)',
            new_functions: [
                'Sale.getBoliviaDateTime()',
                'Sale.getBoliviaDate()',
                'Sale.findByDateRangeConsistent()',
                'Sale.getTodayTotalsConsistent()'
            ],
            benefits: [
                'Reportes consistentes sin importar la hora',
                'Fechas siempre en hora local de Bolivia',
                'Eliminación de problemas de timezone',
                'Resultados predecibles'
            ]
        },
        
        migration_notes: [
            'Las funciones antiguas siguen funcionando pero muestran advertencias',
            'Nuevas ventas usan automáticamente el sistema consistente',
            'Reportes generados usan las funciones consistentes',
            'El sistema detecta y reporta inconsistencias'
        ]
    });
});

module.exports = router;