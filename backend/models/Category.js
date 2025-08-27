// server/models/Category.js - Modelo completo
const database = require('../config/database');

class Category {
    static async create(categoryData) {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT INTO categories (name, description)
                VALUES (?, ?)
            `;
            
            database.getDB().run(
                sql,
                [categoryData.name, categoryData.description || null],
                function(err) {
                    if (err) reject(err);
                    else resolve({ id: this.lastID, ...categoryData });
                }
            );
        });
    }

    static async findAll() {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM categories WHERE active = 1 ORDER BY name`;
            
            database.getDB().all(sql, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    static async findById(id) {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM categories WHERE id = ? AND active = 1`;
            
            database.getDB().get(sql, [id], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    static async update(id, categoryData) {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            const sql = `
                UPDATE categories 
                SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `;
            
            database.getDB().run(
                sql,
                [categoryData.name, categoryData.description, id],
                function(err) {
                    if (err) reject(err);
                    else resolve({ id, ...categoryData });
                }
            );
        });
    }

    static async delete(id) {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            const sql = `UPDATE categories SET active = 0 WHERE id = ?`;
            
            database.getDB().run(sql, [id], function(err) {
                if (err) reject(err);
                else resolve({ deleted: true });
            });
        });
    }

    static async getWithProductCount() {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    c.*,
                    COUNT(p.id) as product_count
                FROM categories c
                LEFT JOIN products p ON c.id = p.category_id AND p.active = 1
                WHERE c.active = 1
                GROUP BY c.id, c.name, c.description, c.active, c.created_at, c.updated_at
                ORDER BY c.name
            `;
            
            database.getDB().all(sql, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }
}

module.exports = Category;