// server/utils/printer.js - Versión completa con cierre de caja F3
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const moment = require('moment');

class POSPrinter {
    constructor() {
        this.printerName = process.env.PRINTER_NAME || 'EPSON TM-T20III Receipt';
        this.isConnected = false;
        this.tempDir = path.join(__dirname, '../../temp');
        // Ancho que funcionaba bien
        this.thermalWidth = 36;
        this.initPrinter();
    }

    async initPrinter() {
        try {
            // Crear directorio temporal si no existe
            if (!fs.existsSync(this.tempDir)) {
                fs.mkdirSync(this.tempDir, { recursive: true });
            }

            // Verificar que la impresora esté instalada en Windows
            const printers = this.getWindowsPrinters();
            const found = printers.some(printer => 
                printer.toLowerCase().includes('epson') || 
                printer.toLowerCase().includes('tm-t20')
            );

            if (found) {
                this.isConnected = true;
                console.log('✅ Impresora EPSON detectada en Windows');
                console.log(`📋 Usando: ${this.printerName}`);
            } else {
                console.log('⚠️ Impresora EPSON no encontrada en la lista de Windows');
                this.isConnected = false;
            }
            
        } catch (error) {
            console.error('❌ Error verificando impresoras de Windows:', error.message);
            this.isConnected = false;
        }
    }

    getWindowsPrinters() {
        try {
            const { execSync } = require('child_process');
            const result = execSync('wmic printer get name', { encoding: 'utf8' });
            return result.split('\n')
                .map(line => line.trim())
                .filter(line => line && line !== 'Name')
                .filter(line => line.length > 0);
        } catch (error) {
            console.warn('No se pueden obtener impresoras de Windows');
            return [];
        }
    }

    // FUNCIÓN PARA QUITAR ACENTOS
    removeAccents(text) {
        const accents = {
            'Á': 'A', 'É': 'E', 'Í': 'I', 'Ó': 'O', 'Ú': 'U', 'Ü': 'U', 'Ñ': 'N',
            'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u', 'ü': 'u', 'ñ': 'n',
            'À': 'A', 'È': 'E', 'Ì': 'I', 'Ò': 'O', 'Ù': 'U',
            'à': 'a', 'è': 'e', 'ì': 'i', 'ò': 'o', 'ù': 'u',
            'Â': 'A', 'Ê': 'E', 'Î': 'I', 'Ô': 'O', 'Û': 'U',
            'â': 'a', 'ê': 'e', 'î': 'i', 'ô': 'o', 'û': 'u',
            'Ã': 'A', 'Õ': 'O', 'ã': 'a', 'õ': 'o',
            'Ç': 'C', 'ç': 'c'
        };
        
        return text.replace(/[ÁÉÍÓÚÜÑáéíóúüñÀÈÌÒÙàèìòùÂÊÎÔÛâêîôûÃÕãõÇç]/g, 
            char => accents[char] || char);
    }

    // Funciones de formato profesional
    centerText(text, width = this.thermalWidth) {
        const cleanText = this.removeAccents(text);
        const spaces = Math.max(0, Math.floor((width - cleanText.length) / 2));
        return ' '.repeat(spaces) + cleanText;
    }

    alignRight(text, width = this.thermalWidth) {
        const cleanText = this.removeAccents(text);
        const spaces = Math.max(0, width - cleanText.length);
        return ' '.repeat(spaces) + cleanText;
    }

    // TICKET DE PRUEBA CON FORMATO QUE FUNCIONABA BIEN
    createTestTicket() {
        const now = new Date();
        const ticketNumber = Math.floor(Math.random() * 999999).toString().padStart(6, '0');
        const separator = '-'.repeat(this.thermalWidth);
        
        return `${this.centerText(`No ${ticketNumber}`)}
${this.centerText('EN MESA')}
FECHA: ${now.toLocaleDateString('es-ES')} ${now.toLocaleTimeString('es-ES')}
SENOR(ES): SIN NOMBRE
${separator}
CANT  DESCRIPCION      P.U.  TOTAL
${separator}
 1 PIZZA MARGHERITA   25.00  25.00
 2 COCA COLA 350ML     8.00  16.00
 1 ENSALADA CAESAR    15.00  15.00
${separator}
${this.alignRight('TOTAL Bs: 56.00')}

OBS.: TICKET DE PRUEBA

CAJERO: ADMINISTRADOR
GRACIAS POR SU PREFERENCIA...!!!`;
    }

    // TICKET DE VENTA CON FORMATO QUE FUNCIONABA BIEN
    createSaleTicket(saleData) {
        const ticketNumber = saleData.id.toString().padStart(6, '0');
        const orderType = saleData.order_type === 'takeaway' ? 'PARA LLEVAR' : 'EN MESA';
        const separator = '-'.repeat(this.thermalWidth);
        
        let content = `${this.centerText(`No ${ticketNumber}`)}
${this.centerText(orderType)}
FECHA: ${moment().format('DD/MM/YYYY HH:mm:ss')}`;

        // Información del cliente SIN ACENTOS
        if (saleData.customer_name && saleData.customer_name !== 'SIN NOMBRE') {
            const cleanName = this.removeAccents(saleData.customer_name.toUpperCase());
            content += `\nSENOR(ES): ${cleanName}`;
        } else {
            content += `\nSENOR(ES): SIN NOMBRE`;
        }

        // Separador y cabecera SIN ACENTOS
        content += `\n${separator}`;
        content += `\nCANT  DESCRIPCION      P.U.  TOTAL`;
        content += `\n${separator}`;

        // Productos con formato que funcionaba bien
        if (saleData.details && saleData.details.length > 0) {
            saleData.details.forEach(item => {
                const qty = item.quantity;
                const description = this.removeAccents(item.product_name.toUpperCase());
                const unitPrice = parseFloat(item.unit_price);
                const total = parseFloat(item.subtotal);
                
                // Formato que funcionaba bien PERO sin acentos
                const qtyStr = qty.toString().padStart(2);
                const descStr = description.length > 15 ? 
                    description.substring(0, 12) + '...' : 
                    description.padEnd(15);
                const priceStr = unitPrice.toFixed(2).padStart(6);
                const totalStr = total.toFixed(2).padStart(6);
                
                content += `\n${qtyStr}    ${descStr} ${priceStr} ${totalStr}`;
            });
        }

        content += `\n${separator}`;
        
        // Total
        const total = parseFloat(saleData.total || 0);
        content += `\n${this.alignRight(`TOTAL Bs:${total.toFixed(2)}`,35)}`;
        
        // Observaciones SIN ACENTOS
        if (saleData.observations) {
            const cleanObs = this.removeAccents(saleData.observations.toUpperCase());
            content += `\nOBS.: ${cleanObs}`;
            content += `\n`;
        }

        // Información del cajero SIN ACENTOS
        const cajero = saleData.user_name || 'SISTEMA';
        const cleanCajero = this.removeAccents(cajero.toUpperCase());
        content += `\nCAJERO: ${cleanCajero}`;
        content += `\nGRACIAS POR SU PREFERENCIA...!!!`;

        return content;
    }

    // ===== NUEVA FUNCIÓN PARA CREAR CONTENIDO DEL REPORTE DIARIO =====
  createDailyReportContent(reportData) {
    const date = reportData.date || new Date().toISOString().split('T')[0];
    const userName = reportData.user_name || 'SISTEMA';
    const totalSales = reportData.total_sales || 0;
    const totalAmount = reportData.total_amount || 0;
    
    const separator = '='.repeat(this.thermalWidth);
    const separator1 = ' '.repeat(this.thermalWidth);
    
    let content = `${this.centerText('CIERRE DE CAJA')}
${this.centerText('REPORTE DIARIO')}
${separator}
FECHA Y HORA: ${moment().format('DD/MM/YYYY HH:mm:ss')}
CAJERO: ${this.removeAccents(userName.toUpperCase())}
${separator}
RESUMEN DEL DIA Nro Ventas:  ${totalSales}
${separator}
Monto Total: ${parseInt(totalAmount)} Bs
${separator1}`;
    return content;
}

    // PowerShell que funcionaba bien + encoding para acentos
    async printTicket(content, filename = 'ticket') {
        return new Promise((resolve, reject) => {
            try {
                const filePath = path.join(this.tempDir, `${filename}.txt`);
                
                // Guardar con encoding que funciona bien para impresoras térmicas
                fs.writeFileSync(filePath, content, 'latin1');

                console.log(`🖨️ Enviando ticket a impresora: ${this.printerName}`);
                
                // Script PowerShell que funcionaba bien
                const psScript = `
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms

$content = Get-Content "${filePath}" -Raw

# Configurar impresión para formato profesional
$printDocument = New-Object System.Drawing.Printing.PrintDocument
$printDocument.PrinterSettings.PrinterName = "${this.printerName}"

# Márgenes que funcionaban bien
$printDocument.DefaultPageSettings.Margins = New-Object System.Drawing.Printing.Margins(3, 3, 3, 3)

# Configurar papel térmico
$paperSizes = $printDocument.PrinterSettings.PaperSizes
$thermalPaper = $null
foreach ($size in $paperSizes) {
    if ($size.PaperName -like "*80*" -or $size.PaperName -like "*Thermal*" -or $size.Width -eq 315) {
        $thermalPaper = $size
        break
    }
}

if ($thermalPaper -ne $null) {
    $printDocument.DefaultPageSettings.PaperSize = $thermalPaper
} else {
    $customPaper = New-Object System.Drawing.Printing.PaperSize("Thermal80mm", 315, 3150)
    $printDocument.DefaultPageSettings.PaperSize = $customPaper
}

$printDocument.add_PrintPage({
    param($sender, $e)
    
    # Fuente que funcionaba bien
    $font = New-Object System.Drawing.Font("Courier New", 8, [System.Drawing.FontStyle]::Bold)
    $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::Black)
    
    # Posicionamiento que funcionaba bien
    $x = 8   # Margen izquierdo
    $y = 5   # Margen superior
    $lineHeight = $font.GetHeight($e.Graphics) * 0.95
    
    $lines = $content -split "\\r?\\n"
    foreach ($line in $lines) {
        if ($line.Trim() -ne "") {
            $e.Graphics.DrawString($line, $font, $brush, $x, $y)
        }
        $y += $lineHeight
        
        if ($y -gt $e.MarginBounds.Bottom) {
            break
        }
    }
    
    $font.Dispose()
    $brush.Dispose()
})

try {
    $printDocument.Print()
    Write-Host "✅ Ticket impreso correctamente sin acentos raros"
} catch {
    Write-Error "❌ Error en impresión: $_"
    throw $_
} finally {
    $printDocument.Dispose()
}
`;
                
                const psFilePath = path.join(this.tempDir, `${filename}.ps1`);
                fs.writeFileSync(psFilePath, psScript, 'utf8');
                
                const command = `powershell.exe -ExecutionPolicy Bypass -File "${psFilePath}"`;
                
                exec(command, { encoding: 'utf8' }, (error, stdout, stderr) => {
                    // Limpiar archivos temporales
                    try {
                        fs.unlinkSync(filePath);
                        fs.unlinkSync(psFilePath);
                    } catch (e) {
                        console.warn('No se pudieron eliminar archivos temporales');
                    }

                    if (error) {
                        console.error('❌ Error con PowerShell:', error.message);
                        reject(new Error(`Error en PowerShell: ${error.message}`));
                        return;
                    }

                    console.log('✅ Ticket impreso - formato que funcionaba bien pero sin acentos');
                    resolve({
                        success: true,
                        message: 'Ticket impreso - versión buena sin acentos',
                        method: 'PowerShell Good Version No Accents'
                    });
                });

            } catch (error) {
                reject(new Error(`Error preparando impresión: ${error.message}`));
            }
        });
    }

    // ===== NUEVA FUNCIÓN PARA IMPRIMIR REPORTE DIARIO =====
    async printDailyReport(reportData) {
        if (!this.isConnected) {
            throw new Error('Impresora no encontrada en Windows.');
        }

        try {
            const content = this.createDailyReportContent(reportData);
            const result = await this.printTicket(content, `daily_report_${reportData.date || 'today'}`);
            
            console.log('✅ Reporte diario impreso correctamente');
            return {
                success: true,
                message: 'Reporte de cierre impreso correctamente',
                date: reportData.date
            };
            
        } catch (error) {
            console.error('❌ Error imprimiendo reporte diario:', error);
            throw new Error(`Error en impresión de reporte: ${error.message}`);
        }
    }

    // Métodos principales
    async checkPrinterStatus() {
        try {
            const printers = this.getWindowsPrinters();
            const epsonPrinters = printers.filter(p => 
                p.toLowerCase().includes('epson') || 
                p.toLowerCase().includes('tm-t20')
            );

            return {
                connected: epsonPrinters.length > 0,
                message: epsonPrinters.length > 0 ? 
                    `✅ Impresora EPSON encontrada: ${epsonPrinters[0]}` : 
                    '❌ Impresora EPSON no encontrada en Windows',
                model: 'EPSON TM-T20III Receipt',
                interface: 'Windows PowerShell Good Version',
                thermal_width: this.thermalWidth,
                available_printers: printers,
                epson_printers: epsonPrinters,
                using_printer: this.printerName
            };
            
        } catch (error) {
            return {
                connected: false,
                message: `Error verificando impresoras: ${error.message}`
            };
        }
    }

    async printTestTicket() {
        if (!this.isConnected) {
            throw new Error('Impresora no encontrada en Windows. Verifica que esté instalada.');
        }

        try {
            const content = this.createTestTicket();
            const result = await this.printTicket(content, 'test_ticket');
            
            console.log('✅ Ticket de prueba - versión buena enviado');
            return {
                success: true,
                message: 'Test impreso - versión que funcionaba bien',
                printer: this.printerName
            };
            
        } catch (error) {
            console.error('❌ Error imprimiendo ticket de prueba:', error);
            throw new Error(`Error en impresión: ${error.message}`);
        }
    }

    async printSaleTicket(saleData) {
        if (!this.isConnected) {
            throw new Error('Impresora no encontrada en Windows.');
        }

        try {
            const content = this.createSaleTicket(saleData);
            const result = await this.printTicket(content, `sale_${saleData.id}`);
            
            console.log('✅ Ticket de venta - versión buena impreso');
            return {
                success: true,
                message: 'Ticket impreso - versión que funcionaba bien sin acentos'
            };
            
        } catch (error) {
            console.error('❌ Error imprimiendo ticket de venta:', error);
            throw new Error(`Error en impresión: ${error.message}`);
        }
    }

    async configurePrinter(config) {
        try {
            if (config.printerName) {
                this.printerName = config.printerName;
            }
            if (config.thermalWidth) {
                this.thermalWidth = config.thermalWidth;
            }
            await this.initPrinter();
            return { success: true, message: 'Impresora reconfigurada correctamente' };
        } catch (error) {
            throw new Error(`Error configurando impresora: ${error.message}`);
        }
    }
}

module.exports = new POSPrinter();