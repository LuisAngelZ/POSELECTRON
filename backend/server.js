// backend/server.js - VERSIÓN CORREGIDA PARA ELECTRON
const express = require('express');
const cors = require('cors');
const path = require('path');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
// Cargar variables de entorno
require('dotenv').config();

// Verificar si estamos en Electron
const isElectron = process.versions && process.versions.electron;

// Crear aplicación Express
const app = express();

// Configuración básica
const PORT = process.env.PORT || 3333;
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
app.use(morgan('combined'));
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

// INTENTAR CARGAR RUTAS DE LA API (con manejo de errores)
let apiRoutesLoaded = {
    auth: false,
    categories: false,
    products: false,
    sales: false,
    reports: false,
    printer: false
};

// Función para cargar rutas de forma segura
function loadRoutesSafely() {
    try {
        // Verificar que los archivos existen antes de cargarlos
        const fs = require('fs');
        
        const routeFiles = [
            { path: './routes/auth.js', route: '/api/auth', name: 'auth' },
            { path: './routes/categories.js', route: '/api/categories', name: 'categories' },
            { path: './routes/products.js', route: '/api/products', name: 'products' },
            { path: './routes/sales.js', route: '/api/sales', name: 'sales' },
            { path: './routes/reports.js', route: '/api/reports', name: 'reports' },
            { path: './routes/printer.js', route: '/api/printer', name: 'printer' }
        ];

        routeFiles.forEach(({ path: routePath, route, name }) => {
            try {
                const fullPath = require.resolve(routePath);
                console.log(`✅ Cargando ruta: ${route} desde ${routePath}`);
                
                const routeModule = require(routePath);
                app.use(route, routeModule);
                apiRoutesLoaded[name] = true;
                
            } catch (error) {
                console.warn(`⚠️ No se pudo cargar ${route}:`, error.message);
                apiRoutesLoaded[name] = false;
            }
        });

    } catch (error) {
        console.warn('⚠️ Error general cargando rutas API:', error.message);
    }
}

// Cargar rutas
loadRoutesSafely();

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
app.listen(PORT, '127.0.0.1', () => {
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