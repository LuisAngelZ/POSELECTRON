// backend/controllers/reportController.new.js
const ReportService = require('../services/ReportService');

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

            // Validar y ajustar fechas a zona horaria de Bolivia
            const startDate = new Date(start_date + 'T00:00:00-04:00');
            const endDate = new Date(end_date + 'T23:59:59-04:00');
            
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: 'Formato de fecha inválido'
                });
            }

            // Convertir a formato SQLite
            const startDateStr = startDate.toISOString().slice(0, 10);
            const endDateStr = endDate.toISOString().slice(0, 10);
            
            console.log('Fechas procesadas:', {
                startDateStr,
                endDateStr,
                payment_type: payment_type || 'all',
                product_id: product_id || 'none'
            });

            const filters = {
                payment_type: payment_type,
                product_id: product_id
            };

            const reportData = await ReportService.getFilteredReport(
                startDateStr,
                endDateStr,
                filters
            );

            res.json(reportData);

        } catch (error) {
            console.error('Error generando reporte filtrado:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }

    static async dashboard(req, res) {
        try {
            const date = ReportService.getBoliviaDateTime();
            const [todayStats, weeklyStats, monthlyStats] = await Promise.all([
                ReportService.getFilteredReport(date, date),
                ReportService.getFilteredReport(
                    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
                    date
                ),
                ReportService.getFilteredReport(
                    new Date(date).toISOString().slice(0, 7) + '-01',
                    date
                )
            ]);

            res.json({
                success: true,
                dashboard: {
                    today: todayStats.report.summary,
                    this_week: weeklyStats.report.summary,
                    this_month: monthlyStats.report.summary,
                    top_products_today: todayStats.report.top_products,
                    recent_sales: todayStats.report.sales.slice(0, 10)
                }
            });

        } catch (error) {
            console.error('Error generando dashboard:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }
}

module.exports = ReportController;