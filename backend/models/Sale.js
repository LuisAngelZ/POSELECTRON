// server/models/Sale.js - VERSIÓN CORREGIDA FINAL

const database = require('../config/database');
const TicketSession = require('./TicketSession');

class Sale {
    // ===== FUNCIONES DE FECHA CONSISTENTE =====
    static getBoliviaDateTime() {
        const now = new Date();
        // Bolivia es UTC-4 (4 horas menos que UTC)
        const boliviaTime = new Date(now.getTime() - (4 * 60 * 60 * 1000));
        // Formato para SQLite: YYYY-MM-DD HH:MM:SS
        return boliviaTime.toISOString().slice(0, 19).replace('T', ' ');
    }  
    
    static getBoliviaDate() {
        const now = new Date();
        const boliviaTime = new Date(now.getTime() - (4 * 60 * 60 * 1000));
        return boliviaTime.toISOString().slice(0, 10); // YYYY-MM-DD
    }

    // ===== CREAR VENTA CON FECHA CONSISTENTE =====
    static async create(saleData) {
        await database.ensureConnected();
        
        return new Promise(async (resolve, reject) => {
            try {
                database.getDB().serialize(async () => {
                    database.getDB().run('BEGIN TRANSACTION');
                    
                    try {
                        const ticketNumber = await TicketSession.getNextTicketNumber(saleData.user_id);
                        
                        // USAR HORA CONSISTENTE DE BOLIVIA
                        const boliviaDateTime = this.getBoliviaDateTime();
                        
                        console.log(`🕐 Creando venta con fecha consistente: ${boliviaDateTime}`);
                        
                        const sql = `
                            INSERT INTO sales (
                                customer_nit, customer_name, order_type, payment_type, table_number, 
                                observations, subtotal, total, paid_amount, change_amount, user_id, 
                                ticket_number, created_at
                            )
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                                ticketNumber,
                                boliviaDateTime // ← HORA CONSISTENTE
                            ],
                            async function(insertErr) {
                                if (insertErr) {
                                    database.getDB().run('ROLLBACK');
                                    reject(insertErr);
                                    return;
                                }
                                
                                const saleId = this.lastID;
                                console.log(`✅ Venta #${saleId} creada con ticket #${ticketNumber} a las ${boliviaDateTime}`);
                                
                                try {
                                    const finalTicketNumber = await TicketSession.incrementTicketCounter(
                                        saleData.user_id, 
                                        saleData.total
                                    );
                                    
                                    database.getDB().run('COMMIT', (commitErr) => {
                                        if (commitErr) {
                                            reject(commitErr);
                                            return;
                                        }
                                        
                                        resolve({ 
                                            id: saleId, 
                                            ...saleData,
                                            ticket_number: finalTicketNumber,
                                            created_at: boliviaDateTime
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

    // ===== BUSCAR POR RANGO DE FECHAS - VERSIÓN CONSISTENTE =====
    static async findByDateRange(startDate, endDate, userId = null) {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            let sql;
            let params;
            
            console.log(`🔍 ===== CONSULTA CONSISTENTE =====`);
            console.log(`📅 Rango: ${startDate} a ${endDate}`);
            console.log(`👤 Usuario: ${userId || 'TODOS'}`);
            
            if (userId) {
                sql = `
                    SELECT s.*, u.full_name as user_name, u.username
                    FROM sales s
                    LEFT JOIN users u ON s.user_id = u.id
                    WHERE DATE(s.created_at) BETWEEN ? AND ? AND s.user_id = ?
                    ORDER BY s.created_at DESC
                `;
                params = [startDate, endDate, userId];
            } else {
                sql = `
                    SELECT s.*, u.full_name as user_name, u.username
                    FROM sales s
                    LEFT JOIN users u ON s.user_id = u.id
                    WHERE DATE(s.created_at) BETWEEN ? AND ?
                    ORDER BY s.created_at DESC
                `;
                params = [startDate, endDate];
            }
            
            database.getDB().all(sql, params, (err, rows) => {
                if (err) {
                    console.error('❌ Error en consulta:', err);
                    reject(err);
                } else {
                    console.log(`✅ Encontradas ${rows.length} ventas`);
                    if (rows.length > 0) {
                        console.log(`📊 Primera venta: ${rows[rows.length - 1].created_at}`);
                        console.log(`📊 Última venta: ${rows[0].created_at}`);
                    }
                    console.log(`🔍 ================================`);
                    resolve(rows);
                }
            });
        });
    }

    // ===== BUSCAR POR FECHA Y USUARIO =====
    static async findByDateRangeAndUser(startDate, endDate, userId) {
        // Simplemente usar findByDateRange con userId
        return this.findByDateRange(startDate, endDate, userId);
    }

    // ===== TOTALES DEL DÍA CON FECHA CONSISTENTE =====
    static async getTodayTotals(date = null) {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            const targetDate = date || this.getBoliviaDate();
            
            console.log(`📊 Calculando totales para fecha consistente: ${targetDate}`);
            
            const sql = `
                SELECT 
                    COUNT(*) as total_sales,
                    COALESCE(SUM(total), 0) as total_amount,
                    COALESCE(AVG(total), 0) as average_sale
                FROM sales 
                WHERE DATE(created_at) = ?
            `;
            
            database.getDB().get(sql, [targetDate], (err, row) => {
                if (err) {
                    console.error('❌ Error calculando totales:', err);
                    reject(err);
                } else {
                    console.log(`💰 Totales del día ${targetDate}:`, row);
                    resolve(row || { total_sales: 0, total_amount: 0, average_sale: 0 });
                }
            });
        });
    }

    // ===== VENTAS DE HOY CON FECHA CONSISTENTE =====
    static async getTodaySales(date = null) {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            const targetDate = date || this.getBoliviaDate();
            
            const sql = `
                SELECT 
                    s.*,
                    u.username as user_name,
                    u.full_name as user_full_name
                FROM sales s
                LEFT JOIN users u ON s.user_id = u.id
                WHERE DATE(s.created_at) = ?
                ORDER BY s.created_at DESC
                LIMIT 50
            `;
            
            database.getDB().all(sql, [targetDate], (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
    }

    // ===== TOTALES POR MÉTODO DE PAGO Y USUARIO =====
    static async getDailyTotalsByPaymentTypeAndUser(date = null, userId = null) {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            const targetDate = date || this.getBoliviaDate();
            
            let sql = `
                SELECT 
                    payment_type,
                    COUNT(*) as total_sales,
                    COALESCE(SUM(total), 0) as total_amount,
                    COALESCE(AVG(total), 0) as average_sale
                FROM sales 
                WHERE DATE(created_at) = ?
            `;
            
            let params = [targetDate];
            
            if (userId) {
                sql += ' AND user_id = ?';
                params.push(userId);
            }
            
            sql += `
                GROUP BY payment_type
                ORDER BY payment_type
            `;
            
            console.log(`💳 Consultando pagos para ${targetDate}, usuario: ${userId || 'TODOS'}`);
            
            database.getDB().all(sql, params, (err, rows) => {
                if (err) {
                    console.error('❌ Error consultando pagos:', err);
                    reject(err);
                } else {
                    console.log(`💳 Métodos de pago encontrados:`, rows);
                    resolve(rows || []);
                }
            });
        });
    }

    // ===== FUNCIÓN DEBUG =====
    static async debugDateTime() {
        console.log('\n🔍 ===== DEBUG DE FECHAS =====');
        console.log(`🇧🇴 Hora Bolivia calculada: ${this.getBoliviaDateTime()}`);
        console.log(`📅 Fecha Bolivia calculada: ${this.getBoliviaDate()}`);
        console.log(`🌍 Hora sistema UTC: ${new Date().toISOString()}`);
        console.log(`🏠 Hora sistema local: ${new Date().toLocaleString()}`);
        
        try {
            const recentSales = await this.getTodaySales(); // ✅ FUNCIÓN CORRECTA
            console.log(`📊 Ventas de hoy encontradas: ${recentSales.length}`);
            if (recentSales.length > 0) {
                console.log(`🕐 Última venta: ${recentSales[0].created_at}`);
            }
        } catch (error) {
            console.error('❌ Error en debug:', error);
        }
        
        console.log('🔍 ==============================\n');
    }

    // ===== FUNCIONES EXISTENTES SIN CAMBIOS =====
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
            const targetDate = date || this.getBoliviaDate();
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

    // ===== FUNCIONES PARA SESIONES DE TICKETS =====
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

    static async getDailyTicketSummary(date = null) {
        try {
            const sessionSummary = await TicketSession.getDailySummary(date);
            const targetDate = date || this.getBoliviaDate(); // ✅ USAR FUNCIÓN CONSISTENTE
            
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
}

module.exports = Sale;