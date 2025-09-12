// clean-database.js - Limpieza completa de base de datos
// Coloca este archivo en la RAÍZ de tu proyecto (mismo nivel que package.json)

const database = require('./backend/config/database');

async function cleanAndVerifyDatabase() {
    try {
        console.log('🧹 ===== LIMPIEZA COMPLETA DE BASE DE DATOS =====');
        
        // Conectar a la base de datos
        await database.connect();
        
        // 1. Eliminar todas las tablas en el orden correcto (evitar foreign key issues)
        const tables = ['sale_details', 'sales', 'ticket_sessions', 'products', 'categories', 'users'];
        
        console.log('🗑️ Eliminando todas las tablas...');
        for (const table of tables) {
            try {
                await new Promise((resolve, reject) => {
                    database.getDB().run(`DROP TABLE IF EXISTS ${table}`, (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
                console.log(`✅ Tabla ${table} eliminada`);
            } catch (error) {
                console.log(`⚠️ No se pudo eliminar ${table}:`, error.message);
            }
        }
        
        // 2. Recrear todas las tablas desde cero
        console.log('\n📋 Recreando estructura de base de datos...');
        await database.initTables();
        console.log('✅ Estructura de base de datos recreada');
        
        // 3. Verificar que no hay categorías existentes (debe estar vacía)
        const categories = await new Promise((resolve, reject) => {
            database.getDB().all('SELECT * FROM categories', (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
        
        console.log('\n📊 ESTADO ACTUAL DE CATEGORÍAS:');
        if (categories.length === 0) {
            console.log('   ✅ Base de datos limpia - no hay categorías');
        } else {
            console.log('   ⚠️ Categorías encontradas (serán sobrescritas):');
            categories.forEach(cat => {
                console.log(`      - ID: ${cat.id}, Nombre: "${cat.name}"`);
            });
        }
        
        // 4. Verificar productos (debería estar vacío también)
        const products = await new Promise((resolve, reject) => {
            database.getDB().all('SELECT COUNT(*) as count FROM products', (err, rows) => {
                if (err) reject(err);
                else resolve(rows[0]?.count || 0);
            });
        });
        
        console.log(`📦 Productos en base de datos: ${products}`);
        
        // 5. Verificar usuarios (debería estar vacío)
        const users = await new Promise((resolve, reject) => {
            database.getDB().all('SELECT COUNT(*) as count FROM users', (err, rows) => {
                if (err) reject(err);
                else resolve(rows[0]?.count || 0);
            });
        });
        
        console.log(`👥 Usuarios en base de datos: ${users}`);
        
        console.log('\n✅ ===== BASE DE DATOS COMPLETAMENTE LIMPIA =====');
        console.log('🎯 Lista para crear usuarios y productos desde cero');
        
    } catch (error) {
        console.error('❌ Error en limpieza de base de datos:', error);
        console.error('💡 Asegúrate de que no haya otras instancias de la app corriendo');
        throw error;
    } finally {
        try {
            await database.close();
        } catch (closeError) {
            console.warn('⚠️ Error cerrando conexión:', closeError.message);
        }
        process.exit(0);
    }
}

// Ejecutar automáticamente si se llama directamente
if (require.main === module) {
    console.log('🚀 Iniciando limpieza de base de datos...');
    cleanAndVerifyDatabase().catch(error => {
        console.error('💥 ERROR CRÍTICO:', error);
        process.exit(1);
    });
}

module.exports = cleanAndVerifyDatabase;