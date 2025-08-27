// server/routes/auth.js
const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Rutas públicas (no requieren autenticación)
router.post('/login', AuthController.login);
router.post('/verify-token', AuthController.verifyToken);

// Rutas protegidas (requieren autenticación)
router.get('/profile', authenticateToken, AuthController.getProfile);
router.put('/change-password', authenticateToken, AuthController.changePassword);

// Rutas de administrador
router.post('/register', authenticateToken, requireAdmin, AuthController.register);
router.get('/users', authenticateToken, requireAdmin, AuthController.getUsers);

module.exports = router;