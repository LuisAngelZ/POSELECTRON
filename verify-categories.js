// verify-categories.js - Verificación de categorías
// Coloca este archivo en la RAÍZ de tu proyecto

const database = require('./backend/config/database');

async function verifyCategories() {
    try {
        console.log('🔍 Verificando categorías en la base de datos...');
        
        await database.connect();
        
        const categories = await new Promise((resolve, reject) => {
            database.getDB().all('SELECT name FROM categories ORDER BY name', (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
        
        console.log('📊 CATEGORÍAS ENCONTRADAS:');
        
        if (categories.length === 0) {
            console.log('   (No hay categorías en la base de datos)');
        } else {
            categories.forEach(cat => {
                console.log(`   - "${cat.name}"`);
            });
        }
        
        // Verificar si existe la categoría problemática "Comidas"
        const hasComidas = categories.find(c => c.name === 'Comidas');
        
        if (hasComidas) {
            console.log('❌ ERROR: Se encontró la categoría "Comidas" - esto es incorrecto');
            console.log('💡 La base de datos no se limpió correctamente');
            await database.close();
            process.exit(1);
        }
        
        // Verificar que tiene las categorías correctas
        const expectedCategories = [
            'PLATOS Y PORCIONES',
            'GASEOSAS Y JUGOS',
            'REFRESCOS NATURALES',
            'EXTRAS'
        ];
        
        const actualNames = categories.map(c => c.name);
        const hasAllExpected = expectedCategories.every(expected => 
            actualNames.includes(expected)
        );
        
        if (!hasAllExpected) {
            console.log('⚠️ ADVERTENCIA: No se encontraron todas las categorías esperadas');
            console.log('📋 Categorías esperadas:', expectedCategories);
            console.log('📋 Categorías encontradas:', actualNames);
        } else {
            console.log('✅ Todas las categorías correctas están presentes');
        }
        
        console.log('✅ Verificación de categorías completada');
        
        await database.close();
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Error verificando categorías:', error);
        try {
            await database.close();
        } catch (closeError) {
            // Ignorar error de cierre
        }
        process.exit(1);
    }
}

// Ejecutar verificación
verifyCategories();