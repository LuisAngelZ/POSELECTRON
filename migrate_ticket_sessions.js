// server/scripts/migrate_ticket_sessions.js - Script para crear las tablas automáticamente

const database = require('./backend/config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    try {
        console.log('🚀 Iniciando migración de base de datos para sesiones de tickets...');
        
        await database.ensureConnected();
        const db = database.getDB();
        
        return new Promise((resolve, reject) => {
            db.serialize(() => {
                // 1. Crear tabla ticket_sessions
                console.log('📋 Creando tabla ticket_sessions...');
                db.run(`
                    CREATE TABLE IF NOT EXISTS ticket_sessions (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        session_date DATE NOT NULL,
                        user_id INTEGER NOT NULL,
                        last_ticket_number INTEGER DEFAULT 0,
                        session_started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        session_ended_at DATETIME NULL,
                        total_sales_in_session INTEGER DEFAULT 0,
                        total_amount_in_session DECIMAL(10,2) DEFAULT 0.00,
                        is_active BOOLEAN DEFAULT 1,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users(id)
                    )
                `, (err) => {
                    if (err) {
                        console.error('❌ Error creando tabla ticket_sessions:', err);
                        reject(err);
                        return;
                    }
                    console.log('✅ Tabla ticket_sessions creada correctamente');
                });

                // 2. Crear índices
                console.log('🔍 Creando índices...');
                db.run(`
                    CREATE INDEX IF NOT EXISTS idx_ticket_sessions_date_user 
                    ON ticket_sessions(session_date, user_id)
                `, (err) => {
                    if (err) {
                        console.error('❌ Error creando índice date_user:', err);
                    } else {
                        console.log('✅ Índice date_user creado');
                    }
                });

                db.run(`
                    CREATE INDEX IF NOT EXISTS idx_ticket_sessions_active 
                    ON ticket_sessions(is_active)
                `, (err) => {
                    if (err) {
                        console.error('❌ Error creando índice active:', err);
                    } else {
                        console.log('✅ Índice active creado');
                    }
                });

                // 3. Verificar si la columna ticket_number ya existe en sales
                console.log('🔍 Verificando estructura de tabla sales...');
                db.all("PRAGMA table_info(sales)", (err, columns) => {
                    if (err) {
                        console.error('❌ Error verificando tabla sales:', err);
                        reject(err);
                        return;
                    }

                    const hasTicketNumber = columns.some(col => col.name === 'ticket_number');
                    
                    if (!hasTicketNumber) {
                        console.log('📝 Agregando columna ticket_number a tabla sales...');
                        db.run(`
                            ALTER TABLE sales ADD COLUMN ticket_number INTEGER
                        `, (alterErr) => {
                            if (alterErr) {
                                console.error('❌ Error agregando columna ticket_number:', alterErr);
                                reject(alterErr);
                                return;
                            }
                            console.log('✅ Columna ticket_number agregada a sales');
                        });
                    } else {
                        console.log('✅ Columna ticket_number ya existe en sales');
                    }
                });

                // 4. Crear sesión inicial para usuarios existentes
                console.log('👥 Creando sesiones iniciales para usuarios existentes...');
                const today = new Date().toISOString().split('T')[0];
                
                db.all("SELECT id, username FROM users WHERE active = 1 OR active IS NULL", (err, users) => {
                    if (err) {
                        console.error('❌ Error obteniendo usuarios:', err);
                        reject(err);
                        return;
                    }

                    if (users.length === 0) {
                        console.log('⚠️ No se encontraron usuarios activos');
                        resolve();
                        return;
                    }

                    let processedUsers = 0;
                    
                    users.forEach(user => {
                        db.run(`
                            INSERT OR IGNORE INTO ticket_sessions 
                            (session_date, user_id, last_ticket_number, is_active) 
                            VALUES (?, ?, 0, 1)
                        `, [today, user.id], (insertErr) => {
                            if (insertErr) {
                                console.error(`❌ Error creando sesión para ${user.username}:`, insertErr);
                            } else {
                                console.log(`✅ Sesión inicial creada para ${user.username}`);
                            }
                            
                            processedUsers++;
                            if (processedUsers === users.length) {
                                // 5. Migrar números de ticket existentes (si hay ventas de hoy)
                                migrateExistingTickets(db, today, resolve, reject);
                            }
                        });
                    });
                });
            });
        });

    } catch (error) {
        console.error('❌ Error en migración:', error);
        throw error;
    }
}

function migrateExistingTickets(db, today, resolve, reject) {
    console.log('🔄 Migrando tickets existentes del día...');
    
    // Obtener ventas de hoy que no tengan ticket_number
    db.all(`
        SELECT id, user_id, created_at 
        FROM sales 
        WHERE DATE(created_at) = ? AND ticket_number IS NULL
        ORDER BY created_at ASC
    `, [today], (err, sales) => {
        if (err) {
            console.error('❌ Error obteniendo ventas para migración:', err);
            reject(err);
            return;
        }

        if (sales.length === 0) {
            console.log('✅ No hay ventas de hoy para migrar');
            resolve();
            return;
        }

        console.log(`📊 Migrando ${sales.length} ventas existentes...`);
        
        // Agrupar por usuario y asignar números secuenciales
        const salesByUser = {};
        sales.forEach(sale => {
            if (!salesByUser[sale.user_id]) {
                salesByUser[sale.user_id] = [];
            }
            salesByUser[sale.user_id].push(sale);
        });

        let totalProcessed = 0;
        const totalSales = sales.length;

        Object.keys(salesByUser).forEach(userId => {
            const userSales = salesByUser[userId];
            
            userSales.forEach((sale, index) => {
                const ticketNumber = index + 1;
                
                db.run(`
                    UPDATE sales 
                    SET ticket_number = ? 
                    WHERE id = ?
                `, [ticketNumber, sale.id], (updateErr) => {
                    if (updateErr) {
                        console.error(`❌ Error actualizando venta ${sale.id}:`, updateErr);
                    } else {
                        console.log(`✅ Venta ${sale.id} → Ticket #${ticketNumber} (Usuario ${userId})`);
                    }
                    
                    totalProcessed++;
                    if (totalProcessed === totalSales) {
                        // Actualizar contadores de sesiones
                        updateSessionCounters(db, today, salesByUser, resolve, reject);
                    }
                });
            });
        });
    });
}

function updateSessionCounters(db, today, salesByUser, resolve, reject) {
    console.log('🔢 Actualizando contadores de sesiones...');
    
    const userIds = Object.keys(salesByUser);
    let processedUsers = 0;

    userIds.forEach(userId => {
        const userSales = salesByUser[userId];
        const lastTicketNumber = userSales.length;
        
        // Calcular total amount para este usuario
        db.get(`
            SELECT COUNT(*) as sales_count, COALESCE(SUM(total), 0) as total_amount
            FROM sales 
            WHERE user_id = ? AND DATE(created_at) = ?
        `, [userId, today], (err, result) => {
            if (err) {
                console.error(`❌ Error calculando totales para usuario ${userId}:`, err);
            } else {
                // Actualizar sesión del usuario
                db.run(`
                    UPDATE ticket_sessions 
                    SET last_ticket_number = ?,
                        total_sales_in_session = ?,
                        total_amount_in_session = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = ? AND session_date = ?
                `, [lastTicketNumber, result.sales_count, result.total_amount, userId, today], (updateErr) => {
                    if (updateErr) {
                        console.error(`❌ Error actualizando sesión usuario ${userId}:`, updateErr);
                    } else {
                        console.log(`✅ Sesión actualizada para usuario ${userId}: ${lastTicketNumber} tickets`);
                    }
                    
                    processedUsers++;
                    if (processedUsers === userIds.length) {
                        console.log('🎉 Migración completada exitosamente!');
                        console.log('📋 Resumen:');
                        console.log(`   • Tabla ticket_sessions creada`);
                        console.log(`   • Columna ticket_number agregada a sales`);
                        console.log(`   • ${Object.keys(salesByUser).length} usuarios migrados`);
                        console.log(`   • ${Object.values(salesByUser).flat().length} ventas procesadas`);
                        resolve();
                    }
                });
            }
        });
    });
}

// Función para ejecutar desde línea de comandos
async function main() {
    try {
        await runMigration();
        console.log('✅ Migración completada. El sistema está listo para usar sesiones de tickets.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error en migración:', error);
        process.exit(1);
    }
}

// Función para usar desde otros módulos
module.exports = {
    runMigration,
    main
};

// Ejecutar si se llama directamente
if (require.main === module) {
    main();
}