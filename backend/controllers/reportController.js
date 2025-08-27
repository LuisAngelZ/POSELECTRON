// server/controllers/reportController.js
const Sale = require('../models/Sale');
const SaleDetail = require('../models/SaleDetail');
const Product = require('../models/Product');
const Category = require('../models/Category');

class ReportController {
    // Reporte de ventas diarias
    static async dailyReport(req, res) {
        try {
            const { date } = req.query;
            const targetDate = date || new Date().toISOString().split('T')[0];
            
            const sales = await Sale.findByDateRange(targetDate, targetDate);
            const totalAmount = sales.reduce((sum, sale) => sum + sale.total, 0);
            
            // Agrupar por usuario
            const salesByUser = {};
            sales.forEach(sale => {
                const userName = sale.user_name || 'Usuario Desconocido';
                if (!salesByUser[userName]) {
                    salesByUser[userName] = { count: 0, amount: 0 };
                }
                salesByUser[userName].count += 1;
                salesByUser[userName].amount += sale.total;
            });

            // Productos más vendidos del día
            const productSales = {};
            for (const sale of sales) {
                const details = await SaleDetail.findBySaleId(sale.id);
                details.forEach(detail => {
                    if (!productSales[detail.product_name]) {
                        productSales[detail.product_name] = {
                            quantity: 0,
                            revenue: 0
                        };
                    }
                    productSales[detail.product_name].quantity += detail.quantity;
                    productSales[detail.product_name].revenue += detail.subtotal;
                });
            }

            const topProducts = Object.entries(productSales)
                .map(([name, data]) => ({ name, ...data }))
                .sort((a, b) => b.quantity - a.quantity)
                .slice(0, 10);

            res.json({
                success: true,
                report: {
                    date: targetDate,
                    summary: {
                        total_sales: sales.length,
                        total_amount: totalAmount,
                        average_sale: sales.length > 0 ? totalAmount / sales.length : 0
                    },
                    sales_by_user: salesByUser,
                    top_products: topProducts,
                    detailed_sales: sales
                }
            });

        } catch (error) {
            console.error('Error generando reporte diario:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    // Reporte de ventas mensuales
    static async monthlyReport(req, res) {
        try {
            const { year, month } = req.query;
            const currentDate = new Date();
            const targetYear = year || currentDate.getFullYear();
            const targetMonth = month || (currentDate.getMonth() + 1);
            
            const startDate = `${targetYear}-${targetMonth.toString().padStart(2, '0')}-01`;
            const endDate = new Date(targetYear, targetMonth, 0).toISOString().split('T')[0];
            
            const sales = await Sale.findByDateRange(startDate, endDate);
            const totalAmount = sales.reduce((sum, sale) => sum + sale.total, 0);
            
            // Ventas por día del mes
            const dailySales = {};
            sales.forEach(sale => {
                const day = new Date(sale.created_at).getDate();
                if (!dailySales[day]) {
                    dailySales[day] = { count: 0, amount: 0 };
                }
                dailySales[day].count += 1;
                dailySales[day].amount += sale.total;
            });

            // Productos más vendidos del mes
            const productSales = {};
            for (const sale of sales) {
                const details = await SaleDetail.findBySaleId(sale.id);
                details.forEach(detail => {
                    if (!productSales[detail.product_name]) {
                        productSales[detail.product_name] = {
                            quantity: 0,
                            revenue: 0
                        };
                    }
                    productSales[detail.product_name].quantity += detail.quantity;
                    productSales[detail.product_name].revenue += detail.subtotal;
                });
            }

            const topProducts = Object.entries(productSales)
                .map(([name, data]) => ({ name, ...data }))
                .sort((a, b) => b.revenue - a.revenue)
                .slice(0, 15);

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
                    top_products: topProducts
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

    // Reporte de productos
    static async productReport(req, res) {
        try {
            const products = await Product.findAll();
            const topProducts = await SaleDetail.getTopProducts(20);
            
            // Productos con stock bajo
            const lowStockProducts = products.filter(p => p.stock <= 10);
            
            // Productos por categoría
            const productsByCategory = {};
            products.forEach(product => {
                const category = product.category_name || 'Sin Categoría';
                if (!productsByCategory[category]) {
                    productsByCategory[category] = [];
                }
                productsByCategory[category].push(product);
            });

            res.json({
                success: true,
                report: {
                    summary: {
                        total_products: products.length,
                        low_stock_products: lowStockProducts.length,
                        categories: Object.keys(productsByCategory).length
                    },
                    top_selling_products: topProducts,
                    low_stock_products: lowStockProducts,
                    products_by_category: productsByCategory
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

    // Reporte de ventas por usuario
    static async userReport(req, res) {
        try {
            const { startDate, endDate } = req.query;
            const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            const end = endDate || new Date().toISOString().split('T')[0];
            
            const sales = await Sale.findByDateRange(start, end);
            
            // Agrupar por usuario
            const userStats = {};
            sales.forEach(sale => {
                const userName = sale.user_name || 'Usuario Desconocido';
                if (!userStats[userName]) {
                    userStats[userName] = {
                        sales_count: 0,
                        total_amount: 0,
                        average_sale: 0
                    };
                }
                userStats[userName].sales_count += 1;
                userStats[userName].total_amount += sale.total;
            });

            // Calcular promedios
            Object.keys(userStats).forEach(userName => {
                const stats = userStats[userName];
                stats.average_sale = stats.total_amount / stats.sales_count;
            });

            // Ordenar por total de ventas
            const sortedUsers = Object.entries(userStats)
                .map(([name, stats]) => ({ name, ...stats }))
                .sort((a, b) => b.total_amount - a.total_amount);

            res.json({
                success: true,
                report: {
                    period: { start_date: start, end_date: end },
                    user_performance: sortedUsers,
                    summary: {
                        total_users: sortedUsers.length,
                        total_sales: sales.length,
                        total_amount: sales.reduce((sum, sale) => sum + sale.total, 0)
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

    // Dashboard principal con métricas clave
    static async dashboard(req, res) {
        try {
            // Obtener datos del día actual
            const todayTotals = await Sale.getTodayTotals();
            const monthlyTotals = await Sale.getMonthlyTotals();
            const topProductsToday = await SaleDetail.getTodayTopProducts(5);
            const topProductsOverall = await SaleDetail.getTopProducts(5);
            
            // Productos con stock bajo
            const allProducts = await Product.findAll();
            const lowStockProducts = allProducts.filter(p => p.stock <= 10);
            
            // Ventas recientes
            const recentSales = await Sale.findAll(10);

            res.json({
                success: true,
                dashboard: {
                    today: {
                        sales: todayTotals.total_sales || 0,
                        amount: todayTotals.total_amount || 0,
                        average: todayTotals.average_sale || 0
                    },
                    this_month: {
                        sales: monthlyTotals.total_sales || 0,
                        amount: monthlyTotals.total_amount || 0,
                        average: monthlyTotals.average_sale || 0
                    },
                    top_products_today: topProductsToday,
                    top_products_overall: topProductsOverall,
                    low_stock_alerts: lowStockProducts.length,
                    low_stock_products: lowStockProducts.slice(0, 5),
                    recent_sales: recentSales.slice(0, 5)
                }
            });

        } catch (error) {
            console.error('Error generando dashboard:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }
}

module.exports = ReportController;