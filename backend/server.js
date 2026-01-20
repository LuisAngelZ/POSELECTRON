// backend/server.js - VERSIÓN CORREGIDA PARA ELECTRON
const express = require('express');
const cors = require('cors');
const path = require('path');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('./utils/logger');

// Cargar variables de entorno
require('dotenv').config();

// Verificar si estamos en Electron
const isElectron = process.versions && process.versions.electron;

// Crear aplicación Express
const app = express();

// Configuración básica - USAR PUERTO DE .env O FALLBACK A 3333
const PORT = parseInt(process.env.PORT, 10) || 3333;
const dbPath = process.env.DB_PATH || path.join(__dirname, 'database', 'pos.db');

// Middleware de seguridad básico
app.use(helmet({
    contentSecurityPolicy: false
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    message: 'Demasiadas solicitudes desde esta IP'
});
app.use(limiter);

// Middleware básico
morgan.token('date', function() {
    return new Date().toLocaleString('es-BO', {
        timeZone: 'America/La_Paz',
        year: 'numeric',
        month: '2-digit', 
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
});
// Formato personalizado con hora local
const logFormat = ':remote-addr - :remote-user [:date] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"';
app.use(morgan(logFormat));

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Headers de seguridad
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// RUTAS BÁSICAS SIN DEPENDENCIAS EXTERNAS PRIMERO
app.get('/', (req, res) => {
    res.redirect('/login');
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/views/login.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/views/dashboard.html'));
});

app.get('/pos', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/views/pos.html'));
});

app.get('/products', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/views/products.html'));
});

app.get('/categories', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/views/categories.html'));
});

app.get('/reports', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/views/reports.html'));
});

// Ruta de prueba API básica (sin dependencias externas)
app.get('/api/test', (req, res) => {
    res.json({ 
        message: '🚀 Servidor POS LOCAL funcionando correctamente!',
        timestamp: new Date().toISOString(),
        version: '1.0.0-electron',
        mode: isElectron ? 'ELECTRON_APP' : 'DEVELOPMENT',
        database: 'SQLite Local',
        status: 'OK',
        features: {
            auth: false,
            products: false,
            sales: false,
            printer: false,
            note: 'Cargando módulos...'
        }
    });
});

// Cargar rutas API
const authRoutes = require('./routes/auth');
const categoriesRoutes = require('./routes/categories');
const productsRoutes = require('./routes/products');
const salesRoutes = require('./routes/sales');
const reportsRoutes = require('./routes/reports');
const printerRoutes = require('./routes/printer');

// Rastrear rutas cargadas
const apiRoutesLoaded = {
    auth: true,
    categories: true,
    products: true,
    sales: true,
    reports: true,
    printer: true
};

// Registrar rutas API
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/printer', printerRoutes);

// Las rutas ya están cargadas arriba

// Ruta de estado de la API
app.get('/api/status', (req, res) => {
    res.json({
        success: true,
        message: 'Servidor funcionando',
        loaded_routes: apiRoutesLoaded,
        timestamp: new Date().toISOString()
    });
});

// Middleware de errores
app.use((err, req, res, next) => {
    console.error('🚨 Error del servidor:', err.stack);
    res.status(500).json({ 
        error: 'Error interno del servidor',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Error interno',
        timestamp: new Date().toISOString()
    });
});

// Middleware para rutas no encontradas
app.use('*', (req, res) => {
    res.status(404).json({ 
        error: 'Ruta no encontrada',
        path: req.originalUrl,
        message: 'Esta ruta no existe en el servidor local',
        available_routes: {
            pages: ['/', '/login', '/dashboard', '/pos', '/products', '/categories', '/reports'],
            api: ['/api/test', '/api/status']
        }
    });
});

// INICIAR SERVIDOR
/*const server = app.listen(PORT, 'localhost', () => {
    console.log('🔒'.repeat(50));
    console.log(`🚀 Servidor POS LOCAL iniciado en http://localhost:${PORT}`);
    console.log(`📱 Modo: ${isElectron ? 'APLICACIÓN DESKTOP' : 'DESARROLLO WEB'}`);
    console.log(`🌐 Solo accesible localmente (localhost)`);
    console.log(`🗄️ Base de datos: SQLite Local`);
    
    console.log('\n📋 Estado de rutas API:');
    Object.entries(apiRoutesLoaded).forEach(([name, loaded]) => {
        console.log(`   ${loaded ? '✅' : '❌'} ${name}: ${loaded ? 'Cargado' : 'Error'}`);
    });
    
    if (isElectron) {
        console.log('\n🖥️ Aplicación de escritorio lista');
        console.log('📂 Datos almacenados localmente');
    }
    
    console.log('🔒'.repeat(50));
});*/
const server = app.listen(PORT, '127.0.0.1', () => {
    console.log(`🚀 Servidor POS LOCAL http://127.0.0.1:${PORT}`);
});

// Manejo de cierre limpio
process.on('SIGINT', () => {
    console.log('\n🛑 Cerrando servidor...');
    server.close(() => {
        console.log('✅ Servidor cerrado correctamente');
        process.exit(0);
    });
});

module.exports = app;