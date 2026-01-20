// backend/services/ReportService.js
const database = require('../config/database');
const Sale = require('../models/Sale');
const SaleDetail = require('../models/SaleDetail');

class ReportService {
    static formatSQLiteDate(date) {
        return date.replace('T', ' ').substring(0, 10);
    }

    static async getFilteredReport(startDate, endDate, filters = {}) {
        console.log('🔍 Generando reporte filtrado:', { startDate, endDate, filters });
        
        try {
            await database.ensureConnected();
            
            // Construir consulta base
            let sql = `
                SELECT 
                    s.*,
                    u.username as user_name,
                    u.full_name as user_full_name
                FROM sales s
                LEFT JOIN users u ON s.user_id = u.id
                WHERE DATE(s.created_at) >= DATE(?)
                AND DATE(s.created_at) <= DATE(?)
            `;
            
            let params = [startDate, endDate];
            
            // Agregar filtros adicionales
            if (filters.payment_type && filters.payment_type !== 'all') {
                // Convertir payment_type a la forma almacenada en BD
                const dbPaymentType = filters.payment_type === 'cash' ? 'efectivo' : filters.payment_type;
                sql += ' AND s.payment_type = ?';
                params.push(dbPaymentType);
                console.log('🔍 Filtrando por tipo de pago:', dbPaymentType);
            }
            
            if (filters.product_id) {
                sql = `
                    SELECT 
                        s.*,
                        u.username as user_name,
                        u.full_name as user_full_name,
                        sd.quantity,
                        sd.unit_price,
                        sd.subtotal as detail_subtotal
                    FROM sales s
                    LEFT JOIN users u ON s.user_id = u.id
                    INNER JOIN sale_details sd ON s.id = sd.sale_id
                    WHERE DATE(s.created_at) BETWEEN ? AND ?
                    AND sd.product_id = ?
                `;
                params.push(filters.product_id);
            }
            
            sql += ' ORDER BY s.created_at DESC';
            
            // Ejecutar consulta principal
            const sales = await new Promise((resolve, reject) => {
                database.getDB().all(sql, params, (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                });
            });
            
            // Calcular totales
            const totalAmount = sales.reduce((sum, sale) => sum + parseFloat(sale.total), 0);
            const averageSale = sales.length > 0 ? totalAmount / sales.length : 0;
            
            // Obtener ventas por día
            const dailySales = await this.getDailySales(startDate, endDate, filters);
            
            // Obtener productos más vendidos
            const topProducts = await this.getTopProductsInRange(startDate, endDate, filters);
            
            return {
                success: true,
                report: {
                    period: {
                        start_date: startDate,
                        end_date: endDate,
                        total_days: dailySales.length
                    },
                    summary: {
                        total_sales: sales.length,
                        total_amount: totalAmount,
                        average_sale: averageSale,
                        days_with_sales: dailySales.length
                    },
                    sales: sales.map(sale => ({
                        id: sale.id,
                        total: parseFloat(sale.total),
                        payment_type: sale.payment_type,
                        created_at: sale.created_at,
                        user_name: sale.user_full_name || sale.user_name || 'Usuario',
                        table_number: sale.table_number,
                        ...(filters.product_id ? {
                            quantity: sale.quantity,
                            unit_price: sale.unit_price,
                            detail_subtotal: sale.detail_subtotal
                        } : {})
                    })),
                    daily_breakdown: dailySales,
                    top_products: topProducts
                }
            };
            
        } catch (error) {
            console.error('❌ Error generando reporte:', error);
            throw error;
        }
    }

    static async getDailySales(startDate, endDate, filters = {}) {
        let sql = `
            SELECT 
                DATE(created_at) as sale_date,
                COUNT(*) as total_sales,
                SUM(total) as total_amount,
                AVG(total) as average_sale
            FROM sales
            WHERE DATE(created_at) BETWEEN ? AND ?
        `;
        
        let params = [startDate, endDate];
        
        if (filters.payment_type && filters.payment_type !== 'all') {
            // Mantener consistencia en la conversión del tipo de pago
            const dbPaymentType = filters.payment_type === 'cash' ? 'efectivo' : filters.payment_type;
            sql += ' AND payment_type = ?';
            params.push(dbPaymentType);
        }
        
        if (filters.product_id) {
            sql = `
                SELECT 
                    DATE(s.created_at) as sale_date,
                    COUNT(DISTINCT s.id) as total_sales,
                    SUM(sd.subtotal) as total_amount,
                    AVG(sd.subtotal) as average_sale,
                    SUM(sd.quantity) as total_quantity
                FROM sales s
                INNER JOIN sale_details sd ON s.id = sd.sale_id
                WHERE DATE(s.created_at) BETWEEN ? AND ?
                AND sd.product_id = ?
            `;
            params.push(filters.product_id);
        }
        
        sql += ' GROUP BY DATE(created_at) ORDER BY sale_date';
        
        return new Promise((resolve, reject) => {
            database.getDB().all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
    }

    static async getTopProductsInRange(startDate, endDate, filters = {}) {
        let sql = `
            SELECT 
                sd.product_id,
                sd.product_name,
                SUM(sd.quantity) as total_quantity,
                SUM(sd.subtotal) as total_revenue,
                COUNT(DISTINCT sd.sale_id) as times_sold,
                COUNT(DISTINCT DATE(s.created_at)) as days_sold
            FROM sale_details sd
            INNER JOIN sales s ON sd.sale_id = s.id
            WHERE DATE(s.created_at) BETWEEN ? AND ?
        `;
        
        let params = [startDate, endDate];
        
        if (filters.payment_type && filters.payment_type !== 'all') {
            // Mantener consistencia en la conversión del tipo de pago
            const dbPaymentType = filters.payment_type === 'cash' ? 'efectivo' : filters.payment_type;
            sql += ' AND s.payment_type = ?';
            params.push(dbPaymentType);
        }
        
        sql += `
            GROUP BY sd.product_id, sd.product_name
            ORDER BY total_quantity DESC
            LIMIT 10
        `;
        
        return new Promise((resolve, reject) => {
            database.getDB().all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
    }
}

module.exports = ReportService;