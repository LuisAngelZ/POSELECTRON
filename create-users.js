// create-users.js - Script para crear usuarios del sistema
const bcrypt = require('bcryptjs');
const database = require('./backend/config/database');

async function createSystemUsers() {
    try {
        console.log('Iniciando creación de usuarios del sistema...');
        
        // Conectar a la base de datos
        await database.connect();
        
        const users = [
            {
                username: 'admin',
                password: '123456',
                full_name: 'Administrador del Sistema',
                role: 'admin'
            },
            {
                username: 'cajero1',
                password: 'cajero1',
                full_name: 'Cajero 1',
                role: 'cajero'
            },
            {
                username: 'cajero2',
                password: 'cajero2',
                full_name: 'Cajero 2',
                role: 'cajero'
            }, 
            {
                username: 'cajero3',
                password: 'cajero3',
                full_name: 'Cajero 3',
                role: 'cajero'
            }
        ];

        for (const userData of users) {
            try {
                // Verificar si el usuario ya existe
                const existingUser = await new Promise((resolve, reject) => {
                    database.getDB().get(
                        'SELECT id FROM users WHERE username = ?', 
                        [userData.username], 
                        (err, row) => {
                            if (err) reject(err);
                            else resolve(row);
                        }
                    );
                });

               if (existingUser) {
    console.log(`Usuario '${userData.username}' ya existe, actualizando...`);
    
    // Actualizar usuario existente
    const hashedPassword = bcrypt.hashSync(userData.password, 10);
    await new Promise((resolve, reject) => {
        database.getDB().run(
            'UPDATE users SET password = ?, full_name = ?, role = ?, active = 1, updated_at = datetime(\'now\', \'localtime\') WHERE username = ?',
            [hashedPassword, userData.full_name, userData.role, userData.username],
            function(err) {
                if (err) reject(err);
                else resolve();
            }
        );
    });
    
    console.log(`Usuario '${userData.username}' actualizado exitosamente`);
} else {
                    // Crear nuevo usuario
                    const hashedPassword = bcrypt.hashSync(userData.password, 10);
                    await new Promise((resolve, reject) => {
                        database.getDB().run(
                            'INSERT INTO users (username, password, full_name, role, active) VALUES (?, ?, ?, ?, 1)',
                            [userData.username, hashedPassword, userData.full_name, userData.role],
                            function(err) {
                                if (err) reject(err);
                                else resolve({ id: this.lastID });
                            }
                        );
                    });
                    
                    console.log(`Usuario '${userData.username}' creado exitosamente`);
                }
            } catch (userError) {
                console.error(`Error procesando usuario '${userData.username}':`, userError);
            }
        }

       // Crear tabla ticket_sessions automáticamente
console.log('\nCreando tabla ticket_sessions...');
await new Promise((resolve, reject) => {
    database.getDB().run(`
        CREATE TABLE IF NOT EXISTS ticket_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_date DATE NOT NULL,
            user_id INTEGER NOT NULL,
            last_ticket_number INTEGER DEFAULT 0,
            session_started_at DATETIME DEFAULT (datetime('now', 'localtime')),
            session_ended_at DATETIME NULL,
            total_sales_in_session INTEGER DEFAULT 0,
            total_amount_in_session DECIMAL(10,2) DEFAULT 0.00,
            is_active BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT (datetime('now', 'localtime')),
            updated_at DATETIME DEFAULT (datetime('now', 'localtime')),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `, (err) => {
        if (err) reject(err);
        else resolve();
    });
});

        // Crear índices
        await new Promise((resolve, reject) => {
            database.getDB().run(`
                CREATE INDEX IF NOT EXISTS idx_ticket_sessions_date_user 
                ON ticket_sessions(session_date, user_id)
            `, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        // Agregar columna ticket_number a sales si no existe
        console.log('Verificando columna ticket_number en tabla sales...');
        const columns = await new Promise((resolve, reject) => {
            database.getDB().all("PRAGMA table_info(sales)", (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        const hasTicketNumber = columns.some(col => col.name === 'ticket_number');
        if (!hasTicketNumber) {
            await new Promise((resolve, reject) => {
                database.getDB().run(`ALTER TABLE sales ADD COLUMN ticket_number INTEGER`, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
            console.log('Columna ticket_number agregada a tabla sales');
        } else {
            console.log('Columna ticket_number ya existe');
        }

        // Crear sesiones iniciales para todos los usuarios
        console.log('Creando sesiones iniciales de tickets...');
        const today = new Date().toLocaleDateString('en-CA'); // Usa fecha local
        
        for (const userData of users) {
            const user = await new Promise((resolve, reject) => {
                database.getDB().get(
                    'SELECT id FROM users WHERE username = ?', 
                    [userData.username], 
                    (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    }
                );
            });

            if (user) {
                await new Promise((resolve, reject) => {
                    database.getDB().run(`
                        INSERT OR IGNORE INTO ticket_sessions 
                        (session_date, user_id, last_ticket_number, is_active) 
                        VALUES (?, ?, 0, 1)
                    `, [today, user.id], (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
                console.log(`Sesión inicial creada para ${userData.username}`);
            }
        }

        console.log('\nUsuarios del sistema configurados correctamente!');
        console.log('\nCredenciales de acceso:');
        console.log('Admin: admin / 123456');
        console.log('Cajero 1: cajero1 / cajero1');
        console.log('Cajero 2: cajero2 / cajero2');
        console.log('Cajero 3: cajero3 / cajero3');
        
    } catch (error) {
        console.error('Error en la configuración:', error);
    } finally {
        // Cerrar conexión
        await database.close();
        process.exit(0);
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    createSystemUsers();
}

module.exports = createSystemUsers;