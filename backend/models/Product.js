// server/models/Product.js - Modelo completo
const database = require('../config/database');

class Product {
    static async create(productData) {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT INTO products (name, description, price, category_id, image_url)
                VALUES (?, ?, ?, ?, ?)
            `;
            
            database.getDB().run(
                sql,
                [
                    productData.name,
                    productData.description || null,
                    productData.price,
                    productData.category_id,
                    productData.image_url || null
                ],
                function(err) {
                    if (err) reject(err);
                    else resolve({ id: this.lastID, ...productData });
                }
            );
        });
    }

    static async findAll() {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT p.*, c.name as category_name 
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                WHERE p.active = 1
                ORDER BY p.name
            `;
            
            database.getDB().all(sql, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    static async findByCategory(categoryId) {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT p.*, c.name as category_name
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                WHERE p.category_id = ? AND p.active = 1
                ORDER BY p.name
            `;
            
            database.getDB().all(sql, [categoryId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    static async findById(id) {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT p.*, c.name as category_name
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                WHERE p.id = ? AND p.active = 1
            `;
            
            database.getDB().get(sql, [id], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    static async update(id, productData) {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            const sql = `
                UPDATE products 
                SET name = ?, description = ?, price = ?, category_id = ?, 
                    image_url = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `;
            
            database.getDB().run(
                sql,
                [
                    productData.name,
                    productData.description,
                    productData.price,
                    productData.category_id,
                    productData.image_url,
                    id
                ],
                function(err) {
                    if (err) reject(err);
                    else resolve({ id, ...productData });
                }
            );
        });
    }

    static async delete(id) {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            const sql = `UPDATE products SET active = 0 WHERE id = ?`;
            
            database.getDB().run(sql, [id], function(err) {
                if (err) reject(err);
                else resolve({ deleted: true });
            });
        });
    }

    static async search(searchTerm) {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT p.*, c.name as category_name 
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                WHERE p.active = 1 AND (
                    p.name LIKE ? OR 
                    p.description LIKE ? OR 
                    c.name LIKE ?
                )
                ORDER BY p.name
            `;
            
            const searchPattern = `%${searchTerm}%`;
            
            database.getDB().all(sql, [searchPattern, searchPattern, searchPattern], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

}

module.exports = Product;