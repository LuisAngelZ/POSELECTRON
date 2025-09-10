// server/models/Sale.js - VERSIÓN CON SESIONES DE TICKETS

const database = require('../config/database');
const TicketSession = require('./TicketSession');

class Sale {
    // Crear venta con numeración de ticket por sesión de usuario
    static async create(saleData) {
        await database.ensureConnected();
        
        return new Promise(async (resolve, reject) => {
            try {
                database.getDB().serialize(async () => {
                    database.getDB().run('BEGIN TRANSACTION');
                    
                    try {
                        // 1. Obtener próximo número de ticket para este usuario
                        const ticketNumber = await TicketSession.getNextTicketNumber(saleData.user_id);
                        
                        console.log(`🎫 Asignando ticket #${ticketNumber} para usuario ${saleData.user_id}`);
                        
                        // 2. Insertar la venta con el número de ticket
                        const sql = `
                            INSERT INTO sales (
                                customer_nit, customer_name, order_type, payment_type, table_number, 
                                observations, subtotal, total, paid_amount, change_amount, user_id, ticket_number
                            )
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `;
                        
                        database.getDB().run(
                            sql,
                            [
                                saleData.customer_nit || null,
                                saleData.customer_name || null,
                                saleData.order_type,
                                saleData.payment_type,
                                saleData.table_number || null,
                                saleData.observations || null,
                                saleData.subtotal,
                                saleData.total,
                                saleData.paid_amount,
                                saleData.change_amount || 0,
                                saleData.user_id,
                                ticketNumber
                            ],
                            async function(insertErr) {
                                if (insertErr) {
                                    database.getDB().run('ROLLBACK');
                                    reject(insertErr);
                                    return;
                                }
                                
                                const saleId = this.lastID;
                                
                                try {
                                    // 3. Actualizar contador en la sesión del usuario
                                    const finalTicketNumber = await TicketSession.incrementTicketCounter(
                                        saleData.user_id, 
                                        saleData.total
                                    );
                                    
                                    // 4. Confirmar transacción
                                    database.getDB().run('COMMIT', (commitErr) => {
                                        if (commitErr) {
                                            reject(commitErr);
                                            return;
                                        }
                                        
                                        console.log(`✅ Venta ID ${saleId} creada con ticket #${finalTicketNumber}`);
                                        
                                        resolve({ 
                                            id: saleId, 
                                            ...saleData,
                                            ticket_number: finalTicketNumber,
                                            daily_ticket_number: finalTicketNumber // Para compatibilidad con frontend
                                        });
                                    });
                                    
                                } catch (sessionErr) {
                                    database.getDB().run('ROLLBACK');
                                    reject(sessionErr);
                                }
                            }
                        );
                        
                    } catch (error) {
                        database.getDB().run('ROLLBACK');
                        reject(error);
                    }
                });
                
            } catch (error) {
                reject(error);
            }
        });
    }

    // Función para cerrar sesión de un usuario (cuando cambia de usuario)
    static async closeUserSession(userId) {
        try {
            const result = await TicketSession.closeUserSession(userId);
            console.log(`🔒 Sesión de tickets cerrada para usuario ${userId}`);
            return result;
        } catch (error) {
            console.error('Error cerrando sesión de usuario:', error);
            throw error;
        }
    }

    // Obtener resumen de ventas por sesiones de tickets
    static async getDailyTicketSummary(date = null) {
        try {
            const sessionSummary = await TicketSession.getDailySummary(date);
            const targetDate = date || new Date().toISOString().split('T')[0];
            
            // Obtener ventas reales del día
            const realSales = await this.findByDateRange(targetDate, targetDate);
            const realTotal = realSales.reduce((sum, sale) => sum + parseFloat(sale.total), 0);
            
            return {
                date: targetDate,
                ticket_sessions: sessionSummary.sessions,
                session_totals: sessionSummary.daily_totals,
                real_sales: {
                    count: realSales.length,
                    amount: realTotal
                },
                consistency_check: {
                    tickets_vs_sales: sessionSummary.daily_totals.total_sales === realSales.length,
                    amounts_match: Math.abs(sessionSummary.daily_totals.total_amount - realTotal) < 0.01
                }
            };
        } catch (error) {
            console.error('Error obteniendo resumen de tickets diarios:', error);
            throw error;
        }
    }

    // MANTENER TODAS LAS FUNCIONES EXISTENTES
    static async findAll(limit = 100) {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT s.*, u.full_name as user_name
                FROM sales s
                LEFT JOIN users u ON s.user_id = u.id
                ORDER BY s.created_at DESC
                LIMIT ?
            `;
            
            database.getDB().all(sql, [limit], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    static async findById(id) {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT s.*, u.full_name as user_name
                FROM sales s
                LEFT JOIN users u ON s.user_id = u.id
                WHERE s.id = ?
            `;
            
            database.getDB().get(sql, [id], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    static async findByDateRange(startDate, endDate) {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT s.*, u.full_name as user_name
                FROM sales s
                LEFT JOIN users u ON s.user_id = u.id
                WHERE DATE(s.created_at) BETWEEN ? AND ?
                ORDER BY s.created_at DESC
            `;
            
            database.getDB().all(sql, [startDate, endDate], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    static async getTodayTotals() {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            const today = new Date().toISOString().split('T')[0];
            const sql = `
                SELECT 
                    COUNT(*) as total_sales,
                    COALESCE(SUM(total), 0) as total_amount,
                    COALESCE(AVG(total), 0) as average_sale
                FROM sales 
                WHERE DATE(created_at) = ?
            `;
            
            database.getDB().get(sql, [today], (err, row) => {
                if (err) reject(err);
                else resolve(row || { total_sales: 0, total_amount: 0, average_sale: 0 });
            });
        });
    }

    static async getMonthlyTotals() {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            const now = new Date();
            const year = now.getFullYear();
            const month = (now.getMonth() + 1).toString().padStart(2, '0');
            const startDate = `${year}-${month}-01`;
            
            const sql = `
                SELECT 
                    COUNT(*) as total_sales,
                    COALESCE(SUM(total), 0) as total_amount,
                    COALESCE(AVG(total), 0) as average_sale
                FROM sales 
                WHERE DATE(created_at) >= ?
                AND strftime('%Y-%m', created_at) = ?
            `;
            
            database.getDB().get(sql, [startDate, `${year}-${month}`], (err, row) => {
                if (err) reject(err);
                else resolve(row || { total_sales: 0, total_amount: 0, average_sale: 0 });
            });
        });
    }

    static async getTodaySales() {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            const today = new Date().toISOString().split('T')[0];
            const sql = `
                SELECT 
                    s.*,
                    u.username as user_name,
                    u.full_name as user_full_name
                FROM sales s
                LEFT JOIN users u ON s.user_id = u.id
                WHERE DATE(s.created_at) = ?
                ORDER BY s.created_at DESC
                LIMIT 20
            `;
            
            database.getDB().all(sql, [today], (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
    }

    static async getSalesByUser(startDate, endDate) {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    u.id as user_id,
                    u.username,
                    u.full_name,
                    COUNT(s.id) as total_sales,
                    COALESCE(SUM(s.total), 0) as total_amount,
                    COALESCE(AVG(s.total), 0) as average_sale
                FROM users u
                LEFT JOIN sales s ON u.id = s.user_id 
                    AND DATE(s.created_at) BETWEEN ? AND ?
                GROUP BY u.id, u.username, u.full_name
                HAVING total_sales > 0
                ORDER BY total_amount DESC
            `;
            
            database.getDB().all(sql, [startDate, endDate], (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
    }

    static async getDailyTotalsByPaymentType(date) {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            const targetDate = date || new Date().toISOString().split('T')[0];
            const sql = `
                SELECT 
                    payment_type,
                    COUNT(*) as total_sales,
                    COALESCE(SUM(total), 0) as total_amount,
                    COALESCE(AVG(total), 0) as average_sale
                FROM sales 
                WHERE DATE(created_at) = ?
                GROUP BY payment_type
                ORDER BY payment_type
            `;
            
            database.getDB().all(sql, [targetDate], (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
    }

    // AGREGAR DESPUÉS DE getDailyTotalsByPaymentType:
static async getDailyTotalsByPaymentTypeAndUser(date, userId) {
    await database.ensureConnected();
    
    return new Promise((resolve, reject) => {
        const targetDate = date || new Date().toISOString().split('T')[0];
        const sql = `
            SELECT 
                payment_type,
                COUNT(*) as total_sales,
                COALESCE(SUM(total), 0) as total_amount,
                COALESCE(AVG(total), 0) as average_sale
            FROM sales 
            WHERE DATE(created_at) = ? AND user_id = ?
            GROUP BY payment_type
            ORDER BY payment_type
        `;
        
        database.getDB().all(sql, [targetDate, userId], (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
        });
    });
}

// AGREGAR después de findByDateRange:
static async findByDateRangeAndUser(startDate, endDate, userId) {
    await database.ensureConnected();
    
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT s.*, u.full_name as user_name
            FROM sales s
            LEFT JOIN users u ON s.user_id = u.id
            WHERE DATE(s.created_at) BETWEEN ? AND ? AND s.user_id = ?
            ORDER BY s.created_at DESC
        `;
        
        database.getDB().all(sql, [startDate, endDate, userId], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}
}

module.exports = Sale;