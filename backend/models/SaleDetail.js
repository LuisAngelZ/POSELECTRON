// server/models/SaleDetail.js - Modelo completo
const database = require('../config/database');

class SaleDetail {
    static async create(detailData) {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT INTO sale_details (
                    sale_id, product_id, product_name, quantity, unit_price, subtotal
                )
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            
            database.getDB().run(
                sql,
                [
                    detailData.sale_id,
                    detailData.product_id,
                    detailData.product_name,
                    detailData.quantity,
                    detailData.unit_price,
                    detailData.subtotal
                ],
                function(err) {
                    if (err) reject(err);
                    else resolve({ id: this.lastID, ...detailData });
                }
            );
        });
    }

    static async createMultiple(saleId, details) {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT INTO sale_details (
                    sale_id, product_id, product_name, quantity, unit_price, subtotal
                )
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            
            const db = database.getDB();
            db.serialize(() => {
                db.run('BEGIN TRANSACTION');
                
                const stmt = db.prepare(sql);
                let completed = 0;
                let hasError = false;
                
                details.forEach((detail) => {
                    stmt.run(
                        [
                            saleId,
                            detail.product_id,
                            detail.product_name,
                            detail.quantity,
                            detail.unit_price,
                            detail.subtotal
                        ],
                        function(err) {
                            if (err && !hasError) {
                                hasError = true;
                                db.run('ROLLBACK');
                                reject(err);
                                return;
                            }
                            
                            completed++;
                            if (completed === details.length && !hasError) {
                                db.run('COMMIT');
                                resolve({ created: details.length });
                            }
                        }
                    );
                });
                
                stmt.finalize();
            });
        });
    }

    static async findBySaleId(saleId) {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT sd.*, p.image_url
                FROM sale_details sd
                LEFT JOIN products p ON sd.product_id = p.id
                WHERE sd.sale_id = ?
                ORDER BY sd.id
            `;
            
            database.getDB().all(sql, [saleId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    static async findByProductId(productId, limit = 50) {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT sd.*, s.created_at as sale_date, s.customer_name
                FROM sale_details sd
                LEFT JOIN sales s ON sd.sale_id = s.id
                WHERE sd.product_id = ?
                ORDER BY s.created_at DESC
                LIMIT ?
            `;
            
            database.getDB().all(sql, [productId, limit], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    static async getTopProducts(limit = 10) {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    sd.product_id,
                    sd.product_name,
                    SUM(sd.quantity) as total_quantity,
                    SUM(sd.subtotal) as total_revenue,
                    COUNT(DISTINCT sd.sale_id) as times_sold,
                    AVG(sd.unit_price) as avg_price
                FROM sale_details sd
                GROUP BY sd.product_id, sd.product_name
                ORDER BY total_quantity DESC
                LIMIT ?
            `;
            
            database.getDB().all(sql, [limit], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    static async getTodayTopProducts(limit = 5) {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    sd.product_id,
                    sd.product_name,
                    SUM(sd.quantity) as total_quantity,
                    SUM(sd.subtotal) as total_revenue
                FROM sale_details sd
                LEFT JOIN sales s ON sd.sale_id = s.id
                WHERE DATE(s.created_at) = DATE('now')
                GROUP BY sd.product_id, sd.product_name
                ORDER BY total_quantity DESC
                LIMIT ?
            `;
            
            database.getDB().all(sql, [limit], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    static async getMonthlyTopProducts(limit = 10) {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    sd.product_id,
                    sd.product_name,
                    SUM(sd.quantity) as total_quantity,
                    SUM(sd.subtotal) as total_revenue,
                    COUNT(DISTINCT sd.sale_id) as times_sold
                FROM sale_details sd
                LEFT JOIN sales s ON sd.sale_id = s.id
                WHERE strftime('%Y-%m', s.created_at) = strftime('%Y-%m', 'now')
                GROUP BY sd.product_id, sd.product_name
                ORDER BY total_revenue DESC
                LIMIT ?
            `;
            
            database.getDB().all(sql, [limit], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    static async getProductSalesByDateRange(productId, startDate, endDate) {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    DATE(s.created_at) as sale_date,
                    SUM(sd.quantity) as daily_quantity,
                    SUM(sd.subtotal) as daily_revenue
                FROM sale_details sd
                LEFT JOIN sales s ON sd.sale_id = s.id
                WHERE sd.product_id = ? AND DATE(s.created_at) BETWEEN ? AND ?
                GROUP BY DATE(s.created_at)
                ORDER BY sale_date
            `;
            
            database.getDB().all(sql, [productId, startDate, endDate], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    static async getCategorySales(limit = 10) {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    c.name as category_name,
                    c.id as category_id,
                    SUM(sd.quantity) as total_quantity,
                    SUM(sd.subtotal) as total_revenue,
                    COUNT(DISTINCT sd.sale_id) as total_sales
                FROM sale_details sd
                LEFT JOIN products p ON sd.product_id = p.id
                LEFT JOIN categories c ON p.category_id = c.id
                WHERE c.id IS NOT NULL
                GROUP BY c.id, c.name
                ORDER BY total_revenue DESC
                LIMIT ?
            `;
            
            database.getDB().all(sql, [limit], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    static async getProductsByCategory(categoryId) {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    sd.product_id,
                    sd.product_name,
                    SUM(sd.quantity) as total_quantity,
                    SUM(sd.subtotal) as total_revenue,
                    COUNT(DISTINCT sd.sale_id) as times_sold
                FROM sale_details sd
                LEFT JOIN products p ON sd.product_id = p.id
                WHERE p.category_id = ?
                GROUP BY sd.product_id, sd.product_name
                ORDER BY total_quantity DESC
            `;
            
            database.getDB().all(sql, [categoryId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    static async delete(id) {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            const sql = `DELETE FROM sale_details WHERE id = ?`;
            
            database.getDB().run(sql, [id], function(err) {
                if (err) reject(err);
                else resolve({ deleted: true, changes: this.changes });
            });
        });
    }

    static async deleteBySaleId(saleId) {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            const sql = `DELETE FROM sale_details WHERE sale_id = ?`;
            
            database.getDB().run(sql, [saleId], function(err) {
                if (err) reject(err);
                else resolve({ deleted: true, changes: this.changes });
            });
        });
    }

    static async getTotalRevenue() {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    COUNT(*) as total_items_sold,
                    SUM(quantity) as total_quantity,
                    SUM(subtotal) as total_revenue
                FROM sale_details
            `;
            
            database.getDB().get(sql, [], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    static async getRevenueByDateRange(startDate, endDate) {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    DATE(s.created_at) as sale_date,
                    COUNT(*) as items_sold,
                    SUM(sd.quantity) as total_quantity,
                    SUM(sd.subtotal) as daily_revenue
                FROM sale_details sd
                LEFT JOIN sales s ON sd.sale_id = s.id
                WHERE DATE(s.created_at) BETWEEN ? AND ?
                GROUP BY DATE(s.created_at)
                ORDER BY sale_date
            `;
            
            database.getDB().all(sql, [startDate, endDate], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    static async getHourlyRevenueToday() {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    strftime('%H', s.created_at) as hour,
                    COUNT(*) as items_sold,
                    SUM(sd.quantity) as total_quantity,
                    SUM(sd.subtotal) as hourly_revenue
                FROM sale_details sd
                LEFT JOIN sales s ON sd.sale_id = s.id
                WHERE DATE(s.created_at) = DATE('now')
                GROUP BY strftime('%H', s.created_at)
                ORDER BY hour
            `;
            
            database.getDB().all(sql, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    static async getWeeklyTopProducts(limit = 10) {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    sd.product_id,
                    sd.product_name,
                    SUM(sd.quantity) as total_quantity,
                    SUM(sd.subtotal) as total_revenue,
                    COUNT(DISTINCT sd.sale_id) as times_sold
                FROM sale_details sd
                LEFT JOIN sales s ON sd.sale_id = s.id
                WHERE DATE(s.created_at) >= DATE('now', '-7 days')
                GROUP BY sd.product_id, sd.product_name
                ORDER BY total_revenue DESC
                LIMIT ?
            `;
            
            database.getDB().all(sql, [limit], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    static async getAverageOrderValue() {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    AVG(sale_total) as average_order_value,
                    COUNT(DISTINCT sale_id) as total_orders
                FROM (
                    SELECT 
                        sale_id,
                        SUM(subtotal) as sale_total
                    FROM sale_details
                    GROUP BY sale_id
                ) as order_totals
            `;
            
            database.getDB().get(sql, [], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    static async findAll(limit = 100) {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT sd.*, s.created_at as sale_date, s.customer_name
                FROM sale_details sd
                LEFT JOIN sales s ON sd.sale_id = s.id
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
                SELECT sd.*, s.created_at as sale_date, s.customer_name, p.image_url
                FROM sale_details sd
                LEFT JOIN sales s ON sd.sale_id = s.id
                LEFT JOIN products p ON sd.product_id = p.id
                WHERE sd.id = ?
            `;
            
            database.getDB().get(sql, [id], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }


    // Obtener productos más vendidos de hoy
    static async getTodayTopProducts(limit = 10) {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            const today = new Date().toISOString().split('T')[0];
            const sql = `
                SELECT 
                    sd.product_name,
                    p.id as product_id,
                    SUM(sd.quantity) as total_quantity,
                    SUM(sd.subtotal) as total_revenue,
                    AVG(sd.unit_price) as avg_price,
                    COUNT(DISTINCT sd.sale_id) as times_sold
                FROM sale_details sd
                INNER JOIN sales s ON sd.sale_id = s.id
                LEFT JOIN products p ON sd.product_id = p.id
                WHERE DATE(s.created_at) = ?
                GROUP BY sd.product_name, sd.product_id
                ORDER BY total_quantity DESC
                LIMIT ?
            `;
            
            database.getDB().all(sql, [today, limit], (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
    }

    // Obtener productos más vendidos en general
    static async getTopProducts(limit = 10, days = 30) {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    sd.product_name,
                    p.id as product_id,
                    SUM(sd.quantity) as total_quantity,
                    SUM(sd.subtotal) as total_revenue,
                    AVG(sd.unit_price) as avg_price,
                    COUNT(DISTINCT sd.sale_id) as times_sold,
                    COUNT(DISTINCT DATE(s.created_at)) as days_sold
                FROM sale_details sd
                INNER JOIN sales s ON sd.sale_id = s.id
                LEFT JOIN products p ON sd.product_id = p.id
                WHERE s.created_at >= date('now', '-${days} days')
                GROUP BY sd.product_name, sd.product_id
                ORDER BY total_quantity DESC
                LIMIT ?
            `;
            
            database.getDB().all(sql, [limit], (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
    }

    // Obtener productos más vendidos por categoría
    static async getTopProductsByCategory(categoryId, limit = 5) {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    sd.product_name,
                    p.id as product_id,
                    c.name as category_name,
                    SUM(sd.quantity) as total_quantity,
                    SUM(sd.subtotal) as total_revenue
                FROM sale_details sd
                INNER JOIN sales s ON sd.sale_id = s.id
                LEFT JOIN products p ON sd.product_id = p.id
                LEFT JOIN categories c ON p.category_id = c.id
                WHERE p.category_id = ?
                GROUP BY sd.product_name, sd.product_id, c.name
                ORDER BY total_quantity DESC
                LIMIT ?
            `;
            
            database.getDB().all(sql, [categoryId, limit], (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
    }

    // Obtener ventas por hora del día (para gráficos)
    static async getHourlySales(date) {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            const targetDate = date || new Date().toISOString().split('T')[0];
            const sql = `
                SELECT 
                    CAST(strftime('%H', s.created_at) AS INTEGER) as hour,
                    COUNT(sd.id) as total_items,
                    SUM(sd.subtotal) as total_amount,
                    COUNT(DISTINCT sd.sale_id) as total_sales
                FROM sale_details sd
                INNER JOIN sales s ON sd.sale_id = s.id
                WHERE DATE(s.created_at) = ?
                GROUP BY CAST(strftime('%H', s.created_at) AS INTEGER)
                ORDER BY hour ASC
            `;
            
            database.getDB().all(sql, [targetDate], (err, rows) => {
                if (err) reject(err);
                else {
                    // Llenar horas faltantes con 0
                    const result = [];
                    for (let i = 0; i < 24; i++) {
                        const hourData = rows.find(r => r.hour === i) || {
                            hour: i,
                            total_items: 0,
                            total_amount: 0,
                            total_sales: 0
                        };
                        result.push(hourData);
                    }
                    resolve(result);
                }
            });
        });
    }

    // Obtener reporte de ventas por categoría
    static async getSalesByCategory(startDate, endDate) {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    c.id as category_id,
                    c.name as category_name,
                    COUNT(DISTINCT sd.product_id) as unique_products,
                    SUM(sd.quantity) as total_quantity,
                    SUM(sd.subtotal) as total_revenue,
                    AVG(sd.unit_price) as avg_price
                FROM sale_details sd
                INNER JOIN sales s ON sd.sale_id = s.id
                LEFT JOIN products p ON sd.product_id = p.id
                LEFT JOIN categories c ON p.category_id = c.id
                WHERE DATE(s.created_at) BETWEEN ? AND ?
                GROUP BY c.id, c.name
                ORDER BY total_revenue DESC
            `;
            
            database.getDB().all(sql, [startDate, endDate], (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
    }
}

module.exports = SaleDetail;