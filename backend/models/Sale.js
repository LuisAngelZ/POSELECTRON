// server/models/Sale.js - Modelo completo
const database = require('../config/database');

class Sale {
    static async create(saleData) {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT INTO sales (
                    customer_nit, customer_name, order_type, table_number, 
                    observations, subtotal, total, paid_amount, change_amount, user_id
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            database.getDB().run(
                sql,
                [
                    saleData.customer_nit || null,
                    saleData.customer_name || null,
                    saleData.order_type,
                    saleData.table_number || null,
                    saleData.observations || null,
                    saleData.subtotal,
                    saleData.total,
                    saleData.paid_amount,
                    saleData.change_amount || 0,
                    saleData.user_id
                ],
                function(err) {
                    if (err) reject(err);
                    else resolve({ id: this.lastID, ...saleData });
                }
            );
        });
    }

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

    static async findByUser(userId, limit = 50) {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT s.*, u.full_name as user_name
                FROM sales s
                LEFT JOIN users u ON s.user_id = u.id
                WHERE s.user_id = ?
                ORDER BY s.created_at DESC
                LIMIT ?
            `;
            
            database.getDB().all(sql, [userId, limit], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    static async getTodaySales() {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT s.*, u.full_name as user_name
                FROM sales s
                LEFT JOIN users u ON s.user_id = u.id
                WHERE DATE(s.created_at) = DATE('now')
                ORDER BY s.created_at DESC
            `;
            
            database.getDB().all(sql, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    static async getTodayTotals() {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    COUNT(*) as total_sales,
                    COALESCE(SUM(total), 0) as total_amount,
                    COALESCE(AVG(total), 0) as average_sale
                FROM sales 
                WHERE DATE(created_at) = DATE('now')
            `;
            
            database.getDB().get(sql, [], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    static async getMonthlyTotals() {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    COUNT(*) as total_sales,
                    COALESCE(SUM(total), 0) as total_amount,
                    COALESCE(AVG(total), 0) as average_sale
                FROM sales 
                WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
            `;
            
            database.getDB().get(sql, [], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    static async getYearlyTotals() {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    COUNT(*) as total_sales,
                    COALESCE(SUM(total), 0) as total_amount,
                    COALESCE(AVG(total), 0) as average_sale
                FROM sales 
                WHERE strftime('%Y', created_at) = strftime('%Y', 'now')
            `;
            
            database.getDB().get(sql, [], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    static async getSalesByDateRange(startDate, endDate) {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    DATE(created_at) as sale_date,
                    COUNT(*) as daily_sales,
                    SUM(total) as daily_amount
                FROM sales 
                WHERE DATE(created_at) BETWEEN ? AND ?
                GROUP BY DATE(created_at)
                ORDER BY sale_date
            `;
            
            database.getDB().all(sql, [startDate, endDate], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    static async getTopCustomers(limit = 10) {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    customer_name,
                    customer_nit,
                    COUNT(*) as total_purchases,
                    SUM(total) as total_spent,
                    AVG(total) as average_purchase
                FROM sales 
                WHERE customer_name IS NOT NULL AND customer_name != ''
                GROUP BY customer_name, customer_nit
                ORDER BY total_spent DESC
                LIMIT ?
            `;
            
            database.getDB().all(sql, [limit], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }
}

module.exports = Sale;