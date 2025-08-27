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

module.exports = router;