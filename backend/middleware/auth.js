// server/middleware/auth.js
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const User = require('../models/User');

// Middleware para verificar token JWT
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Token de acceso requerido'
            });
        }

        // Verificar el token
        const decoded = jwt.verify(token, config.JWT_SECRET);
        
        // Buscar el usuario para asegurar que aún existe y está activo
        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Usuario no válido'
            });
        }

        // Agregar información del usuario a la request
        req.user = {
            id: user.id,
            username: user.username,
            full_name: user.full_name,
            role: user.role
        };

        // Si el token está próximo a expirar (menos de 1 hora), generar uno nuevo
        const tokenExp = decoded.exp * 1000; // Convertir a milisegundos
        const now = Date.now();
        const oneHour = 60 * 60 * 1000;

        if (tokenExp - now < oneHour) {
            const newToken = jwt.sign(
                { id: user.id, username: user.username, role: user.role },
                config.JWT_SECRET,
                { expiresIn: config.JWT_EXPIRES }
            );
            res.set('X-New-Token', newToken);
        }

        next();
        
    } catch (error) {
        console.error('Error en autenticación:', error);
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expirado'
            });
        }
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Token inválido'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

// Middleware para verificar roles específicos
const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Usuario no autenticado'
            });
        }

        // Si allowedRoles es string, convertir a array
        const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
        
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'No tiene permisos para realizar esta acción'
            });
        }

        next();
    };
};

// Middleware para verificar que el usuario sea administrador
const requireAdmin = requireRole('admin');

// Middleware para verificar que el usuario sea el mismo o administrador
const requireOwnerOrAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Usuario no autenticado'
        });
    }

    const requestedUserId = parseInt(req.params.userId || req.params.id);
    const currentUserId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (requestedUserId !== currentUserId && !isAdmin) {
        return res.status(403).json({
            success: false,
            message: 'No tiene permisos para acceder a este recurso'
        });
    }

    next();
};

// Middleware opcional - no requiere token pero lo procesa si existe
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];
        
        if (token) {
            const decoded = jwt.verify(token, config.JWT_SECRET);
            const user = await User.findById(decoded.id);
            
            if (user) {
                req.user = {
                    id: user.id,
                    username: user.username,
                    full_name: user.full_name,
                    role: user.role
                };
            }
        }
        
        next();
        
    } catch (error) {
        // En autenticación opcional, los errores no detienen la ejecución
        console.log('Token opcional inválido o expirado');
        next();
    }
};

module.exports = {
    authenticateToken,
    requireRole,
    requireAdmin,
    requireOwnerOrAdmin,
    optionalAuth
};