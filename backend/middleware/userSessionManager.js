// server/middleware/userSessionManager.js - Nuevo middleware independiente

const TicketSession = require('../models/TicketSession');

class UserSessionManager {
    static currentUserId = null;
    static lastActivityDate = null;

    // Middleware para verificar cambio de usuario o nuevo día
    static async handleUserSession(req, res, next) {
        try {
            // Solo aplicar en rutas de ventas donde req.user existe
            if (!req.user || !req.user.id) {
                return next();
            }

            const userId = req.user.id;
            const currentDate = new Date().toISOString().split('T')[0];
            
            // Verificar si cambió el día
            if (this.lastActivityDate && this.lastActivityDate !== currentDate) {
                console.log(`Nuevo día detectado: ${currentDate}. Cerrando sesiones del día anterior.`);
                try {
                    await TicketSession.startNewDay(currentDate);
                } catch (error) {
                    console.error('Error iniciando nuevo día:', error);
                }
                this.currentUserId = null; // Resetear usuario actual
            }
            
            // Verificar si cambió el usuario
            if (this.currentUserId && this.currentUserId !== userId) {
                console.log(`Cambio de usuario detectado: ${this.currentUserId} → ${userId}`);
                
                try {
                    // Cerrar sesión del usuario anterior
                    await TicketSession.closeUserSession(this.currentUserId);
                    console.log(`Numeración de tickets reiniciada para usuario ${userId}`);
                } catch (error) {
                    console.error('Error cerrando sesión de usuario anterior:', error);
                }
            }
            
            // Actualizar usuario actual y fecha
            this.currentUserId = userId;
            this.lastActivityDate = currentDate;
            
            // Continuar con la petición
            next();
            
        } catch (error) {
            console.error('Error en manejo de sesión de usuario:', error);
            // No bloquear la petición por errores de sesión
            next();
        }
    }

    // Función para cerrar sesión manualmente (logout)
    static async closeCurrentSession() {
        try {
            if (this.currentUserId) {
                await TicketSession.closeUserSession(this.currentUserId);
                console.log(`Sesión cerrada manualmente para usuario ${this.currentUserId}`);
                this.currentUserId = null;
            }
        } catch (error) {
            console.error('Error cerrando sesión manualmente:', error);
        }
    }

    // Obtener información del usuario actual
    static getCurrentSessionInfo() {
        return {
            current_user_id: this.currentUserId,
            last_activity_date: this.lastActivityDate,
            has_active_session: this.currentUserId !== null
        };
    }
}

module.exports = UserSessionManager;