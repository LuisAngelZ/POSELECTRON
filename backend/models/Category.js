// server/models/Category.js - Modelo completo con CRUD
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
            const sql = `
                SELECT * FROM categories 
                WHERE active = 1
                ORDER BY name
            `;
            
            database.getDB().all(sql, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    static async findById(id) {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT * FROM categories 
                WHERE id = ? AND active = 1
            `;
            
            database.getDB().get(sql, [id], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    static async findByName(name) {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT * FROM categories 
                WHERE LOWER(name) = LOWER(?) AND active = 1
            `;
            
            database.getDB().get(sql, [name], (err, row) => {
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
                WHERE id = ? AND active = 1
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
            const sql = `UPDATE categories SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
            
            database.getDB().run(sql, [id], function(err) {
                if (err) reject(err);
                else resolve({ deleted: true });
            });
        });
    }

    static async getProductsCount(categoryId) {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT COUNT(*) as count 
                FROM products 
                WHERE category_id = ? AND active = 1
            `;
            
            database.getDB().get(sql, [categoryId], (err, row) => {
                if (err) reject(err);
                else resolve(row.count);
            });
        });
    }

    static async findAllWithProductCount() {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    c.*,
                    COUNT(p.id) as product_count
                FROM categories c
                LEFT JOIN products p ON c.id = p.category_id AND p.active = 1
                WHERE c.active = 1
                GROUP BY c.id
                ORDER BY c.name
            `;
            
            database.getDB().all(sql, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    static async search(searchTerm) {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT * FROM categories 
                WHERE active = 1 AND (
                    name LIKE ? OR 
                    description LIKE ?
                )
                ORDER BY name
            `;
            
            const searchPattern = `%${searchTerm}%`;
            
            database.getDB().all(sql, [searchPattern, searchPattern], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    static async getStats() {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    COUNT(DISTINCT c.id) as total_categories,
                    COUNT(DISTINCT CASE WHEN p.id IS NOT NULL THEN c.id END) as categories_with_products,
                    COUNT(DISTINCT CASE WHEN p.id IS NULL THEN c.id END) as empty_categories,
                    COUNT(p.id) as total_products,
                    ROUND(AVG(category_products.product_count), 2) as avg_products_per_category
                FROM categories c
                LEFT JOIN products p ON c.id = p.category_id AND p.active = 1
                LEFT JOIN (
                    SELECT 
                        category_id,
                        COUNT(*) as product_count
                    FROM products 
                    WHERE active = 1 
                    GROUP BY category_id
                ) category_products ON c.id = category_products.category_id
                WHERE c.active = 1
            `;
            
            database.getDB().get(sql, [], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    static async forceDelete(id) {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            database.getDB().serialize(() => {
                database.getDB().run('BEGIN TRANSACTION');
                
                // Primero contar cuántos productos se van a eliminar
                database.getDB().get(
                    'SELECT COUNT(*) as count FROM products WHERE category_id = ? AND active = 1',
                    [id],
                    (err, countRow) => {
                        if (err) {
                            database.getDB().run('ROLLBACK');
                            reject(err);
                            return;
                        }
                        
                        const productsCount = countRow.count;
                        
                        // Eliminar productos asociados (soft delete)
                        database.getDB().run(
                            'UPDATE products SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE category_id = ?',
                            [id],
                            (err) => {
                                if (err) {
                                    database.getDB().run('ROLLBACK');
                                    reject(err);
                                    return;
                                }
                                
                                // Eliminar la categoría
                                database.getDB().run(
                                    'UPDATE categories SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                                    [id],
                                    (err) => {
                                        if (err) {
                                            database.getDB().run('ROLLBACK');
                                            reject(err);
                                            return;
                                        }
                                        
                                        database.getDB().run('COMMIT');
                                        resolve({ 
                                            deleted: true,
                                            productsDeleted: productsCount
                                        });
                                    }
                                );
                            }
                        );
                    }
                );
            });
        });
    }

    // Método para obtener categorías más populares (con más productos)
    static async getPopular(limit = 5) {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    c.*,
                    COUNT(p.id) as product_count
                FROM categories c
                LEFT JOIN products p ON c.id = p.category_id AND p.active = 1
                WHERE c.active = 1
                GROUP BY c.id
                HAVING product_count > 0
                ORDER BY product_count DESC
                LIMIT ?
            `;
            
            database.getDB().all(sql, [limit], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    // Método para obtener categorías vacías
    static async getEmpty() {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT c.*
                FROM categories c
                LEFT JOIN products p ON c.id = p.category_id AND p.active = 1
                WHERE c.active = 1 AND p.id IS NULL
                ORDER BY c.name
            `;
            
            database.getDB().all(sql, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    // Método para mover productos de una categoría a otra
    static async moveProducts(fromCategoryId, toCategoryId) {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            // Verificar que ambas categorías existen
            const checkSql = `
                SELECT COUNT(*) as count 
                FROM categories 
                WHERE id IN (?, ?) AND active = 1
            `;
            
            database.getDB().get(checkSql, [fromCategoryId, toCategoryId], (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                if (row.count !== 2) {
                    reject(new Error('Una o ambas categorías no existen'));
                    return;
                }
                
                // Mover los productos
                const updateSql = `
                    UPDATE products 
                    SET category_id = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE category_id = ? AND active = 1
                `;
                
                database.getDB().run(updateSql, [toCategoryId, fromCategoryId], function(err) {
                    if (err) reject(err);
                    else resolve({ moved: this.changes });
                });
            });
        });
    }
}

module.exports = Category;