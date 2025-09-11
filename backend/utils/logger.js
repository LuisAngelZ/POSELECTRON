// ===== CREAR ARCHIVO: backend/utils/logger.js =====
function getLocalTime() {
    return new Date().toLocaleString('es-BO', {
        timeZone: 'America/La_Paz',
        year: 'numeric',
        month: '2-digit', 
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

// Reemplazar console.log con versión que incluye hora local
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

console.log = function(...args) {
    originalLog(`[${getLocalTime()}]`, ...args);
};

console.error = function(...args) {
    originalError(`[${getLocalTime()}] ❌`, ...args);
};

console.warn = function(...args) {
    originalWarn(`[${getLocalTime()}] ⚠️`, ...args);
};

module.exports = { getLocalTime };