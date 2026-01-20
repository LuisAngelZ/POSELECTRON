// test-date-system.js - Script para probar el sistema de fechas
const DateUtils = require('./backend/utils/dateUtils');

console.log('\n🧪 PRUEBA DEL SISTEMA DE FECHAS\n');
console.log('═'.repeat(50));

// Probar DateUtils
console.log('\n📅 DateUtils - Hora Local de la PC:');
console.log('─'.repeat(50));
console.log('Fecha y Hora:', DateUtils.getLocalDateTime());
console.log('Solo Fecha:', DateUtils.getLocalDate());
console.log('Mes Actual:', DateUtils.getCurrentMonth());
console.log('Año Actual:', DateUtils.getCurrentYear());
console.log('Primer día del mes:', DateUtils.getFirstDayOfMonth());
console.log('Primer día del año:', DateUtils.getFirstDayOfYear());

// Probar formateo de fechas
console.log('\n🔧 Formateo de Fechas:');
console.log('─'.repeat(50));
const testDate = new Date('2026-01-19T14:30:45');
console.log('Fecha original:', testDate);
console.log('Formateada (DateTime):', DateUtils.formatDateTime(testDate));
console.log('Formateada (Date):', DateUtils.formatDate(testDate));

// Verificar consistencia
console.log('\n✅ Verificación de Consistencia:');
console.log('─'.repeat(50));
const now = new Date();
const manualFormat = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
const utilsFormat = DateUtils.getLocalDate();

if (manualFormat === utilsFormat) {
    console.log('✅ Formato de fecha CONSISTENTE');
    console.log('   Manual:', manualFormat);
    console.log('   Utils:', utilsFormat);
} else {
    console.log('❌ INCONSISTENCIA DETECTADA');
    console.log('   Manual:', manualFormat);
    console.log('   Utils:', utilsFormat);
}

console.log('\n═'.repeat(50));
console.log('✅ Prueba completada\n');

// Exportar para uso en otros scripts
module.exports = {
    testDateUtils: () => {
        return {
            currentDateTime: DateUtils.getLocalDateTime(),
            currentDate: DateUtils.getLocalDate(),
            currentMonth: DateUtils.getCurrentMonth(),
            currentYear: DateUtils.getCurrentYear(),
            isWorking: true
        };
    }
};
