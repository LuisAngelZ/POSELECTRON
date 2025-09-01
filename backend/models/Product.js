// server/models/Product.js - Modelo completo con CRUD
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
        console.log('ID:', id);
        console.log('Datos:', productData);

        const sql = `
            UPDATE products 
            SET name = ?, description = ?, price = ?, category_id = ?, 
                image_url = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND active = 1
        `;
        
        // Valores correctos según esquema real
        const values = [
            productData.name || '',
            productData.description || null,
            productData.price || 0,
            productData.category_id || null,
            productData.image_url || null,
            parseInt(id)
        ];
        
        console.log('Valores para SQL:', values);
        console.log('SQL Query:', sql);
        
        database.getDB().run(sql, values, function(err) {
            if (err) {
                console.error('ERROR EN SQL UPDATE:', {
                    error: err.message,
                    code: err.code,
                    errno: err.errno,
                    sql: sql,
                    values: values
                });
                reject(new Error(`Error de base de datos: ${err.message}`));
            } else {
                console.log('SQL UPDATE exitoso - Filas afectadas:', this.changes);
                
                if (this.changes === 0) {
                    console.warn('No se actualizó ninguna fila - posible producto inactivo o ID inexistente');
                }
                
                resolve({ 
                    id: parseInt(id), 
                    ...productData,
                    rowsAffected: this.changes 
                });
            }
        });
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
                SELECT name, description, price, category_id, image_url 
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
                    INSERT INTO products (name, description, price, category_id, image_url)
                    VALUES (?, ?, ?, ?, ?, ?)
                `;
                
                database.getDB().run(
                    insertSql,
                    [
                        newName || `${product.name} (Copia)`,
                        product.description,
                        product.price,
                        product.category_id,
                        product.image_url
                    ],
                    function(err) {
                        if (err) reject(err);
                        else resolve({ id: this.lastID, ...product, name: newName || `${product.name} (Copia)` });
                    }
                );
            });
        });
    }
}

module.exports = Product;