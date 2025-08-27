// server/controllers/printController.js - Controlador completo
const printer = require('../utils/printer');
const Sale = require('../models/Sale');
const SaleDetail = require('../models/SaleDetail');

class PrintController {
    // Imprimir ticket de venta
    static async printSaleTicket(req, res) {
        try {
            const { saleId } = req.params;
            
            // Obtener datos de la venta
            const sale = await Sale.findById(saleId);
            if (!sale) {
                return res.status(404).json({
                    success: false,
                    message: 'Venta no encontrada'
                });
            }
            
            // Obtener detalles de la venta
            const details = await SaleDetail.findBySaleId(saleId);
            
            // Preparar datos para impresión
            const saleData = {
                ...sale,
                details
            };
            
            // Imprimir ticket
            const result = await printer.printSaleTicket(saleData);
            
            res.json({
                success: true,
                message: result.message,
                sale_id: saleId
            });
            
        } catch (error) {
            console.error('Error imprimiendo ticket:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    // Imprimir reporte del día
    static async printDailyReport(req, res) {
        try {
            const { date } = req.query;
            const targetDate = date || new Date().toISOString().split('T')[0];
            
            // Obtener datos del reporte
            const sales = await Sale.findByDateRange(targetDate, targetDate);
            const totalAmount = sales.reduce((sum, sale) => sum + sale.total, 0);
            const averageSale = sales.length > 0 ? totalAmount / sales.length : 0;
            
            // Productos más vendidos del día
            const productSales = {};
            for (const sale of sales) {
                const details = await SaleDetail.findBySaleId(sale.id);
                details.forEach(detail => {
                    if (!productSales[detail.product_name]) {
                        productSales[detail.product_name] = {
                            name: detail.product_name,
                            quantity: 0
                        };
                    }
                    productSales[detail.product_name].quantity += detail.quantity;
                });
            }
            
            const topProducts = Object.values(productSales)
                .sort((a, b) => b.quantity - a.quantity)
                .slice(0, 5);
            
            // Ventas por usuario
            const salesByUser = {};
            sales.forEach(sale => {
                const userName = sale.user_name || 'Usuario Desconocido';
                if (!salesByUser[userName]) {
                    salesByUser[userName] = { count: 0, amount: 0 };
                }
                salesByUser[userName].count += 1;
                salesByUser[userName].amount += sale.total;
            });
            
            const reportData = {
                date: targetDate,
                total_sales: sales.length,
                total_amount: totalAmount,
                average_sale: averageSale,
                top_products: topProducts,
                sales_by_user: salesByUser
            };
            
            // Imprimir reporte
            const result = await printer.printDailyReport(reportData);
            
            res.json({
                success: true,
                message: result.message,
                report_data: reportData
            });
            
        } catch (error) {
            console.error('Error imprimiendo reporte:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    // Imprimir ticket de prueba
    static async printTestTicket(req, res) {
        try {
            const result = await printer.printTestTicket();
            
            res.json({
                success: true,
                message: result.message
            });
            
        } catch (error) {
            console.error('Error en ticket de prueba:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    // Verificar estado de la impresora
    static async checkPrinterStatus(req, res) {
        try {
            const status = await printer.checkPrinterStatus();
            
            res.json({
                success: true,
                printer_status: status
            });
            
        } catch (error) {
            console.error('Error verificando impresora:', error);
            res.status(500).json({
                success: false,
                message: error.message,
                printer_status: {
                    connected: false,
                    message: 'Error verificando impresora'
                }
            });
        }
    }

    // Configurar impresora
    static async configurePrinter(req, res) {
        try {
            const { interface: printerInterface, width } = req.body;
            
            if (!printerInterface) {
                return res.status(400).json({
                    success: false,
                    message: 'Interface de conexión es requerida'
                });
            }
            
            const result = await printer.configurePrinter({
                interface: printerInterface,
                width: width || 48
            });
            
            res.json({
                success: true,
                message: result.message
            });
            
        } catch (error) {
            console.error('Error configurando impresora:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    // Reimprimir última venta
    static async reprintLastSale(req, res) {
        try {
            // Obtener la última venta del usuario
            const sales = await Sale.findByUser(req.user.id, 1);
            
            if (sales.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'No hay ventas para reimprimir'
                });
            }
            
            const lastSale = sales[0];
            const details = await SaleDetail.findBySaleId(lastSale.id);
            
            const saleData = {
                ...lastSale,
                details
            };
            
            const result = await printer.printSaleTicket(saleData);
            
            res.json({
                success: true,
                message: `Ticket reimpreso - Venta #${lastSale.id}`,
                sale_id: lastSale.id
            });
            
        } catch (error) {
            console.error('Error reimprimiendo ticket:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    // Imprimir reporte personalizado
    static async printCustomReport(req, res) {
        try {
            const { startDate, endDate, reportType } = req.body;
            
            if (!startDate || !endDate) {
                return res.status(400).json({
                    success: false,
                    message: 'Fechas de inicio y fin son requeridas'
                });
            }

            const sales = await Sale.findByDateRange(startDate, endDate);
            const totalAmount = sales.reduce((sum, sale) => sum + sale.total, 0);
            
            let reportData = {
                startDate,
                endDate,
                total_sales: sales.length,
                total_amount: totalAmount,
                average_sale: sales.length > 0 ? totalAmount / sales.length : 0
            };

            // Agregar datos específicos según el tipo de reporte
            if (reportType === 'products') {
                const productSales = {};
                for (const sale of sales) {
                    const details = await SaleDetail.findBySaleId(sale.id);
                    details.forEach(detail => {
                        if (!productSales[detail.product_name]) {
                            productSales[detail.product_name] = {
                                name: detail.product_name,
                                quantity: 0,
                                revenue: 0
                            };
                        }
                        productSales[detail.product_name].quantity += detail.quantity;
                        productSales[detail.product_name].revenue += detail.subtotal;
                    });
                }
                
                reportData.top_products = Object.values(productSales)
                    .sort((a, b) => b.revenue - a.revenue)
                    .slice(0, 10);
            }

            // Imprimir reporte personalizado
            const result = await printer.printDailyReport(reportData);
            
            res.json({
                success: true,
                message: result.message,
                report_data: reportData
            });
            
        } catch (error) {
            console.error('Error imprimiendo reporte personalizado:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    // Obtener configuración actual de la impresora
    static async getPrinterConfig(req, res) {
        try {
            const config = {
                printerInterface: process.env.PRINTER_INTERFACE || 'printer:EPSON TM-T20III',
                model: 'Epson TM-T20IIIL',
                width: 48,
                company: {
                    name: process.env.COMPANY_NAME || 'TU EMPRESA',
                    address: process.env.COMPANY_ADDRESS || 'Dirección',
                    city: process.env.COMPANY_CITY || 'Ciudad',
                    phone: process.env.COMPANY_PHONE || 'Teléfono',
                    email: process.env.COMPANY_EMAIL || 'Email',
                    nit: process.env.COMPANY_NIT || 'NIT'
                }
            };
            
            res.json({
                success: true,
                config
            });
            
        } catch (error) {
            console.error('Error obteniendo configuración:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    // Imprimir copia de seguridad de ventas
    static async printBackupReport(req, res) {
        try {
            const { date } = req.query;
            const targetDate = date || new Date().toISOString().split('T')[0];
            
            const sales = await Sale.findByDateRange(targetDate, targetDate);
            
            if (sales.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'No hay ventas para el día seleccionado'
                });
            }

            // Preparar datos detallados para backup
            const detailedSales = [];
            for (const sale of sales) {
                const details = await SaleDetail.findBySaleId(sale.id);
                detailedSales.push({
                    ...sale,
                    details
                });
            }

            const backupData = {
                date: targetDate,
                total_sales: sales.length,
                total_amount: sales.reduce((sum, sale) => sum + sale.total, 0),
                detailed_sales: detailedSales
            };

            // Imprimir backup detallado
            const result = await printer.printDailyReport(backupData);
            
            res.json({
                success: true,
                message: `Backup impreso - ${sales.length} ventas`,
                backup_data: {
                    date: targetDate,
                    sales_count: sales.length,
                    total_amount: backupData.total_amount
                }
            });
            
        } catch (error) {
            console.error('Error imprimiendo backup:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
}

module.exports = PrintController;