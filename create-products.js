// create-products.js - Script para crear productos y categorías iniciales
const database = require('./backend/config/database');

async function createInitialData() {
    try {
        console.log('Iniciando creación de categorías y productos...');
        
        // Conectar a la base de datos
        await database.connect();
        
        // Definir categorías
        const categories = [
            { name: 'PLATOS Y PORCIONES', description: 'Platos principales y porciones' },
            { name: 'GASEOSAS Y JUGOS', description: 'Bebidas gaseosas y jugos' },
            { name: 'REFRESCOS NATURALES', description: 'Refrescos y bebidas naturales' },
            { name: 'EXTRAS', description: 'Productos adicionales' }
        ];

        // Crear categorías
        console.log('\n=== CREANDO CATEGORÍAS ===');
        for (const category of categories) {
            try {
                // Verificar si la categoría ya existe
                const existingCategory = await new Promise((resolve, reject) => {
                    database.getDB().get(
                        'SELECT id FROM categories WHERE name = ?', 
                        [category.name], 
                        (err, row) => {
                            if (err) reject(err);
                            else resolve(row);
                        }
                    );
                });

                if (existingCategory) {
                    console.log(`Categoría '${category.name}' ya existe`);
                } else {
                    await new Promise((resolve, reject) => {
                        database.getDB().run(
                            'INSERT INTO categories (name, description, active) VALUES (?, ?, 1)',
                            [category.name, category.description],
                            function(err) {
                                if (err) reject(err);
                                else resolve({ id: this.lastID });
                            }
                        );
                    });
                    console.log(`✅ Categoría '${category.name}' creada`);
                }
            } catch (error) {
                console.error(`Error procesando categoría '${category.name}':`, error);
            }
        }

        // Obtener IDs de categorías
        const categoryIds = {};
        for (const category of categories) {
            const row = await new Promise((resolve, reject) => {
                database.getDB().get(
                    'SELECT id FROM categories WHERE name = ?', 
                    [category.name], 
                    (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    }
                );
            });
            if (row) {
                categoryIds[category.name] = row.id;
            }
        }

        // Definir productos
        const products = [
            // PLATOS Y PORCIONES
            { name: 'CHICKEN 1', price: 17, category: 'PLATOS Y PORCIONES', description: 'Pollo frito individual' },
            { name: 'CHICKEN 2', price: 27, category: 'PLATOS Y PORCIONES', description: 'Pollo frito doble' },
            { name: 'PIPOKID', price: 24, category: 'PLATOS Y PORCIONES', description: 'Combo infantil' },
            { name: 'PORCION DE ARROZ', price: 12, category: 'PLATOS Y PORCIONES', description: 'Porción de arroz' },
            { name: 'PORCION DE PAPA', price: 12, category: 'PLATOS Y PORCIONES', description: 'Porción de papa' },
            { name: 'PORCION DE PLATANO', price: 12, category: 'PLATOS Y PORCIONES', description: 'Porción de plátano' },
            { name: 'PORCION DE MIXTO', price: 12, category: 'PLATOS Y PORCIONES', description: 'Porción mixta' },
            
            // GASEOSAS Y JUGOS
            { name: 'COCA COLA 190ML', price: 3, category: 'GASEOSAS Y JUGOS', description: 'Coca Cola 190ml' },
            { name: 'FANTA 190ML', price: 3, category: 'GASEOSAS Y JUGOS', description: 'Fanta 190ml' },
            { name: 'SPRITE 190ML', price: 3, category: 'GASEOSAS Y JUGOS', description: 'Sprite 190ml' },
            { name: 'COCA COLA 2L', price: 18, category: 'GASEOSAS Y JUGOS', description: 'Coca Cola 2 litros' },
            { name: 'FANTA 2L', price: 18, category: 'GASEOSAS Y JUGOS', description: 'Fanta 2 litros' },
            { name: 'SPRITE 2L', price: 18, category: 'GASEOSAS Y JUGOS', description: 'Sprite 2 litros' },
            { name: 'SIMBA 2L', price: 18, category: 'GASEOSAS Y JUGOS', description: 'Simba 2 litros' },
            { name: 'COCA COLA 600ML', price: 8, category: 'GASEOSAS Y JUGOS', description: 'Coca Cola 600ml' },
            { name: 'FANTA 600ML', price: 8, category: 'GASEOSAS Y JUGOS', description: 'Fanta 600ml' },
            { name: 'SPRITE 600ML', price: 8, category: 'GASEOSAS Y JUGOS', description: 'Sprite 600ml' },
            
            // REFRESCOS NATURALES
            { name: 'TOSTADA 1L', price: 13, category: 'REFRESCOS NATURALES', description: 'Refresco Tostada 1 litro' },
            { name: 'TOSTADA 2L', price: 16, category: 'REFRESCOS NATURALES', description: 'Refresco Tostada 2 litros' },
            { name: 'TOSTADA 2L BOTELLA', price: 18, category: 'REFRESCOS NATURALES', description: 'Refresco Tostada 2 litros en botella' },
            { name: 'TOSTADA VASO', price: 3, category: 'REFRESCOS NATURALES', description: 'Refresco Tostada en vaso' },
            { name: 'LIMONADA 1L', price: 13, category: 'REFRESCOS NATURALES', description: 'Limonada 1 litro' },
            { name: 'LIMONADA 2L', price: 16, category: 'REFRESCOS NATURALES', description: 'Limonada 2 litros' },
            { name: 'LIMONADA 2L BOTELLA', price: 16, category: 'REFRESCOS NATURALES', description: 'Limonada 2 litros en botella' }
        ];

        // Crear productos
        console.log('\n=== CREANDO PRODUCTOS ===');
        for (const product of products) {
            try {
                const categoryId = categoryIds[product.category];
                if (!categoryId) {
                    console.error(`❌ Categoría '${product.category}' no encontrada para producto '${product.name}'`);
                    continue;
                }

                // Verificar si el producto ya existe
                const existingProduct = await new Promise((resolve, reject) => {
                    database.getDB().get(
                        'SELECT id FROM products WHERE name = ?', 
                        [product.name], 
                        (err, row) => {
                            if (err) reject(err);
                            else resolve(row);
                        }
                    );
                });

                if (existingProduct) {
                    // Actualizar producto existente
                    await new Promise((resolve, reject) => {
                        database.getDB().run(
                            'UPDATE products SET price = ?, category_id = ?, description = ?, active = 1, updated_at = CURRENT_TIMESTAMP WHERE name = ?',
                            [product.price, categoryId, product.description, product.name],
                            function(err) {
                                if (err) reject(err);
                                else resolve();
                            }
                        );
                    });
                    console.log(`🔄 Producto '${product.name}' actualizado`);
                } else {
                    // Crear nuevo producto
                    await new Promise((resolve, reject) => {
                        database.getDB().run(
                            'INSERT INTO products (name, description, price, category_id, active) VALUES (?, ?, ?, ?, 1)',
                            [product.name, product.description, product.price, categoryId],
                            function(err) {
                                if (err) reject(err);
                                else resolve({ id: this.lastID });
                            }
                        );
                    });
                    console.log(`✅ Producto '${product.name}' creado - ${product.price} Bs`);
                }
            } catch (error) {
                console.error(`Error procesando producto '${product.name}':`, error);
            }
        }

        // Mostrar resumen
        console.log('\n=== RESUMEN ===');
        
        // Contar productos por categoría
        for (const categoryName of Object.keys(categoryIds)) {
            const count = await new Promise((resolve, reject) => {
                database.getDB().get(
                    'SELECT COUNT(*) as count FROM products WHERE category_id = ? AND active = 1',
                    [categoryIds[categoryName]],
                    (err, row) => {
                        if (err) reject(err);
                        else resolve(row.count);
                    }
                );
            });
            console.log(`📦 ${categoryName}: ${count} productos`);
        }

        const totalProducts = await new Promise((resolve, reject) => {
            database.getDB().get(
                'SELECT COUNT(*) as count FROM products WHERE active = 1',
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row.count);
                }
            );
        });

        console.log(`\n🎉 ¡Configuración completada!`);
        console.log(`📊 Total: ${totalProducts} productos en ${categories.length} categorías`);
        
    } catch (error) {
        console.error('Error en la configuración de productos:', error);
    } finally {
        // Cerrar conexión
        await database.close();
        process.exit(0);
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    createInitialData();
}

module.exports = createInitialData;