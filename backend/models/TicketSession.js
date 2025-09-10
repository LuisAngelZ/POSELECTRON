// server/models/TicketSession.js - Nuevo modelo para manejar sesiones de tickets

const database = require('../config/database');

class TicketSession {
    // Obtener o crear sesión activa para un usuario en una fecha
static async getOrCreateActiveSession(userId, date = null) {
    await database.ensureConnected();
    
    return new Promise((resolve, reject) => {
        const targetDate = date || new Date().toISOString().split('T')[0];
        
        database.getDB().serialize(() => {
            // Buscar sesión activa existente del MISMO USUARIO
            database.getDB().get(`
                SELECT * FROM ticket_sessions 
                WHERE user_id = ? AND session_date = ? AND is_active = 1
                ORDER BY session_started_at DESC
                LIMIT 1
            `, [userId, targetDate], (err, existingSession) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                if (existingSession) {
                    console.log(`📋 Sesión activa encontrada - Usuario ${userId}, Ticket actual: ${existingSession.last_ticket_number}`);
                    resolve(existingSession);
                    return;
                }
                
                // No hay sesión activa del usuario actual
                // Verificar si este usuario ya tuvo sesiones HOY (para continuar numeración)
                database.getDB().get(`
                    SELECT MAX(last_ticket_number) as max_ticket_user
                    FROM ticket_sessions 
                    WHERE session_date = ? AND user_id = ?
                `, [targetDate, userId], (userErr, userResult) => {
                    if (userErr) {
                        reject(userErr);
                        return;
                    }
                    
                    // Determinar número inicial para este usuario específico
                    let startingNumber;
                    
                    if (userResult && userResult.max_ticket_user) {
                        // El usuario YA tuvo sesiones hoy - continuar desde su último ticket
                        startingNumber = userResult.max_ticket_user;
                        console.log(`🔄 Usuario ${userId} reanuda sesión desde ticket: ${startingNumber}`);
                    } else {
                        // Usuario NUEVO hoy - empezar desde 0 (siguiente será #1)
                        startingNumber = 0;
                        console.log(`🆕 Usuario ${userId} inicia nueva numeración desde: ${startingNumber}`);
                    }
                    
                    // Crear nueva sesión para este usuario
                    database.getDB().run(`
                        INSERT INTO ticket_sessions (
                            session_date, user_id, last_ticket_number, is_active
                        ) VALUES (?, ?, ?, 1)
                    `, [targetDate, userId, startingNumber], function(insertErr) {
                        if (insertErr) {
                            reject(insertErr);
                            return;
                        }
                        
                        const newSession = {
                            id: this.lastID,
                            session_date: targetDate,
                            user_id: userId,
                            last_ticket_number: startingNumber,
                            is_active: 1,
                            total_sales_in_session: 0,
                            total_amount_in_session: 0
                        };
                        
                        if (userResult && userResult.max_ticket_user) {
                            console.log(`🔄 Sesión reanudada - Usuario ${userId}, continuando desde ticket: ${startingNumber}`);
                        } else {
                            console.log(`🆕 Nueva sesión creada - Usuario ${userId}, iniciando desde ticket: ${startingNumber}`);
                        }
                        
                        resolve(newSession);
                    });
                });
            });
        });
    });
}
    
    // Obtener próximo número de ticket para un usuario
    static async getNextTicketNumber(userId, date = null) {
        await database.ensureConnected();
        
        return new Promise(async (resolve, reject) => {
            try {
                const session = await this.getOrCreateActiveSession(userId, date);
                const nextNumber = session.last_ticket_number + 1;
                
                console.log(`🎫 Próximo ticket para usuario ${userId}: #${nextNumber}`);
                resolve(nextNumber);
                
            } catch (error) {
                reject(error);
            }
        });
    }
    
    // Incrementar contador de ticket en sesión activa
    static async incrementTicketCounter(userId, saleAmount, date = null) {
        await database.ensureConnected();
        
        return new Promise(async (resolve, reject) => {
            try {
                const targetDate = date || new Date().toISOString().split('T')[0];
                
                database.getDB().run(`
                    UPDATE ticket_sessions 
                    SET last_ticket_number = last_ticket_number + 1,
                        total_sales_in_session = total_sales_in_session + 1,
                        total_amount_in_session = total_amount_in_session + ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = ? AND session_date = ? AND is_active = 1
                `, [saleAmount, userId, targetDate], function(err) {
                    if (err) {
                        reject(err);
                        return;
                    }
                    
                    if (this.changes === 0) {
                        reject(new Error('No se encontró sesión activa para actualizar'));
                        return;
                    }
                    
                    // Obtener el número actualizado
                    database.getDB().get(`
                        SELECT last_ticket_number 
                        FROM ticket_sessions 
                        WHERE user_id = ? AND session_date = ? AND is_active = 1
                    `, [userId, targetDate], (getErr, row) => {
                        if (getErr) {
                            reject(getErr);
                            return;
                        }
                        
                        const ticketNumber = row.last_ticket_number;
                         // ===== LOGS DETALLADOS DE TICKET ASIGNADO =====
                    console.log(`🎫 ===== TICKET ASIGNADO =====`);
                    console.log(`👤 Usuario ID: ${userId}`);
                    console.log(`🎫 Número de ticket: #${ticketNumber}`);
                    console.log(`💰 Monto de venta: Bs ${saleAmount}`);
                    console.log(`📅 Fecha: ${targetDate}`);
                    console.log(`📊 Estadísticas de sesión:`);
                    console.log(`   🎫 Tickets generados: ${row.last_ticket_number}`);
                    console.log(`   💰 Ventas en sesión: ${row.total_sales_in_session}`);
                    console.log(`   💰 Monto acumulado: Bs ${row.total_amount_in_session}`);
                    console.log(`🎫 ===========================`);
                        resolve(ticketNumber);
                    });
                });
                
            } catch (error) {
                reject(error);
            }
        });
    }
    
    // Cerrar sesión activa de un usuario
    static async closeUserSession(userId, date = null) {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            const targetDate = date || new Date().toISOString().split('T')[0];
            
            database.getDB().run(`
                UPDATE ticket_sessions 
                SET is_active = 0,
                    session_ended_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ? AND session_date = ? AND is_active = 1
            `, [userId, targetDate], function(err) {
                if (err) {
                    reject(err);
                    return;
                }
                
                console.log(`🔒 Sesión cerrada para usuario ${userId} en fecha ${targetDate}`);
                resolve({
                    success: true,
                    sessions_closed: this.changes
                });
            });
        });
    }
    
    // Obtener resumen de todas las sesiones de un día
    static async getDailySummary(date = null) {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            const targetDate = date || new Date().toISOString().split('T')[0];
            
            database.getDB().all(`
                SELECT 
                    ts.*,
                    u.username,
                    u.full_name
                FROM ticket_sessions ts
                LEFT JOIN users u ON ts.user_id = u.id
                WHERE ts.session_date = ?
                ORDER BY ts.session_started_at ASC
            `, [targetDate], (err, sessions) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                // Calcular totales del día
                const totalSales = sessions.reduce((sum, s) => sum + s.total_sales_in_session, 0);
                const totalAmount = sessions.reduce((sum, s) => sum + parseFloat(s.total_amount_in_session), 0);
                const maxTicketNumber = Math.max(...sessions.map(s => s.last_ticket_number), 0);
                
                resolve({
                    date: targetDate,
                    sessions: sessions,
                    daily_totals: {
                        total_sessions: sessions.length,
                        total_sales: totalSales,
                        total_amount: totalAmount,
                        max_ticket_number: maxTicketNumber
                    }
                });
            });
        });
    }
    
    // Obtener estadísticas de sesión de un usuario específico
    static async getUserSessionStats(userId, date = null) {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            const targetDate = date || new Date().toISOString().split('T')[0];
            
            database.getDB().get(`
                SELECT 
                    ts.*,
                    u.username,
                    u.full_name
                FROM ticket_sessions ts
                LEFT JOIN users u ON ts.user_id = u.id
                WHERE ts.user_id = ? AND ts.session_date = ? AND ts.is_active = 1
                ORDER BY ts.session_started_at DESC
                LIMIT 1
            `, [userId, targetDate], (err, session) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                if (!session) {
                    resolve({
                        has_active_session: false,
                        next_ticket_number: 1
                    });
                    return;
                }
                
                resolve({
                    has_active_session: true,
                    session: session,
                    next_ticket_number: session.last_ticket_number + 1,
                    stats: {
                        tickets_generated: session.last_ticket_number,
                        sales_in_session: session.total_sales_in_session,
                        amount_in_session: session.total_amount_in_session
                    }
                });
            });
        });
    }
    
    // Resetear numeración para nuevo día (ejecutar automáticamente)
    static async startNewDay(date = null) {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            const targetDate = date || new Date().toISOString().split('T')[0];
            const previousDate = new Date(new Date(targetDate).getTime() - 24 * 60 * 60 * 1000)
                .toISOString().split('T')[0];
            
            // Cerrar todas las sesiones del día anterior
            database.getDB().run(`
                UPDATE ticket_sessions 
                SET is_active = 0,
                    session_ended_at = CURRENT_TIMESTAMP
                WHERE session_date = ? AND is_active = 1
            `, [previousDate], function(err) {
                if (err) {
                    reject(err);
                    return;
                }
                
                console.log(`🌅 Nuevo día iniciado: ${targetDate}. Sesiones del día anterior cerradas: ${this.changes}`);
                resolve({
                    success: true,
                    new_date: targetDate,
                    previous_sessions_closed: this.changes
                });
            });
        });
    }
}

module.exports = TicketSession;