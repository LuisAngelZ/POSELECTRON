// ===== PARTE 2: ACTUALIZAR reportController.js CON DATOS REALES =====
// Reemplaza completamente tu reportController.js con este código:

const Sale = require('../models/Sale');
const SaleDetail = require('../models/SaleDetail');
const Product = require('../models/Product');
const Category = require('../models/Category');

class ReportController {
    // Dashboard principal con métricas clave - ACTUALIZADO
    static async dashboard(req, res) {
        try {
            console.log('=== GENERANDO DASHBOARD ===');

            // Obtener datos del día actual
            const todayTotals = await Sale.getTodayTotals();
            console.log('Totales de hoy:', todayTotals);

            // Obtener datos del mes actual
            const monthlyTotals = await Sale.getMonthlyTotals();
            console.log('Totales del mes:', monthlyTotals);

            // Top productos de hoy
            const topProductsToday = await SaleDetail.getTodayTopProducts(5);
            console.log('Top productos hoy:', topProductsToday);

            // Ventas recientes de hoy
            const recentSales = await Sale.getTodaySales();
            console.log('Ventas recientes:', recentSales.length);

            // Ventas por hora (para gráficos)
            const hourlySales = await SaleDetail.getHourlySales();
            
            res.json({
                success: true,
                dashboard: {
                    today: {
                        sales: parseInt(todayTotals.total_sales) || 0,
                        amount: parseFloat(todayTotals.total_amount) || 0,
                        average: parseFloat(todayTotals.average_sale) || 0
                    },
                    this_month: {
                        sales: parseInt(monthlyTotals.total_sales) || 0,
                        amount: parseFloat(monthlyTotals.total_amount) || 0,
                        average: parseFloat(monthlyTotals.average_sale) || 0
                    },
                    top_products_today: topProductsToday.map(p => ({
                        product_name: p.product_name,
                        total_quantity: parseInt(p.total_quantity),
                        total_revenue: parseFloat(p.total_revenue || 0),
                        times_sold: parseInt(p.times_sold || 0)
                    })),
                    recent_sales: recentSales.slice(0, 10).map(sale => ({
                        id: sale.id,
                        customer_name: sale.customer_name || 'Cliente',
                        user_name: sale.user_name || sale.user_full_name || 'Usuario',
                        total: parseFloat(sale.total),
                        created_at: sale.created_at,
                        table_number: sale.table_number
                    })),
                    hourly_sales: hourlySales
                }
            });

        } catch (error) {
            console.error('ERROR generando dashboard:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Reporte diario actualizado
    static async dailyReport(req, res) {
        try {
              if (!req.user) {
            return res.status(403).json({
                success: false,
                message: 'Solo administradores y cajeros pueden generar reportes'
            });
        }
            const { date } = req.query;
            const targetDate = date || new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD formato
            console.log(`📊 [${new Date().toLocaleString('es-BO')}] Generando reporte para: ${targetDate}`);
        
             console.log(`📊 ===== GENERANDO REPORTE DIARIO =====`);
             console.log(`👤 Usuario solicitante: ${req.user.username} (ID: ${req.user.id})`);
             console.log(`📅 Fecha del reporte: ${targetDate}`);
             console.log(`🔍 Filtrando ventas SOLO del usuario: ${req.user.username}`);

            const sales = await Sale.findByDateRangeAndUser(targetDate, targetDate, req.user.id);
        
            const totalAmount = sales.reduce((sum, sale) => sum + parseFloat(sale.total), 0);
            
            const paymentBreakdown = await Sale.getDailyTotalsByPaymentTypeAndUser(targetDate, req.user.id);

                    console.log(`📊 DATOS DEL REPORTE PARA USUARIO ${req.user.username}:`);
        console.log(`   💰 Total ventas del usuario: ${sales.length}`);
        console.log(`   💰 Monto total del usuario: Bs ${totalAmount}`);
        console.log(`   💳 Breakdown de pagos del usuario:`, paymentBreakdown);
        
        
        // Procesar breakdown de pagos
        const paymentSummary = {
            efectivo: { sales: 0, amount: 0, percentage: 0 },
            qr: { sales: 0, amount: 0, percentage: 0 }
        };
               // DEBUGGING: agregar console.logs
        console.log('🔍 Payment breakdown from DB:', paymentBreakdown);
        console.log('🔍 Total sales:', sales.length);
        console.log('🔍 Total amount:', totalAmount);

        
          paymentBreakdown.forEach(payment => {
            console.log(`🔍 Processing payment: ${payment.payment_type} - Sales: ${payment.total_sales} - Amount: ${payment.total_amount}`);
            
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
        
        console.log('🔍 Final payment summary:', paymentSummary);
    console.log(`📊 ========================================`);

            // Ventas por usuario
            const salesByUser = {};
            sales.forEach(sale => {
                const userName = sale.user_name || sale.user_full_name || 'Usuario Desconocido';
                if (!salesByUser[userName]) {
                    salesByUser[userName] = { count: 0, amount: 0 };
                }
                salesByUser[userName].count += 1;
                salesByUser[userName].amount += parseFloat(sale.total);
            });

            // Top productos del día
            const topProducts = await SaleDetail.getTodayTopProducts(10);
            
            // Ventas por hora
            const hourlySales = await SaleDetail.getHourlySales(targetDate);

            res.json({
                success: true,
                report: {
                    date: targetDate,
                    summary: {
                        total_sales: sales.length,
                        total_amount: totalAmount,
                        average_sale: sales.length > 0 ? totalAmount / sales.length : 0,
                        payment_breakdown: paymentSummary
                    },
                    sales_by_user: Object.entries(salesByUser).map(([name, data]) => ({
                        user_name: name,
                        ...data,
                        average: data.amount / data.count
                    })),
                    top_products: topProducts,
                    hourly_breakdown: hourlySales,
                    detailed_sales: sales.slice(0, 50) // Limitar para rendimiento
                }
            });

        } catch (error) {
             const localTime = new Date().toLocaleString('es-BO');
        console.error(`❌ [${localTime}] Error generando reporte:`, error);
            console.error('Error generando reporte diario:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    // Reporte semanal - NUEVO
    static async weeklyReport(req, res) {
        try {
            const { startDate } = req.query;
            const start = startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            const end = new Date().toISOString().split('T')[0];

            console.log('=== REPORTE SEMANAL ===', start, 'al', end);

            const sales = await Sale.findByDateRange(start, end);
            const totalAmount = sales.reduce((sum, sale) => sum + parseFloat(sale.total), 0);

            // Ventas por día de la semana
            const dailySales = {};
            sales.forEach(sale => {
                const day = new Date(sale.created_at).toISOString().split('T')[0];
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
                    user_performance: salesByUser
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

    // Reporte mensual actualizado
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

    // Reporte de productos actualizado
    static async productReport(req, res) {
        try {
            console.log('=== REPORTE DE PRODUCTOS ===');

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
                    all_products: products.slice(0, 100) // Limitar para rendimiento
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

    // Reporte de usuarios actualizado
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

    // Reporte por rango de fechas personalizado
    static async customDateReport(req, res) {
        try {
            const { startDate, endDate, groupBy } = req.query;
            
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