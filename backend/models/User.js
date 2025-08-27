// server/models/User.js - Modelo completo
const database = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
    static async create(userData) {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            const hashedPassword = bcrypt.hashSync(userData.password, 10);
            const sql = `
                INSERT INTO users (username, password, full_name, role)
                VALUES (?, ?, ?, ?)
            `;
            
            database.getDB().run(
                sql,
                [userData.username, hashedPassword, userData.full_name, userData.role || 'user'],
                function(err) {
                    if (err) reject(err);
                    else resolve({ id: this.lastID, ...userData });
                }
            );
        });
    }

    static async findByUsername(username) {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM users WHERE username = ? AND active = 1`;
            
            database.getDB().get(sql, [username], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    static async findById(id) {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM users WHERE id = ? AND active = 1`;
            
            database.getDB().get(sql, [id], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    static async findAll() {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT id, username, full_name, role, active, created_at 
                FROM users 
                ORDER BY created_at DESC
            `;
            
            database.getDB().all(sql, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    static async update(id, userData) {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            let sql = `
                UPDATE users 
                SET username = ?, full_name = ?, role = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `;
            let params = [userData.username, userData.full_name, userData.role, id];

            // Si se proporciona nueva contraseña, incluirla
            if (userData.password) {
                const hashedPassword = bcrypt.hashSync(userData.password, 10);
                sql = `
                    UPDATE users 
                    SET username = ?, password = ?, full_name = ?, role = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                `;
                params = [userData.username, hashedPassword, userData.full_name, userData.role, id];
            }
            
            database.getDB().run(sql, params, function(err) {
                if (err) reject(err);
                else resolve({ id, ...userData });
            });
        });
    }

    static async delete(id) {
        await database.ensureConnected();
        
        return new Promise((resolve, reject) => {
            const sql = `UPDATE users SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
            
            database.getDB().run(sql, [id], function(err) {
                if (err) reject(err);
                else resolve({ deleted: true });
            });
        });
    }

    static async verifyPassword(plainPassword, hashedPassword) {
        return bcrypt.compareSync(plainPassword, hashedPassword);
    }

    static async changePassword(id, oldPassword, newPassword) {
        await database.ensureConnected();
        
        // Primero verificar la contraseña actual
        const user = await this.findById(id);
        if (!user) {
            throw new Error('Usuario no encontrado');
        }

        if (!this.verifyPassword(oldPassword, user.password)) {
            throw new Error('Contraseña actual incorrecta');
        }

        // Actualizar con la nueva contraseña
        return new Promise((resolve, reject) => {
            const hashedPassword = bcrypt.hashSync(newPassword, 10);
            const sql = `
                UPDATE users 
                SET password = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `;
            
            database.getDB().run(sql, [hashedPassword, id], function(err) {
                if (err) reject(err);
                else resolve({ passwordChanged: true });
            });
        });
    }
}

module.exports = User;