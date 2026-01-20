const ReportService = require('../services/ReportService');
const Sale = require('../models/Sale');
const SaleDetail = require('../models/SaleDetail');
const database = require('../config/database');
const DateUtils = require('../utils/dateUtils');

class ReportController {
    static async filteredReport(req, res) {
        try {
            console.log('Query params recibidos:', req.query);
            const { start_date, end_date, payment_type, product_id } = req.query;
            
            if (!start_date || !end_date) {
                return res.status(400).json({
                    success: false,
                    message: 'Las fechas de inicio y fin son requeridas'
                });
            }

            console.log('🔍 Generando reporte filtrado:', {
                startDate: start_date, 
                endDate: end_date, 
                filters: { payment_type, product_id }
            });

            // Usar el servicio de reportes para obtener los datos filtrados
            const result = await ReportService.getFilteredReport(
                start_date, 
                end_date,
                { payment_type, product_id }
            );

            // Verificar si el resultado es válido
            if (!result || !result.report) {
                throw new Error('Error al procesar el reporte filtrado');
            }
            
            return res.json(result);

        } catch (error) {
            console.error('❌ Error generando reporte filtrado:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    // ===== DASHBOARD CON FECHAS CONSISTENTES =====
    static async dashboard(req, res) {
        try {
            console.log('📊 ===== GENERANDO DASHBOARD CONSISTENTE =====');

            // Ejecutar todas las consultas en paralelo para mejor rendimiento
            const [todayTotals, monthlyTotals, topProductsToday, recentSales, hourlySales] = await Promise.all([
                Sale.getTodayTotals(),
                Sale.getMonthlyTotals(),
                SaleDetail.getTodayTopProducts(10),
                Sale.getTodaySales(),
                SaleDetail.getHourlySales()
            ]);

            // Calcular totales por método de pago
            const todayPayments = recentSales.reduce((acc, sale) => {
                if (sale.payment_type === 'efectivo') {
                    acc.cash_amount += parseFloat(sale.total);
                } else if (sale.payment_type === 'qr') {
                    acc.qr_amount += parseFloat(sale.total);
                }
                return acc;
            }, { cash_amount: 0, qr_amount: 0 });

            // Obtener datos de categorías y usuarios (simplificado)
            let categoryData = [];
            let topSellersData = [];
            
            try {
                // Obtener distribución de categorías
                categoryData = await new Promise((resolve, reject) => {
                    const sql = `
                        SELECT 
                            c.name,
                            COUNT(sd.id) as total_items,
                            SUM(sd.subtotal) as total_amount
                        FROM categories c
                        LEFT JOIN products p ON c.id = p.category_id
                        LEFT JOIN sale_details sd ON p.id = sd.product_id
                        WHERE DATE(sd.created_at) = DATE('now')
                        GROUP BY c.id, c.name
                        ORDER BY total_amount DESC
                    `;
                    
                    database.getDB().all(sql, (err, rows) => {
                        if (err) resolve([]);
                        else resolve((rows || []).map(row => ({
                            name: row.name || 'Sin categoría',
                            value: parseInt(row.total_items) || 0,
                            amount: parseFloat(row.total_amount) || 0
                        })));
                    });
                });
            } catch (err) {
                console.log('No se pudieron obtener categorías');
            }

            try {
                // Obtener vendedores top
                topSellersData = await new Promise((resolve, reject) => {
                    const sql = `
                        SELECT 
                            u.full_name,
                            u.username,
                            COUNT(s.id) as sales_count,
                            SUM(s.total) as total_amount,
                            AVG(s.total) as average_sale
                        FROM users u
                        LEFT JOIN sales s ON u.id = s.user_id 
                            AND DATE(s.created_at) = DATE('now')
                        WHERE u.active = 1
                        GROUP BY u.id
                        ORDER BY total_amount DESC
                        LIMIT 5
                    `;
                    
                    database.getDB().all(sql, (err, rows) => {
                        if (err) resolve([]);
                        else resolve((rows || []).map(row => ({
                            name: row.full_name || row.username,
                            sales: parseInt(row.sales_count) || 0,
                            amount: parseFloat(row.total_amount) || 0,
                            average: parseFloat(row.average_sale) || 0
                        })));
                    });
                });
            } catch (err) {
                console.log('No se pudieron obtener vendedores top');
            }
            
            res.json({
                success: true,
                dashboard: {
                    today: {
                        sales: parseInt(todayTotals.total_sales) || 0,
                        amount: parseFloat(todayTotals.total_amount) || 0,
                        average: parseFloat(todayTotals.average_sale) || 0,
                        efectivo: parseFloat(todayTotals.efectivo_amount) || 0,
                        qr: parseFloat(todayTotals.qr_amount) || 0
                    },
                    this_month: {
                        sales: parseInt(monthlyTotals.total_sales) || 0,
                        amount: parseFloat(monthlyTotals.total_amount) || 0,
                        average: parseFloat(monthlyTotals.average_sale) || 0,
                        daily_average: parseFloat(monthlyTotals.daily_average) || 0
                    },
                    top_products_today: topProductsToday.map(p => ({
                        name: p.product_name,
                        quantity: parseInt(p.total_quantity),
                        revenue: parseFloat(p.total_revenue || 0),
                        times_sold: parseInt(p.times_sold || 0)
                    })),
                    recent_sales: recentSales.slice(0, 8).map(sale => ({
                        id: sale.id,
                        customer_name: sale.customer_name || 'Cliente',
                        user_name: sale.user_name || sale.user_full_name || 'Usuario',
                        total: parseFloat(sale.total),
                        created_at: sale.created_at,
                        table_number: sale.table_number,
                        payment_type: sale.payment_type
                    })),
                    hourly_sales: hourlySales.map(h => ({
                        hour: h.hour,
                        total: parseFloat(h.total),
                        count: parseInt(h.count)
                    })),
                    category_distribution: categoryData,
                    top_sellers: topSellersData
                }
            });

        } catch (error) {
            console.error('❌ ERROR generando dashboard consistente:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // ===== REPORTE DIARIO CON FECHAS CONSISTENTES =====
    static async dailyReport(req, res) {
        try {
            if (!req.user) {
                return res.status(403).json({
                    success: false,
                    message: 'Solo usuarios autenticados pueden generar reportes'
                });
            }

            const { date } = req.query;
            // Usar función consistente de fecha de Bolivia
            const targetDate = date || Sale.getBoliviaDate();
            
            console.log(`📊 ===== REPORTE DIARIO CONSISTENTE =====`);
            console.log(`👤 Usuario solicitante: ${req.user.username} (ID: ${req.user.id})`);
            console.log(`📅 Fecha del reporte: ${targetDate}`);
            console.log(`🔍 Usando funciones consistentes de fecha`);

            // ===== USAR FUNCIONES CONSISTENTES =====
            const sales = await Sale.findByDateRange(targetDate, targetDate, req.user.id); // ✅ FUNCIÓN EXISTENTE
            try {
                const salesSummary = sales.slice(0, 50).map(s => ({ id: s.id, total: s.total, created_at: s.created_at }));
                console.log(`🔎 sales returned for user ${req.user.id} on ${targetDate}: count=${sales.length}. Muestra:`, salesSummary);
            } catch (e) {
                console.log('🔎 Error al loguear sales en reportController:', e);
            }
            const totalAmount = sales.reduce((sum, sale) => sum + parseFloat(sale.total), 0);
            
            // Obtener breakdown de pagos con función consistente
            const paymentBreakdown = await Sale.getDailyTotalsByPaymentTypeAndUser(targetDate, req.user.id);

            console.log(`📊 RESULTADOS CONSISTENTES PARA ${req.user.username}:`);
            console.log(`   💰 Ventas del usuario: ${sales.length}`);
            console.log(`   💰 Monto total: Bs ${totalAmount}`);
            console.log(`   💳 Métodos de pago:`, paymentBreakdown);

            // Procesar breakdown de pagos
            const paymentSummary = {
                efectivo: { sales: 0, amount: 0, percentage: 0 },
                qr: { sales: 0, amount: 0, percentage: 0 }
            };

            paymentBreakdown.forEach(payment => {
                console.log(`💳 Procesando: ${payment.payment_type} - ${payment.total_sales} ventas - Bs ${payment.total_amount}`);
                        // log temporal eliminado
                if (payment.payment_type === 'efectivo') {
                    paymentSummary.efectivo = {
                        sales: parseInt(payment.total_sales),
                        amount: parseFloat(payment.total_amount),
                        percentage: totalAmount > 0 ? (payment.total_amount / totalAmount * 100).toFixed(1) : 0
                    };
                } else if (payment.payment_type === 'qr') {
                    paymentSummary.qr = {
                        sales: parseInt(payment.total_sales),
                        amount: parseFloat(payment.total_amount),
                        percentage: totalAmount > 0 ? (payment.total_amount / totalAmount * 100).toFixed(1) : 0
                    };
                }
            });

            // Ventas por usuario
            const salesByUser = [{
                user_name: req.user.full_name || req.user.username,
                total_sales: sales.length,
                total_amount: totalAmount,
                average: sales.length > 0 ? totalAmount / sales.length : 0
            }];

            // Top productos del día
            const topProducts = await SaleDetail.getTodayTopProducts(10);

            console.log(`✅ REPORTE GENERADO CONSISTENTEMENTE`);
            console.log(`📊 ========================================`);

            res.json({
                success: true,
                report: {
                    date: targetDate,
                    user: {
                        id: req.user.id,
                        username: req.user.username,
                        full_name: req.user.full_name
                    },
                    summary: {
                        total_sales: sales.length,
                        total_amount: totalAmount,
                        average_sale: sales.length > 0 ? totalAmount / sales.length : 0,
                        payment_breakdown: paymentSummary
                    },
                    sales_by_user: salesByUser,
                    top_products: topProducts,
                    detailed_sales: sales.slice(0, 50),
                    debug_info: {
                        bolivia_date_used: targetDate,
                        bolivia_datetime: Sale.getBoliviaDateTime(),
                        query_method: 'consistent_datetime_functions',
                        user_timezone: 'America/La_Paz (UTC-4)'
                    }
                }
            });

        } catch (error) {
            const localTime = new Date().toLocaleString('es-BO');
            console.error(`❌ [${localTime}] Error generando reporte consistente:`, error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // ===== FUNCIÓN PARA DEBUGGING =====
    static async debugDateTime(req, res) {
        try {
            console.log('\n🔍 ===== ENDPOINT DEBUG DATETIME =====');
            
            // Ejecutar debug del modelo Sale
            await Sale.debugDateTime();
            
            // Información adicional del sistema
            const systemInfo = {
                node_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                system_utc: new Date().toISOString(),
                system_local: new Date().toLocaleString(),
                bolivia_calculated: Sale.getBoliviaDateTime(),
                bolivia_date_only: Sale.getBoliviaDate()
            };
            
            // Comparar resultados de consultas
            const today = Sale.getBoliviaDate();
            const sales_consistent = await Sale.findByDateRange(today, today); // ✅ FUNCIÓN EXISTENTE
            const totals_consistent = await Sale.getTodayTotals(); // ✅ FUNCIÓN EXISTENTE
            
            res.json({
                success: true,
                debug_info: {
                    system: systemInfo,
                    sales_found_today: sales_consistent.length,
                    totals_today: totals_consistent,
                    first_sale_today: sales_consistent.length > 0 ? sales_consistent[sales_consistent.length - 1].created_at : null,
                    last_sale_today: sales_consistent.length > 0 ? sales_consistent[0].created_at : null
                },
                recommendations: [
                    'Usar Sale.getBoliviaDateTime() para nuevas ventas',
                    'Usar Sale.findByDateRange() para consultas con fecha consistente',
                    'Verificar que las fechas se mantengan consistentes',
                    'Monitorear logs para detectar inconsistencias'
                ]
            });
            
        } catch (error) {
            console.error('❌ Error en debug datetime:', error);
            res.status(500).json({
                success: false,
                message: 'Error en debug',
                error: error.message
            });
        }
    }

    // ===== REPORTE SEMANAL =====
    static async weeklyReport(req, res) {
        try {
            const { startDate } = req.query;
            const start = startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            const end = new Date().toISOString().split('T')[0];

            console.log('📊 === REPORTE SEMANAL (Con funciones consistentes) ===', start, 'al', end);

            // Usar función consistente
            const sales = await Sale.findByDateRange(start, end);
            const totalAmount = sales.reduce((sum, sale) => sum + parseFloat(sale.total), 0);

            // Ventas por día de la semana
            const dailySales = {};
            sales.forEach(sale => {
                const day = sale.created_at.split(' ')[0]; // Tomar solo la fecha YYYY-MM-DD
                if (!dailySales[day]) {
                    dailySales[day] = { count: 0, amount: 0 };
                }
                dailySales[day].count += 1;
                dailySales[day].amount += parseFloat(sale.total);
            });

            // Top productos de la semana
            const topProducts = await SaleDetail.getTopProducts(15, 7);

            // Ventas por usuario
            const salesByUser = await Sale.getSalesByUser(start, end);

            res.json({
                success: true,
                report: {
                    period: { start_date: start, end_date: end },
                    summary: {
                        total_sales: sales.length,
                        total_amount: totalAmount,
                        average_sale: sales.length > 0 ? totalAmount / sales.length : 0,
                        days_with_sales: Object.keys(dailySales).length
                    },
                    daily_breakdown: dailySales,
                    top_products: topProducts,
                    user_performance: salesByUser,
                    debug_info: {
                        method: 'consistent_functions_used',
                        bolivia_timezone: 'UTC-4'
                    }
                }
            });

        } catch (error) {
            console.error('Error generando reporte semanal:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    // ===== FUNCIÓN PARA CORREGIR FECHAS EXISTENTES (OPCIONAL) =====
    static async fixExistingDates(req, res) {
        try {
            if (!req.user || req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Solo administradores pueden ejecutar esta función'
                });
            }

            console.log('Función de corrección de fechas disponible pero no implementada');
            
            res.json({
                success: true,
                message: 'Función disponible pero debe implementarse con cuidado',
                warning: 'Requiere backup de base de datos antes de ejecutar',
                recommendation: 'Mejor prevenir futuras inconsistencias usando las nuevas funciones'
            });

        } catch (error) {
            console.error('Error en fix de fechas:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    // ===== NUEVOS MÉTODOS PARA EL DASHBOARD =====
    static async getSalesByDay(req, res) {
        try {
            const { days = 7 } = req.query;
            const endDate = Sale.getBoliviaDate();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - parseInt(days));
            const formattedStartDate = startDate.toISOString().split('T')[0];

            const sales = await Sale.findByDateRange(formattedStartDate, endDate);
            
            // Agrupar ventas por día
            const salesByDay = {};
            sales.forEach(sale => {
                const date = sale.created_at.split(' ')[0];
                if (!salesByDay[date]) {
                    salesByDay[date] = { total: 0, count: 0 };
                }
                salesByDay[date].total += parseFloat(sale.total);
                salesByDay[date].count += 1;
            });

            // Convertir a array ordenado
            const result = Object.entries(salesByDay).map(([date, data]) => ({
                date,
                total: data.total,
                count: data.count
            })).sort((a, b) => a.date.localeCompare(b.date));

            res.json({
                success: true,
                sales: result
            });

        } catch (error) {
            console.error('Error obteniendo ventas por día:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    static async getTopProducts(req, res) {
        try {
            const { period = 'today' } = req.query;
            let startDate = Sale.getBoliviaDate();
            
            switch(period) {
                case 'week':
                    const weekStart = new Date();
                    weekStart.setDate(weekStart.getDate() - 7);
                    startDate = weekStart.toISOString().split('T')[0];
                    break;
                case 'month':
                    const monthStart = new Date();
                    monthStart.setDate(1);
                    startDate = monthStart.toISOString().split('T')[0];
                    break;
                // Por defecto es 'today', ya tenemos la fecha correcta
            }

            const products = await SaleDetail.getTopProducts(10, period === 'today' ? 1 : undefined);

            res.json({
                success: true,
                products
            });

        } catch (error) {
            console.error('Error obteniendo top productos:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    // ===== MANTENER OTRAS FUNCIONES EXISTENTES =====
    static async monthlyReport(req, res) {
        try {
            const { year, month } = req.query;
            const currentDate = new Date();
            const targetYear = year || currentDate.getFullYear();
            const targetMonth = month || (currentDate.getMonth() + 1);
            
            const startDate = `${targetYear}-${targetMonth.toString().padStart(2, '0')}-01`;
            const lastDay = new Date(targetYear, targetMonth, 0).getDate();
            const endDate = `${targetYear}-${targetMonth.toString().padStart(2, '0')}-${lastDay}`;
            
            console.log('=== REPORTE MENSUAL ===', startDate, 'al', endDate);

            const sales = await Sale.findByDateRange(startDate, endDate);
            const totalAmount = sales.reduce((sum, sale) => sum + parseFloat(sale.total), 0);
            
            // Ventas por día del mes
            const dailySales = {};
            sales.forEach(sale => {
                const day = new Date(sale.created_at).getDate();
                if (!dailySales[day]) {
                    dailySales[day] = { count: 0, amount: 0 };
                }
                dailySales[day].count += 1;
                dailySales[day].amount += parseFloat(sale.total);
            });

            // Top productos del mes
            const topProducts = await SaleDetail.getTopProducts(20, 30);

            // Ventas por usuario del mes
            const salesByUser = await Sale.getSalesByUser(startDate, endDate);

            // Ventas por categoría
            const salesByCategory = await SaleDetail.getSalesByCategory(startDate, endDate);

            res.json({
                success: true,
                report: {
                    period: `${targetYear}-${targetMonth.toString().padStart(2, '0')}`,
                    summary: {
                        total_sales: sales.length,
                        total_amount: totalAmount,
                        average_sale: sales.length > 0 ? totalAmount / sales.length : 0,
                        days_with_sales: Object.keys(dailySales).length
                    },
                    daily_sales: dailySales,
                    top_products: topProducts,
                    user_performance: salesByUser,
                    category_performance: salesByCategory
                }
            });

        } catch (error) {
            console.error('Error generando reporte mensual:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    static async productReport(req, res) {
        try {
            console.log('=== REPORTE DE PRODUCTOS ===');

            const Product = require('../models/Product');
            const Category = require('../models/Category');

            const products = await Product.findAll();
            const topProducts = await SaleDetail.getTopProducts(25);
            
            // Productos por categoría con ventas
            const categories = await Category.findAll();
            const productsByCategory = {};
            
            for (const category of categories) {
                const categoryProducts = await SaleDetail.getTopProductsByCategory(category.id, 10);
                productsByCategory[category.name] = {
                    category_info: category,
                    top_products: categoryProducts,
                    total_products: products.filter(p => p.category_id === category.id).length
                };
            }

            res.json({
                success: true,
                report: {
                    summary: {
                        total_products: products.length,
                        active_products: products.filter(p => p.active).length,
                        categories: categories.length
                    },
                    top_selling_products: topProducts,
                    products_by_category: productsByCategory,
                    all_products: products.slice(0, 100)
                }
            });

        } catch (error) {
            console.error('Error generando reporte de productos:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    static async userReport(req, res) {
        try {
            const { startDate, endDate } = req.query;
            const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            const end = endDate || new Date().toISOString().split('T')[0];
            
            console.log('=== REPORTE DE USUARIOS ===', start, 'al', end);

            const salesByUser = await Sale.getSalesByUser(start, end);
            const allSales = await Sale.findByDateRange(start, end);
            const totalAmount = allSales.reduce((sum, sale) => sum + parseFloat(sale.total), 0);

            res.json({
                success: true,
                report: {
                    period: { start_date: start, end_date: end },
                    user_performance: salesByUser,
                    summary: {
                        total_users_with_sales: salesByUser.length,
                        total_sales: allSales.length,
                        total_amount: totalAmount,
                        average_per_user: salesByUser.length > 0 ? totalAmount / salesByUser.length : 0
                    }
                }
            });

        } catch (error) {
            console.error('Error generando reporte de usuarios:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    static async customDateReport(req, res) {
        try {
            const { startDate, endDate } = req.query;
            
            if (!startDate || !endDate) {
                return res.status(400).json({
                    success: false,
                    message: 'startDate y endDate son requeridos'
                });
            }

            console.log('=== REPORTE PERSONALIZADO ===', startDate, 'al', endDate);

            const sales = await Sale.findByDateRange(startDate, endDate);
            const totalAmount = sales.reduce((sum, sale) => sum + parseFloat(sale.total), 0);
            
            // Determinar días entre fechas
            const start = new Date(startDate);
            const end = new Date(endDate);
            const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

            // Top productos del período
            const topProducts = await SaleDetail.getTopProducts(20, daysDiff);

            // Ventas por usuario del período
            const salesByUser = await Sale.getSalesByUser(startDate, endDate);

            res.json({
                success: true,
                report: {
                    period: { start_date: startDate, end_date: endDate, days: daysDiff },
                    summary: {
                        total_sales: sales.length,
                        total_amount: totalAmount,
                        average_sale: sales.length > 0 ? totalAmount / sales.length : 0,
                        average_per_day: totalAmount / daysDiff
                    },
                    top_products: topProducts,
                    user_performance: salesByUser,
                    detailed_sales: sales
                }
            });

        } catch (error) {
            console.error('Error generando reporte personalizado:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }
}

module.exports = ReportController;