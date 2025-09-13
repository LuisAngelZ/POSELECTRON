// server/config/database.js - Versión corregida
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class Database {
    constructor() {
        this.db = null;
        this.isInitialized = false;
        this.setupPaths();
    }
  setupPaths() {
        // Determinar la carpeta de datos según el entorno
        let dataPath;
        
        try {
            if (app && app.getPath) {
                // En producción: usar carpeta de datos de usuario
                dataPath = path.join(app.getPath('userData'), 'database');
            } else {
                // En desarrollo o sin Electron
                dataPath = path.join(__dirname, '../../database');
            }
        } catch (error) {
            // Fallback para desarrollo
            dataPath = path.join(__dirname, '../../database');
        }

        // Crear directorio si no existe
        if (!fs.existsSync(dataPath)) {
            fs.mkdirSync(dataPath, { recursive: true });
        }

        this.dbPath = path.join(dataPath, 'pos.db');
        console.log('📂 Base de datos ubicada en:', this.dbPath);
    }

    async connect() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('❌ Error conectando a SQLite:', err);
                    reject(err);
                } else {
                    console.log('✅ Conectado a SQLite local');
                    this.initTables().then(() => {
                        this.isInitialized = true;
                        resolve(this.db);
                    }).catch(reject);
                }
            });
        });
    }

    async connect() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('Error conectando a la base de datos:', err);
                    reject(err);
                } else {
                    console.log('Conectado a SQLite database');
                    this.initTables().then(() => {
                        this.isInitialized = true;
                        resolve(this.db);
                    }).catch(reject);
                }
            });
        });
    }

async initTables() {
    console.log('📋 Creando tablas con hora local...');
    
    await this.runAsync('PRAGMA foreign_keys = ON');
    await this.createUsersTable();
    await this.createCategoriesTable();
    await this.createProductsTable();
    await this.createSalesTable();
    await this.createSaleDetailsTable();

    await this.runMigrations();
    
    // AGREGAR ESTAS DOS LÍNEAS:
    await this.fixExistingTimestampsToLocal();
    await this.testTimezoneConfiguration();
    
    console.log('✅ Base de datos configurada con hora local');
}
    runAsync(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) reject(err);
                else resolve({ id: this.lastID, changes: this.changes });
            });
        });
    }

    
async createUsersTable() {
    const sql = `
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username VARCHAR(50) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            full_name VARCHAR(100) NOT NULL,
            role VARCHAR(20) DEFAULT 'user',
            active BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT (datetime('now', 'localtime')),
            updated_at DATETIME DEFAULT (datetime('now', 'localtime'))
        )
    `;
    await this.runAsync(sql);
    console.log('✅ Tabla users creada con hora local');
}

async createCategoriesTable() {
    const sql = `
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(100) NOT NULL,
            description TEXT,
            active BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT (datetime('now', 'localtime')),
            updated_at DATETIME DEFAULT (datetime('now', 'localtime'))
        )
    `;
    await this.runAsync(sql);
    console.log('✅ Tabla categories creada con hora local');
}

async createProductsTable() {
    const sql = `
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(100) NOT NULL,
            description TEXT,
            price DECIMAL(10,2) NOT NULL,
            category_id INTEGER,
            image_url VARCHAR(255),
            active BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT (datetime('now', 'localtime')),
            updated_at DATETIME DEFAULT (datetime('now', 'localtime')),
            FOREIGN KEY (category_id) REFERENCES categories(id)
        )
    `;
    await this.runAsync(sql);
    console.log('✅ Tabla products creada con hora local');
}
static getBoliviaDateTime() {
        // Crear fecha en UTC
        const now = new Date();
        
        // Convertir a hora de Bolivia (UTC-4) de forma manual y consistente
        const boliviaTime = new Date(now.getTime() - (4 * 60 * 60 * 1000));
        
        // Formatear en formato SQLite
        return boliviaTime.toISOString().slice(0, 19).replace('T', ' ');
    }

    async createSalesTable() {
        const sql = `
            CREATE TABLE IF NOT EXISTS sales (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_nit VARCHAR(20),
                customer_name VARCHAR(100),
                order_type VARCHAR(20) NOT NULL,
                payment_type VARCHAR(20) NOT NULL DEFAULT 'efectivo',
                table_number VARCHAR(10),
                observations TEXT,
                subtotal DECIMAL(10,2) NOT NULL,
                total DECIMAL(10,2) NOT NULL,
                paid_amount DECIMAL(10,2) NOT NULL,
                change_amount DECIMAL(10,2) DEFAULT 0,
                user_id INTEGER NOT NULL,
                ticket_number INTEGER,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `;
        await this.runAsync(sql);
        console.log('✅ Tabla sales creada SIN datetime automático problemático');
    }


    async createSaleDetailsTable() {
        const sql = `
            CREATE TABLE IF NOT EXISTS sale_details (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sale_id INTEGER NOT NULL,
                product_id INTEGER NOT NULL,
                product_name VARCHAR(100) NOT NULL,
                quantity INTEGER NOT NULL,
                unit_price DECIMAL(10,2) NOT NULL,
                subtotal DECIMAL(10,2) NOT NULL,
                FOREIGN KEY (sale_id) REFERENCES sales(id),
                FOREIGN KEY (product_id) REFERENCES products(id)
            )
        `;
        await this.runAsync(sql);
        console.log('✅ Tabla sale_details creada');
    }

    getDB() {
        if (!this.db) {
            throw new Error('Base de datos no inicializada. Llama a connect() primero.');
        }
        return this.db;
    }

    async ensureConnected() {
        if (!this.isInitialized) {
            await this.connect();
        }
        return this.db;
    }

    close() {
        return new Promise((resolve) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) console.error('Error cerrando la base de datos:', err);
                    else console.log('Base de datos cerrada');
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }

    // AGREGAR ESTA NUEVA FUNCIÓN:
async runMigrations() {
    console.log('🔄 Ejecutando migraciones...');
    
    try {
        // Verificar si la columna payment_type existe
        const tableInfo = await new Promise((resolve, reject) => {
            this.db.all("PRAGMA table_info(sales)", (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        const hasPaymentType = tableInfo.some(column => column.name === 'payment_type');
        
        if (!hasPaymentType) {
            console.log('📝 Agregando columna payment_type a tabla sales...');
            
            // Agregar la columna
            await this.runAsync(`
                ALTER TABLE sales 
                ADD COLUMN payment_type VARCHAR(20) DEFAULT 'efectivo'
            `);
            
            // Actualizar registros existentes
            await this.runAsync(`
                UPDATE sales 
                SET payment_type = 'efectivo' 
                WHERE payment_type IS NULL
            `);
            
            console.log('✅ Columna payment_type agregada exitosamente');
        } else {
            console.log('✅ Columna payment_type ya existe');
        }
        
    } catch (error) {
        console.error('❌ Error ejecutando migraciones:', error);
        throw error;
    }
}
async fixExistingTimestampsToLocal() {
    console.log('🕐 Corrigiendo timestamps existentes a hora local...');
    
    try {
        // Verificar si hay ventas para corregir
        const salesCount = await new Promise((resolve, reject) => {
            this.db.get('SELECT COUNT(*) as count FROM sales', (err, row) => {
                if (err) reject(err);
                else resolve(row ? row.count : 0);
            });
        });
        
        console.log(`📊 Encontradas ${salesCount} ventas`);
        
        if (salesCount > 0) {
            // Corregir ventas: restar 4 horas para convertir UTC a hora boliviana
            await this.runAsync(`
                UPDATE sales 
                SET created_at = datetime(created_at, '-4 hours')
                WHERE created_at > '2025-01-01'
            `);
            console.log('✅ Timestamps de ventas corregidos a hora local');
        }
        
        // Corregir usuarios si existen
        const usersCount = await new Promise((resolve, reject) => {
            this.db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
                if (err) reject(err);
                else resolve(row ? row.count : 0);
            });
        });
        
        if (usersCount > 0) {
            await this.runAsync(`
                UPDATE users 
                SET created_at = datetime(created_at, '-4 hours'),
                    updated_at = datetime(updated_at, '-4 hours')
                WHERE created_at > '2025-01-01'
            `);
            console.log('✅ Timestamps de usuarios corregidos');
        }
        
        console.log('🎉 Corrección de timestamps completada');
        
    } catch (error) {
        console.error('❌ Error corrigiendo timestamps:', error);
        // No lanzar error para no bloquear el inicio
    }
}

// 3. AGREGAR FUNCIÓN DE VERIFICACIÓN:

async testTimezoneConfiguration() {
    console.log('\n🧪 ===== VERIFICACIÓN DE ZONA HORARIA =====');
    
    try {
        // Verificar hora del sistema
        const systemTime = new Date().toLocaleString('es-BO');
        console.log(`🖥️  Hora del sistema: ${systemTime}`);
        
        // Verificar hora en SQLite UTC
        const utcResult = await new Promise((resolve, reject) => {
            this.db.get("SELECT datetime('now') as utc_time", (err, row) => {
                if (err) reject(err);
                else resolve(row ? row.utc_time : 'Error');
            });
        });
        console.log(`🌍 SQLite UTC: ${utcResult}`);
        
        // Verificar hora en SQLite Local
        const localResult = await new Promise((resolve, reject) => {
            this.db.get("SELECT datetime('now', 'localtime') as local_time", (err, row) => {
                if (err) reject(err);
                else resolve(row ? row.local_time : 'Error');
            });
        });
        console.log(`🏠 SQLite Local: ${localResult}`);
        
        // Verificar timestamp de última venta
        const recentSale = await new Promise((resolve, reject) => {
            this.db.get("SELECT created_at FROM sales ORDER BY id DESC LIMIT 1", (err, row) => {
                if (err) reject(err);
                else resolve(row ? row.created_at : 'No hay ventas');
            });
        });
        console.log(`🎫 Última venta: ${recentSale}`);
        
        console.log('✅ ===== VERIFICACIÓN COMPLETADA =====\n');
        
    } catch (error) {
        console.error('❌ Error en verificación:', error);
    }
}
}

// Crear instancia singleton
const database = new Database();

module.exports = database;