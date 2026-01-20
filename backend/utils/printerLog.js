// Utilitario para mejorar manejo de errores en printer.js
class PrinterLog {
    static info(message) {
        console.log(`🖨️ ${message}`);
    }

    static error(message, error = null) {
        console.error(`❌ Error de impresión: ${message}`);
        if (error) {
            console.error(error);
        }
    }

    static warning(message) {
        console.warn(`⚠️ Advertencia: ${message}`);
    }

    static success(message) {
        console.log(`✅ ${message}`);
    }
}

module.exports = PrinterLog;