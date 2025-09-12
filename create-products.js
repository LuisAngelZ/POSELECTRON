// create-products.js - FINAL: Crear todos los productos con detección automática de imágenes
const database = require('./backend/config/database');
const fs = require('fs');
const path = require('path');

// ===== CONFIGURACIÓN DE IMÁGENES =====
const IMAGES_CONFIG = {
    // Carpeta donde tienes tus imágenes originales
    sourceFolder: './product-images',
    
    // Carpeta destino en el servidor
    targetFolder: './backend/uploads/products',
    
    // Ruta pública para acceder a las imágenes
    publicPath: '/uploads/products',
    
    // Extensiones soportadas (en orden de prioridad)
    extensions: ['.png', '.jpg', '.jpeg', '.webp', '.gif'],
    
    // Imagen por defecto (opcional)
    defaultImage: null
};

async function createInitialData() {
    try {
        console.log('🍔 Iniciando creación de productos y categorías...');
        console.log('🖼️ Con detección automática de imágenes habilitada');
        
        // Conectar a la base de datos
        await database.connect();
        
        // Crear carpetas necesarias
        createDirectories();
        
        // Mostrar estado de la carpeta de imágenes
        showImagesStatus();
        
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
                    console.log(`📂 Categoría '${category.name}' ya existe`);
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
                console.error(`❌ Error procesando categoría '${category.name}':`, error);
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
            { name: 'LIMONADA 2L BOTELLA', price: 16, category: 'REFRESCOS NATURALES', description: 'Limonada 2 litros en botella' },
            { name: 'LIMONADA VASO', price: 3, category: 'REFRESCOS NATURALES', description: 'Refresco Limonada en vaso' },

            // EXTRAS
            { name: 'BOLSA DE HUESOS', price: 3, category: 'EXTRAS', description: 'bolsa de huesos' }
        ];

        // Crear productos con detección automática de imágenes
        console.log('\n=== CREANDO PRODUCTOS CON DETECCIÓN DE IMÁGENES ===');
        let productsCreated = 0;
        let productsWithImages = 0;

        for (const product of products) {
            try {
                const categoryId = categoryIds[product.category];
                if (!categoryId) {
                    console.error(`❌ Categoría '${product.category}' no encontrada para producto '${product.name}'`);
                    continue;
                }

                // Buscar imagen automáticamente
                const imageUrl = findAndCopyProductImage(product.name);
                
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
                            'UPDATE products SET price = ?, category_id = ?, description = ?, image_url = ?, active = 1, updated_at = datetime(\'now\', \'localtime\') WHERE name = ?',
                            [product.price, categoryId, product.description, imageUrl, product.name],
                            function(err) {
                                if (err) reject(err);
                                else resolve();
                            }
                        );
                    });
                    
                    if (imageUrl) {
                        console.log(`🔄🖼️ '${product.name}' actualizado CON imagen`);
                        productsWithImages++;
                    } else {
                        console.log(`🔄📋 '${product.name}' actualizado SIN imagen`);
                    }
                    
                } else {
                    // Crear nuevo producto
                    await new Promise((resolve, reject) => {
                        database.getDB().run(
                            'INSERT INTO products (name, description, price, category_id, image_url, active) VALUES (?, ?, ?, ?, ?, 1)',
                            [product.name, product.description, product.price, categoryId, imageUrl],
                            function(err) {
                                if (err) reject(err);
                                else resolve({ id: this.lastID });
                            }
                        );
                    });
                    
                    productsCreated++;
                    if (imageUrl) {
                        console.log(`✅🖼️ '${product.name}' creado CON imagen - Bs ${product.price}`);
                        productsWithImages++;
                    } else {
                        console.log(`✅📋 '${product.name}' creado SIN imagen - Bs ${product.price}`);
                    }
                }
                
            } catch (error) {
                console.error(`❌ Error procesando producto '${product.name}':`, error);
            }
        }

        // Mostrar resumen final
        console.log('\n=== RESUMEN FINAL ===');
        
        // Contar productos por categoría
        for (const categoryName of Object.keys(categoryIds)) {
            const stats = await new Promise((resolve, reject) => {
                database.getDB().get(
                    `SELECT 
                        COUNT(*) as total,
                        COUNT(image_url) as with_images
                    FROM products 
                    WHERE category_id = ? AND active = 1`,
                    [categoryIds[categoryName]],
                    (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    }
                );
            });
            
            console.log(`📦 ${categoryName}: ${stats.total} productos (${stats.with_images} con imagen)`);
        }

        // Estadísticas globales
        const totalStats = await new Promise((resolve, reject) => {
            database.getDB().get(
                `SELECT 
                    COUNT(*) as total,
                    COUNT(image_url) as with_images
                FROM products WHERE active = 1`,
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });

        console.log(`\n🎉 ¡Configuración completada exitosamente!`);
        console.log(`📊 ESTADÍSTICAS FINALES:`);
        console.log(`   📦 Total productos: ${totalStats.total}`);
        console.log(`   🖼️ Con imágenes: ${totalStats.with_images}`);
        console.log(`   📋 Sin imágenes: ${totalStats.total - totalStats.with_images}`);
        console.log(`   🏷️ Categorías: ${categories.length}`);
        
        if (totalStats.with_images > 0) {
            console.log(`\n📂 Imágenes copiadas a: ${IMAGES_CONFIG.targetFolder}`);
            console.log(`🌐 URL base: ${IMAGES_CONFIG.publicPath}/[imagen]`);
        }
        
        if (totalStats.total - totalStats.with_images > 0) {
            console.log(`\n💡 TIP: Para agregar imágenes después:`);
            console.log(`   1. Coloca la imagen en: ${IMAGES_CONFIG.sourceFolder}/`);
            console.log(`   2. Nombra el archivo igual al producto (ej: CHICKEN 1.png)`);
            console.log(`   3. Ejecuta el build nuevamente`);
        }
        
    } catch (error) {
        console.error('❌ Error en la configuración de productos:', error);
    } finally {
        // Cerrar conexión
        await database.close();
        process.exit(0);
    }
}

// ===== FUNCIONES AUXILIARES PARA IMÁGENES =====

function createDirectories() {
    try {
        // Crear carpeta de destino si no existe
        if (!fs.existsSync(IMAGES_CONFIG.targetFolder)) {
            fs.mkdirSync(IMAGES_CONFIG.targetFolder, { recursive: true });
            console.log(`📁 Carpeta creada: ${IMAGES_CONFIG.targetFolder}`);
        }
        
        // Crear carpeta source si no existe (para que el usuario sepa dónde poner las imágenes)
        if (!fs.existsSync(IMAGES_CONFIG.sourceFolder)) {
            fs.mkdirSync(IMAGES_CONFIG.sourceFolder, { recursive: true });
            console.log(`📁 Carpeta para imágenes creada: ${IMAGES_CONFIG.sourceFolder}`);
        }
        
    } catch (error) {
        console.warn(`⚠️ Error creando carpetas:`, error.message);
    }
}

function showImagesStatus() {
    try {
        if (fs.existsSync(IMAGES_CONFIG.sourceFolder)) {
            const files = fs.readdirSync(IMAGES_CONFIG.sourceFolder)
                .filter(file => IMAGES_CONFIG.extensions.some(ext => file.toLowerCase().endsWith(ext)));
            
            console.log(`📂 Carpeta de imágenes: ${IMAGES_CONFIG.sourceFolder}`);
            console.log(`🖼️ Imágenes encontradas: ${files.length}`);
            
            if (files.length > 0) {
                console.log(`   Archivos: ${files.slice(0, 5).join(', ')}${files.length > 5 ? '...' : ''}`);
            } else {
                console.log(`💡 Para agregar imágenes, coloca archivos ${IMAGES_CONFIG.extensions.join(', ')} en esta carpeta`);
            }
        } else {
            console.log(`📂 Carpeta de imágenes no existe: ${IMAGES_CONFIG.sourceFolder}`);
            console.log(`💡 Se creará automáticamente para que puedas agregar imágenes después`);
        }
    } catch (error) {
        console.warn(`⚠️ Error verificando imágenes:`, error.message);
    }
}

function findAndCopyProductImage(productName) {
    try {
        if (!fs.existsSync(IMAGES_CONFIG.sourceFolder)) {
            return IMAGES_CONFIG.defaultImage;
        }

        // Lista de variaciones a probar
        const nameVariations = [
            productName,                                    // Nombre exacto
            productName.replace(/\s+/g, '_'),              // Espacios → guiones bajos
            productName.replace(/\s+/g, '-'),              // Espacios → guiones
            productName.replace(/\s+/g, ''),               // Sin espacios
            productName.toLowerCase(),                      // Minúsculas
            productName.toLowerCase().replace(/\s+/g, '_'), // Minúsculas + guiones bajos
            productName.toLowerCase().replace(/\s+/g, '-'), // Minúsculas + guiones
            productName.toLowerCase().replace(/\s+/g, '')   // Minúsculas sin espacios
        ];

        // Buscar en todas las combinaciones
        for (const variation of nameVariations) {
            for (const ext of IMAGES_CONFIG.extensions) {
                const sourceFile = path.join(IMAGES_CONFIG.sourceFolder, variation + ext);
                
                if (fs.existsSync(sourceFile)) {
                    try {
                        // Copiar con el nombre estándar del producto
                        const standardName = productName + ext;
                        const targetFile = path.join(IMAGES_CONFIG.targetFolder, standardName);
                        const publicUrl = IMAGES_CONFIG.publicPath + '/' + standardName;
                        
                        // Copiar archivo
                        fs.copyFileSync(sourceFile, targetFile);
                        
                        // Log detallado
                        if (variation === productName) {
                            console.log(`📋 Imagen: ${standardName}`);
                        } else {
                            console.log(`📋 Imagen: ${variation + ext} → ${standardName}`);
                        }
                        
                        return publicUrl;
                        
                    } catch (copyError) {
                        console.warn(`⚠️ Error copiando ${sourceFile}:`, copyError.message);
                    }
                }
            }
        }

        return IMAGES_CONFIG.defaultImage;
        
    } catch (error) {
        console.warn(`⚠️ Error buscando imagen para '${productName}':`, error.message);
        return IMAGES_CONFIG.defaultImage;
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    createInitialData();
}

module.exports = createInitialData;