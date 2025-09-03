// server/routes/printer.js - VERSIÓN CORREGIDA
const express = require('express');
const router = express.Router();
const printer = require('../utils/printer');

// Importar middleware de autenticación - CORREGIDO
// Cambiar según tu estructura de archivos:
let authenticateToken;

try {
    // Opción 1: Si es un objeto con la función
    const auth = require('../middleware/auth');
    authenticateToken = auth.authenticateToken || auth;
} catch (error1) {
    try {
        // Opción 2: Si está en routes/auth.js
        const auth = require('./auth');
        authenticateToken = auth.authenticateToken || auth;
    } catch (error2) {
        // Opción 3: Middleware simple si no existe
        console.warn('⚠️ Middleware de autenticación no encontrado, usando middleware básico');
        authenticateToken = (req, res, next) => next(); // Middleware que permite pasar
    }
}

// Ruta: GET /api/printer/status
router.get('/status', authenticateToken, async (req, res) => {
    try {
        const status = await printer.checkPrinterStatus();
        res.json({
            success: true,
            printer_status: status
        });
    } catch (error) {
        console.error('Error verificando estado de impresora:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Ruta: POST /api/printer/test
router.post('/test', authenticateToken, async (req, res) => {
    try {
        console.log('🧪 Iniciando test de impresora...');
        const result = await printer.printTestTicket();
        console.log('✅ Test de impresora completado');
        res.json(result);
    } catch (error) {
        console.error('❌ Error en test de impresora:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// NUEVA RUTA: POST /api/printer/print-sale (IMPRESIÓN AUTOMÁTICA)
router.post('/print-sale', authenticateToken, async (req, res) => {
    try {
        const { sale_data } = req.body;
        
        if (!sale_data) {
            return res.status(400).json({
                success: false,
                message: 'Datos de venta requeridos para impresión'
            });
        }

        console.log('🖨️ Iniciando impresión automática de venta #', sale_data.id);

        // Imprimir usando el printer.js modificado
        const result = await printer.printSaleTicket(sale_data);
        
        console.log('✅ Impresión automática exitosa para venta #', sale_data.id);
        
        res.json({
            success: true,
            message: 'Ticket de venta impreso automáticamente',
            printer_status: result
        });
        
    } catch (error) {
        console.error('❌ Error en impresión automática:', error);
        res.status(500).json({
            success: false,
            message: `Error en impresión: ${error.message}`
        });
    }
});

// Ruta: POST /api/printer/reprint-last
router.post('/reprint-last', authenticateToken, async (req, res) => {
    try {
        // Por ahora respuesta básica - puedes implementar lógica para última venta
        console.log('🔄 Solicitud de reimpresión de último ticket');
        res.json({
            success: false,
            message: 'Función de reimpresión no implementada aún'
        });
    } catch (error) {
        console.error('❌ Error en reimpresión:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Ruta: POST /api/printer/configure
router.post('/configure', authenticateToken, async (req, res) => {
    try {
        const { printerName, thermalWidth } = req.body;
        
        console.log('⚙️ Configurando impresora:', { printerName, thermalWidth });
        
        const result = await printer.configurePrinter({
            printerName,
            thermalWidth
        });
        
        console.log('✅ Impresora reconfigurada');
        res.json(result);
    } catch (error) {
        console.error('❌ Error configurando impresora:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ===== AGREGAR ESTA RUTA AL ARCHIVO backend/routes/printer.js =====

// NUEVA RUTA: POST /api/printer/daily-report (CIERRE DE CAJA F3)
router.post('/daily-report', authenticateToken, async (req, res) => {
    try {
        const { report_data } = req.body;
        
        if (!report_data) {
            return res.status(400).json({
                success: false,
                message: 'Datos del reporte requeridos para impresión'
            });
        }

        console.log('📊 Iniciando impresión de reporte diario para:', report_data.date);

        // Validar que tengamos datos mínimos
        const summary = report_data.summary || {};
        const user = report_data.user || {};
        
        // Crear contenido del reporte para imprimir
        const reportContent = createDailyReportContent(report_data);
        
        // Usar el printer.js para imprimir
        const result = await printer.printDailyReport(reportContent);
        
        console.log('✅ Reporte diario impreso exitosamente');
        
        res.json({
            success: true,
            message: `Reporte de cierre impreso - ${report_data.date}`,
            summary: {
                date: report_data.date,
                total_sales: summary.total_sales || 0,
                total_amount: summary.total_amount || 0,
                user: user.full_name || 'Sistema'
            }
        });
        
    } catch (error) {
        console.error('❌ Error en impresión de reporte diario:', error);
        res.status(500).json({
            success: false,
            message: `Error en impresión de reporte: ${error.message}`,
            error_details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// ===== FUNCIÓN AUXILIAR PARA CREAR CONTENIDO DEL REPORTE =====
function createDailyReportContent(reportData) {
    const summary = reportData.summary || {};
    const topProducts = reportData.top_products || [];
    const salesByUser = reportData.sales_by_user || [];
    const user = reportData.user || {};
    
    return {
        type: 'daily_report',
        date: reportData.date,
        user_name: user.full_name || 'Sistema',
        user_id: user.id || 0,
        total_sales: summary.total_sales || 0,
        total_amount: summary.total_amount || 0,
        average_sale: summary.average_sale || 0,
        top_products: topProducts.map(product => ({
            name: product.product_name,
            quantity: product.total_quantity || 0,
            revenue: product.total_revenue || 0
        })),
        sales_by_user: salesByUser.map(userSales => ({
            user_name: userSales.user_name || userSales.full_name,
            count: userSales.total_sales || 0,
            amount: userSales.total_amount || 0,
            average: userSales.average || 0
        }))
    };
}

module.exports = router;