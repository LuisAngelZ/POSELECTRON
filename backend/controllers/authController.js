// server/controllers/authController.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/config');

class AuthController {
    // Iniciar sesión
    static async login(req, res) {
        try {
            const { username, password } = req.body;

            // Validar datos requeridos
            if (!username || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Usuario y contraseña son requeridos'
                });
            }

            // Buscar usuario
            const user = await User.findByUsername(username);
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Credenciales inválidas'
                });
            }

            // Verificar contraseña
            const isValidPassword = await User.verifyPassword(password, user.password);
            if (!isValidPassword) {
                return res.status(401).json({
                    success: false,
                    message: 'Credenciales inválidas'
                });
            }

            // Generar token JWT
            const token = jwt.sign(
                { 
                    id: user.id, 
                    username: user.username, 
                    role: user.role 
                },
                config.JWT_SECRET,
                { expiresIn: config.JWT_EXPIRES }
            );

            // Respuesta exitosa (sin incluir la contraseña)
            const { password: _, ...userWithoutPassword } = user;
            
            res.json({
                success: true,
                message: 'Login exitoso',
                token,
                user: userWithoutPassword
            });

        } catch (error) {
            console.error('Error en login:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    // Registrar nuevo usuario (solo administradores)
    static async register(req, res) {
        try {
            const { username, password, full_name, role } = req.body;

            // Validar datos requeridos
            if (!username || !password || !full_name) {
                return res.status(400).json({
                    success: false,
                    message: 'Username, password y full_name son requeridos'
                });
            }

            // Verificar que el usuario no exista
            const existingUser = await User.findByUsername(username);
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'El usuario ya existe'
                });
            }

            // Crear usuario
            const newUser = await User.create({
                username,
                password,
                full_name,
                role: role || 'user'
            });

            // Respuesta exitosa
            const { password: _, ...userWithoutPassword } = newUser;
            
            res.status(201).json({
                success: true,
                message: 'Usuario creado exitosamente',
                user: userWithoutPassword
            });

        } catch (error) {
            console.error('Error en registro:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    // Verificar token
    static async verifyToken(req, res) {
        try {
            const token = req.headers.authorization?.split(' ')[1];
            
            if (!token) {
                return res.status(401).json({
                    success: false,
                    message: 'Token no proporcionado'
                });
            }

            const decoded = jwt.verify(token, config.JWT_SECRET);
            const user = await User.findById(decoded.id);
            
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Usuario no encontrado'
                });
            }

            const { password: _, ...userWithoutPassword } = user;
            
            res.json({
                success: true,
                user: userWithoutPassword
            });

        } catch (error) {
            console.error('Error verificando token:', error);
            res.status(401).json({
                success: false,
                message: 'Token inválido'
            });
        }
    }

    // Cambiar contraseña
    static async changePassword(req, res) {
        try {
            const { oldPassword, newPassword } = req.body;
            const userId = req.user.id;

            if (!oldPassword || !newPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'Contraseña actual y nueva son requeridas'
                });
            }

            if (newPassword.length < 6) {
                return res.status(400).json({
                    success: false,
                    message: 'La nueva contraseña debe tener al menos 6 caracteres'
                });
            }

            await User.changePassword(userId, oldPassword, newPassword);

            res.json({
                success: true,
                message: 'Contraseña cambiada exitosamente'
            });

        } catch (error) {
            console.error('Error cambiando contraseña:', error);
            
            if (error.message === 'Contraseña actual incorrecta') {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }

            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    // Obtener perfil del usuario actual
    static async getProfile(req, res) {
        try {
            const user = await User.findById(req.user.id);
            
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'Usuario no encontrado'
                });
            }

            const { password: _, ...userWithoutPassword } = user;
            
            res.json({
                success: true,
                user: userWithoutPassword
            });

        } catch (error) {
            console.error('Error obteniendo perfil:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    // Listar usuarios (solo administradores)
    static async getUsers(req, res) {
        try {
            const users = await User.findAll();
            
            res.json({
                success: true,
                users
            });

        } catch (error) {
            console.error('Error obteniendo usuarios:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }
}

module.exports = AuthController;