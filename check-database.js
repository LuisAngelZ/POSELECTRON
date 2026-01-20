const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database/pos.db');

console.log('\n=== REVISOR DE BASE DE DATOS ===\n');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error conexión:', err);
        process.exit(1);
    }
    console.log('✓ Conectado a:', dbPath);
    
    // Obtener todas las tablas
    db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
        if (err) {
            console.error('Error:', err);
            process.exit(1);
        }

        console.log(`\n📊 TABLAS ENCONTRADAS: ${tables.length}\n`);

        tables.forEach(table => {
            const tableName = table.name;
            
            // Info de estructura
            db.all(`PRAGMA table_info(${tableName})`, (err, columns) => {
                console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
                console.log(`📋 TABLA: ${tableName}`);
                console.log(`   Columnas: ${columns.map(c => c.name).join(', ')}`);

                // Contar registros
                db.get(`SELECT COUNT(*) as count FROM ${tableName}`, (err, row) => {
                    console.log(`   📈 Registros: ${row.count}`);

                    // Mostrar datos
                    if (row.count > 0) {
                        db.all(`SELECT * FROM ${tableName} LIMIT 5`, (err, rows) => {
                            console.log(`   Primeros registros:`);
                            rows.forEach((r, idx) => {
                                console.log(`     [${idx + 1}]`, JSON.stringify(r, null, 2).split('\n').join('\n        '));
                            });
                            if (row.count > 5) {
                                console.log(`     ... y ${row.count - 5} más`);
                            }
                        });
                    }
                });
            });
        });

        // Cerrar después de un tiempo
        setTimeout(() => {
            db.close();
            console.log('\n\n✓ Verificación completada\n');
        }, 3000);
    });
});
