// server/models/Product.js - Modelo completo con CRUD
const database = require('../config/database');

class Product {
    static async create(productData) {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT INTO products (name, description, price, category_id, stock, image_url)
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            
            database.getDB().run(
                sql,
                [
                    productData.name,
                    productData.description || null,
                    productData.price,
                    productData.category_id,
                    productData.stock || 0,
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
                    stock = ?, image_url = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND active = 1
            `;
            
            database.getDB().run(
                sql,
                [
                    productData.name,
                    productData.description,
                    productData.price,
                    productData.category_id,
                    productData.stock,
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
            const sql = `UPDATE products SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
            
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

    // Método para actualizar solo el stock
    static async updateStock(id, newStock) {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            const sql = `
                UPDATE products 
                SET stock = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND active = 1
            `;
            
            database.getDB().run(sql, [newStock, id], function(err) {
                if (err) reject(err);
                else resolve({ updated: true });
            });
        });
    }

    // Método para encontrar productos con stock bajo
    static async findLowStock(threshold = 10) {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT p.*, c.name as category_name 
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                WHERE p.active = 1 AND p.stock <= ?
                ORDER BY p.stock ASC, p.name
            `;
            
            database.getDB().all(sql, [threshold], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    // Método para obtener estadísticas de productos
    static async getStats() {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    COUNT(*) as total_products,
                    COUNT(CASE WHEN stock > 0 THEN 1 END) as in_stock,
                    COUNT(CASE WHEN stock = 0 THEN 1 END) as out_of_stock,
                    COUNT(CASE WHEN stock <= 10 THEN 1 END) as low_stock,
                    AVG(price) as avg_price,
                    MIN(price) as min_price,
                    MAX(price) as max_price,
                    SUM(stock) as total_stock
                FROM products 
                WHERE active = 1
            `;
            
            database.getDB().get(sql, [], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    // Método para obtener productos por rango de precio
    static async findByPriceRange(minPrice, maxPrice) {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT p.*, c.name as category_name 
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                WHERE p.active = 1 AND p.price BETWEEN ? AND ?
                ORDER BY p.price ASC
            `;
            
            database.getDB().all(sql, [minPrice, maxPrice], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    // Método para duplicar producto (útil para variaciones)
    static async duplicate(id, newName) {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            // Primero obtener el producto original
            const selectSql = `
                SELECT name, description, price, category_id, stock, image_url 
                FROM products 
                WHERE id = ? AND active = 1
            `;
            
            database.getDB().get(selectSql, [id], (err, product) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                if (!product) {
                    reject(new Error('Producto no encontrado'));
                    return;
                }
                
                // Insertar el producto duplicado
                const insertSql = `
                    INSERT INTO products (name, description, price, category_id, stock, image_url)
                    VALUES (?, ?, ?, ?, ?, ?)
                `;
                
                database.getDB().run(
                    insertSql,
                    [
                        newName || `${product.name} (Copia)`,
                        product.description,
                        product.price,
                        product.category_id,
                        0, // Stock inicial en 0 para el duplicado
                        product.image_url
                    ],
                    function(err) {
                        if (err) reject(err);
                        else resolve({ id: this.lastID, ...product, name: newName || `${product.name} (Copia)`, stock: 0 });
                    }
                );
            });
        });
    }
}

module.exports = Product;