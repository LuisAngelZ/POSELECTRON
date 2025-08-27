// create-users.js - Script para crear usuarios del sistema
const bcrypt = require('bcryptjs');
const database = require('./backend/config/database');

async function createSystemUsers() {
    try {
        console.log('🔧 Iniciando creación de usuarios del sistema...');
        
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
                full_name: 'Cajero Principal',
                role: 'user'
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
                    console.log(`⚠️  Usuario '${userData.username}' ya existe, actualizando...`);
                    
                    // Actualizar usuario existente
                    const hashedPassword = bcrypt.hashSync(userData.password, 10);
                    await new Promise((resolve, reject) => {
                        database.getDB().run(
                            'UPDATE users SET password = ?, full_name = ?, role = ?, active = 1, updated_at = CURRENT_TIMESTAMP WHERE username = ?',
                            [hashedPassword, userData.full_name, userData.role, userData.username],
                            function(err) {
                                if (err) reject(err);
                                else resolve();
                            }
                        );
                    });
                    
                    console.log(`✅ Usuario '${userData.username}' actualizado exitosamente`);
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
                    
                    console.log(`✅ Usuario '${userData.username}' creado exitosamente`);
                }
            } catch (userError) {
                console.error(`❌ Error procesando usuario '${userData.username}':`, userError);
            }
        }

        // Mostrar todos los usuarios
        console.log('\n📋 Usuarios en el sistema:');
        const allUsers = await new Promise((resolve, reject) => {
            database.getDB().all(
                'SELECT id, username, full_name, role, active, created_at FROM users ORDER BY id',
                [],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });

        console.table(allUsers);
        
        console.log('\n🎉 Usuarios del sistema configurados correctamente!');
        console.log('\n📝 Credenciales de acceso:');
        console.log('👑 Admin: admin / 123456');
        console.log('👨‍💼 Cajero: cajero1 / cajero1');
        
    } catch (error) {
        console.error('❌ Error en la configuración:', error);
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