// server/utils/printer-escpos.js - Implementación con ESC/POS
const escpos = require('escpos');
const moment = require('moment');

// Configurar adaptador USB
escpos.USB = require('escpos-usb');

class POSPrinter {
    constructor() {
        this.printer = null;
        this.device = null;
        this.isConnected = false;
        this.initPrinter();
    }

    async initPrinter() {
        try {
            console.log('🔍 Buscando impresoras USB...');
            
            // Buscar dispositivos USB
            const devices = escpos.USB.findPrinter();
            console.log('📋 Dispositivos encontrados:', devices.length);
            
            if (devices.length === 0) {
                throw new Error('No se encontraron impresoras USB conectadas');
            }

            // Usar la primera impresora encontrada
            this.device = new escpos.USB(devices[0].vendorId, devices[0].productId);
            this.printer = new escpos.Printer(this.device);
            
            console.log('✅ Impresora detectada:');
            console.log(`   - Vendor ID: ${devices[0].vendorId}`);
            console.log(`   - Product ID: ${devices[0].productId}`);
            console.log(`   - Manufacturer: ${devices[0].manufacturer || 'N/A'}`);
            console.log(`   - Product: ${devices[0].product || 'N/A'}`);
            
            this.isConnected = true;
            
        } catch (error) {
            console.error('❌ Error inicializando impresora:', error.message);
            this.isConnected = false;
            this.suggestSolutions();
        }
    }

    suggestSolutions() {
        console.log('\n🆘 SOLUCIONES RECOMENDADAS:');
        console.log('1. Verifica que la impresora esté encendida y conectada por USB');
        console.log('2. Instala drivers oficiales de Epson desde: https://epson.com/support');
        console.log('3. Verifica que aparezca en "Panel de Control > Dispositivos e impresoras"');
        console.log('4. Prueba desconectar y reconectar el cable USB');
        console.log('5. Cambia de puerto USB');
        console.log('6. Ejecuta este programa como Administrador');
    }

    // Configurar datos de la empresa
    getCompanyInfo() {
        return {
            name: process.env.COMPANY_NAME || 'TU EMPRESA',
            address: process.env.COMPANY_ADDRESS || 'Dirección de tu empresa',
            city: process.env.COMPANY_CITY || 'Cochabamba, Bolivia',
            phone: process.env.COMPANY_PHONE || 'Tel: +591 XXX XXXXX',
            email: process.env.COMPANY_EMAIL || 'email@empresa.com',
            nit: process.env.COMPANY_NIT || 'NIT: XXXXXXXXX'
        };
    }

    // Verificar estado de la impresora
    async checkPrinterStatus() {
        try {
            // Buscar dispositivos disponibles
            const devices = escpos.USB.findPrinter();
            
            return {
                connected: devices.length > 0,
                message: devices.length > 0 ? 
                    `Encontradas ${devices.length} impresora(s) USB` : 
                    'No se encontraron impresoras USB',
                model: 'EPSON TM-T20IIII Receipt (USB)',
                interface: 'USB',
                devices: devices.map(d => ({
                    vendor: d.vendorId,
                    product: d.productId,
                    manufacturer: d.manufacturer,
                    name: d.product
                })),
                suggestions: devices.length === 0 ? [
                    'Verificar que la impresora esté encendida',
                    'Verificar conexión USB',
                    'Instalar drivers oficiales de Epson',
                    'Ejecutar como administrador'
                ] : []
            };
            
        } catch (error) {
            return {
                connected: false,
                message: `Error verificando impresoras: ${error.message}`,
                troubleshooting: [
                    'Verificar conexión USB',
                    'Instalar drivers de Epson',
                    'Ejecutar como administrador',
                    'Reiniciar la impresora'
                ]
            };
        }
    }

    // Imprimir ticket de prueba
    async printTestTicket() {
        if (!this.isConnected) {
            throw new Error('Impresora no conectada. Verifica la conexión USB y que esté encendida.');
        }

        return new Promise((resolve, reject) => {
            try {
                this.device.open((error) => {
                    if (error) {
                        reject(new Error(`No se puede abrir la impresora: ${error.message}`));
                        return;
                    }

                    const company = this.getCompanyInfo();

                    this.printer
                        .font('a')
                        .align('ct')
                        .style('bu')
                        .size(1, 1)
                        .text('🧪 TICKET DE PRUEBA')
                        .style('normal')
                        .size(0, 0)
                        .text('')
                        .text('================================')
                        .text('')
                        .text(company.name)
                        .text(company.address)
                        .text(company.city)
                        .text(company.phone)
                        .text('')
                        .text('================================')
                        .text('')
                        .align('lt')
                        .text(`📅 Fecha: ${moment().format('DD/MM/YYYY HH:mm:ss')}`)
                        .text('🖨️ Modelo: EPSON TM-T20IIII Receipt')
                        .text('🔧 Conexión: USB')
                        .text('📊 Estado: Funcionando correctamente')
                        .text('')
                        .text('================================')
                        .text('')
                        .text('Prueba de caracteres especiales:')
                        .text('ñáéíóúü ÑÁÉÍÓÚÜ')
                        .text('¡¿°±×÷§¶')
                        .text('$ € £ ¥')
                        .text('')
                        .text('================================')
                        .text('')
                        .align('ct')
                        .style('bu')
                        .text('✅ PRUEBA EXITOSA')
                        .style('normal')
                        .text('Si ves este ticket,')
                        .text('la impresora funciona correctamente!')
                        .text('')
                        .text('')
                        .text('')
                        .cut()
                        .close(() => {
                            console.log('✅ Ticket de prueba impreso correctamente');
                            resolve({
                                success: true,
                                message: 'Ticket de prueba impreso - verifica que salió físicamente'
                            });
                        });
                });

            } catch (error) {
                reject(new Error(`Error en impresión: ${error.message}`));
            }
        });
    }

    // Imprimir ticket de venta
    async printSaleTicket(saleData) {
        if (!this.isConnected) {
            throw new Error('Impresora no conectada. Verifica USB y que esté encendida.');
        }

        return new Promise((resolve, reject) => {
            try {
                this.device.open((error) => {
                    if (error) {
                        reject(new Error(`No se puede abrir la impresora: ${error.message}`));
                        return;
                    }

                    const company = this.getCompanyInfo();

                    // Comenzar impresión
                    let printer = this.printer
                        .font('a')
                        .align('ct')
                        .style('bu')
                        .size(1, 1)
                        .text(company.name)
                        .style('normal')
                        .size(0, 0)
                        .text(company.address)
                        .text(company.city)
                        .text(company.phone)
                        .text(company.email)
                        .text(company.nit)
                        .text('')
                        .text('================================')
                        .text('')
                        .align('lt')
                        .style('bu')
                        .text(`TICKET DE VENTA #${saleData.id}`)
                        .style('normal')
                        .text('')
                        .text(`Fecha: ${moment().format('DD/MM/YYYY HH:mm:ss')}`)
                        .text(`Cajero: ${saleData.user_name || 'Sistema'}`);

                    // Información del cliente
                    if (saleData.customer_name) {
                        printer.text(`Cliente: ${saleData.customer_name}`);
                    }
                    if (saleData.customer_nit) {
                        printer.text(`NIT/CI: ${saleData.customer_nit}`);
                    }

                    printer.text(`Tipo: ${saleData.order_type === 'takeaway' ? 'Para Llevar' : 'En Mesa'}`);

                    if (saleData.table_number) {
                        printer.text(`Mesa: ${saleData.table_number}`);
                    }
                    if (saleData.observations) {
                        printer.text(`Obs: ${saleData.observations}`);
                    }

                    printer
                        .text('')
                        .text('================================')
                        .text('')
                        .style('bu')
                        .text('Producto         Cant  P.Unit  Total')
                        .style('normal')
                        .text('--------------------------------');

                    // Productos
                    if (saleData.details && saleData.details.length > 0) {
                        saleData.details.forEach(item => {
                            const productLine = this.formatProductLine(
                                item.product_name,
                                item.quantity,
                                item.unit_price,
                                item.subtotal
                            );
                            printer.text(productLine);
                        });
                    }

                    printer
                        .text('--------------------------------')
                        .text('')
                        .align('rt')
                        .text(`Subtotal: $${saleData.subtotal.toFixed(2)}`)
                        .style('bu')
                        .size(1, 1)
                        .text(`TOTAL: $${saleData.total.toFixed(2)}`)
                        .style('normal')
                        .size(0, 0)
                        .text('')
                        .align('lt')
                        .text(`Pagado: $${saleData.paid_amount.toFixed(2)}`)
                        .text(`Cambio: $${saleData.change_amount.toFixed(2)}`)
                        .text('')
                        .align('ct')
                        .text('¡Gracias por su compra!')
                        .text('Que tenga un excelente día')
                        .text('')
                        .text('')
                        .text('')
                        .cut()
                        .close(() => {
                            console.log('✅ Ticket de venta impreso correctamente');
                            resolve({
                                success: true,
                                message: 'Ticket impreso correctamente'
                            });
                        });
                });

            } catch (error) {
                reject(new Error(`Error en impresión: ${error.message}`));
            }
        });
    }

    // Formatear línea de producto para el ticket
    formatProductLine(name, qty, price, total) {
        // Truncar nombre si es muy largo
        const maxNameLength = 16;
        const shortName = name.length > maxNameLength ? 
            name.substring(0, maxNameLength - 3) + '...' : 
            name;

        // Formatear con espacios fijos
        const line = 
            shortName.padEnd(17) +
            qty.toString().padStart(4) +
            price.toFixed(2).padStart(7) +
            total.toFixed(2).padStart(7);

        return line;
    }

    // Imprimir reporte diario
    async printDailyReport(reportData) {
        if (!this.isConnected) {
            throw new Error('Impresora no conectada');
        }

        return new Promise((resolve, reject) => {
            try {
                this.device.open((error) => {
                    if (error) {
                        reject(new Error(`No se puede abrir la impresora: ${error.message}`));
                        return;
                    }

                    const company = this.getCompanyInfo();

                    let printer = this.printer
                        .font('a')
                        .align('ct')
                        .style('bu')
                        .size(1, 1)
                        .text(company.name)
                        .text('REPORTE DIARIO')
                        .style('normal')
                        .size(0, 0)
                        .text('')
                        .text(moment().format('DD/MM/YYYY'))
                        .text('================================')
                        .text('')
                        .align('lt')
                        .style('bu')
                        .text('RESUMEN DEL DÍA')
                        .style('normal')
                        .text('')
                        .text(`Total de ventas: ${reportData.total_sales}`)
                        .text(`Monto total: $${reportData.total_amount.toFixed(2)}`)
                        .text(`Venta promedio: $${reportData.average_sale.toFixed(2)}`)
                        .text('')
                        .text('================================');

                    // Productos más vendidos
                    if (reportData.top_products && reportData.top_products.length > 0) {
                        printer
                            .text('')
                            .style('bu')
                            .text('PRODUCTOS MÁS VENDIDOS')
                            .style('normal')
                            .text('');

                        reportData.top_products.forEach((product, index) => {
                            printer.text(`${index + 1}. ${product.name} (${product.quantity} uds)`);
                        });

                        printer.text('================================');
                    }

                    // Ventas por usuario
                    if (reportData.sales_by_user) {
                        printer
                            .text('')
                            .style('bu')
                            .text('VENTAS POR USUARIO')
                            .style('normal')
                            .text('');

                        Object.entries(reportData.sales_by_user).forEach(([user, data]) => {
                            printer.text(`${user}: ${data.count} ventas - $${data.amount.toFixed(2)}`);
                        });
                    }

                    printer
                        .text('')
                        .text('================================')
                        .text('')
                        .align('ct')
                        .text(`Reporte generado: ${moment().format('DD/MM/YYYY HH:mm:ss')}`)
                        .text('')
                        .text('')
                        .text('')
                        .cut()
                        .close(() => {
                            console.log('✅ Reporte diario impreso correctamente');
                            resolve({
                                success: true,
                                message: 'Reporte impreso correctamente'
                            });
                        });
                });

            } catch (error) {
                reject(new Error(`Error en impresión: ${error.message}`));
            }
        });
    }

    // Configurar impresora
    async configurePrinter(config) {
        try {
            await this.initPrinter();
            return { success: true, message: 'Impresora reconfigurada correctamente' };
        } catch (error) {
            throw new Error(`Error configurando impresora: ${error.message}`);
        }
    }
}

module.exports = new POSPrinter();