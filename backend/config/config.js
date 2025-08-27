require('dotenv').config();

module.exports = {
    PORT: process.env.PORT || 3000,
    JWT_SECRET: process.env.JWT_SECRET || 'tu-secret-key-muy-seguro',
    JWT_EXPIRES: process.env.JWT_EXPIRES || '24h',
    PRINTER_NAME: process.env.PRINTER_NAME || 'EPSON TM-T20III Receipt',
    ENVIRONMENT: process.env.NODE_ENV || 'development'
};