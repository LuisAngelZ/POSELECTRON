// server/middleware/userSessionManager.js - Nuevo middleware independiente

const TicketSession = require('../models/TicketSession');
const DateUtils = require('../utils/dateUtils');

class UserSessionManager {
    static currentUserId = null;
    static lastActivityDate = null;

   static async handleUserSession(req, res, next) {
    try {
        // Solo aplicar en rutas de ventas donde req.user existe
        if (!req.user || !req.user.id) {
            return next();
        }

        const userId = req.user.id;
        const currentDate = DateUtils.getLocalDate();
        
        // Verificar si cambió el día
        if (this.lastActivityDate && this.lastActivityDate !== currentDate) {
            console.log(`🌅 ===== NUEVO DÍA DETECTADO =====`);
            console.log(`📅 Fecha anterior: ${this.lastActivityDate}`);
            console.log(`📅 Fecha actual: ${currentDate}`);
            console.log(`🔄 Cerrando sesiones del día anterior...`);
            
            try {
                await TicketSession.startNewDay(currentDate);
                console.log(`✅ Sesiones del día anterior cerradas correctamente`);
            } catch (error) {
                console.error('❌ Error iniciando nuevo día:', error);
            }
            this.currentUserId = null; // Resetear usuario actual
            console.log(`🌅 ===============================`);
        }
        
        // Verificar si cambió el usuario
        if (this.currentUserId && this.currentUserId !== userId) {
            console.log(`🔄 ===== CAMBIO DE USUARIO =====`);
            console.log(`👤 Usuario anterior: ID ${this.currentUserId}`);
            console.log(`👤 Usuario actual: ID ${userId} (${req.user.username})`);
            console.log(`📅 Fecha: ${currentDate}`);
            console.log(`🎫 Acción: Cerrar sesión anterior y verificar reanudación`);
            
            try {
                // Cerrar sesión del usuario anterior
                await TicketSession.closeUserSession(this.currentUserId);
                console.log(`🔒 Sesión del usuario ${this.currentUserId} cerrada`);
                
                // Verificar si el nuevo usuario ya tuvo actividad hoy
                const existingSessions = await this.checkUserPreviousActivity(userId, currentDate);
                
                if (existingSessions.had_previous_activity) {
                    console.log(`🔄 REANUDACIÓN DETECTADA:`);
                    console.log(`   👤 ${req.user.username} ya trabajó hoy`);
                    console.log(`   🎫 Último ticket: #${existingSessions.last_ticket}`);
                    console.log(`   💰 Ventas previas: ${existingSessions.previous_sales}`);
                    console.log(`   🕐 Reanudando numeración desde: #${existingSessions.last_ticket}`);
                } else {
                    console.log(`🆕 NUEVA SESIÓN DIARIA:`);
                    console.log(`   👤 ${req.user.username} inicia por primera vez hoy`);
                    console.log(`   🎫 Numeración desde: #1`);
                }
                
            } catch (error) {
                console.error('❌ Error cerrando sesión de usuario anterior:', error);
            }
            console.log(`🔄 ==============================`);
        }
        
        // Si es el mismo usuario (reanudación silenciosa)
        if (this.currentUserId === userId) {
            // No hacer nada, continuar normal
        }
        
        // Actualizar usuario actual y fecha
        this.currentUserId = userId;
        this.lastActivityDate = currentDate;
        
        // Continuar con la petición
        next();
        
    } catch (error) {
        console.error('❌ Error en manejo de sesión de usuario:', error);
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

    // Nueva función para verificar actividad previa del usuario
static async checkUserPreviousActivity(userId, date) {
    try {
        const database = require('../config/database');
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            database.getDB().get(`
                SELECT 
                    MAX(last_ticket_number) as last_ticket,
                    COUNT(*) as session_count,
                    SUM(total_sales_in_session) as previous_sales
                FROM ticket_sessions 
                WHERE user_id = ? AND session_date = ?
            `, [userId, date], (err, result) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                resolve({
                    had_previous_activity: result && result.last_ticket > 0,
                    last_ticket: result ? result.last_ticket || 0 : 0,
                    session_count: result ? result.session_count || 0 : 0,
                    previous_sales: result ? result.previous_sales || 0 : 0
                });
            });
        });
    } catch (error) {
        console.error('Error verificando actividad previa:', error);
        return {
            had_previous_activity: false,
            last_ticket: 0,
            session_count: 0,
            previous_sales: 0
        };
    }
}
}

module.exports = UserSessionManager;