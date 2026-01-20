// Utilidad para manejo consistente de errores
class ErrorHandler {
    static async withTransaction(db, callback) {
        return new Promise(async (resolve, reject) => {
            try {
                await new Promise((res, rej) => {
                    db.run('BEGIN TRANSACTION', (err) => {
                        if (err) rej(err);
                        else res();
                    });
                });

                const result = await callback();

                await new Promise((res, rej) => {
                    db.run('COMMIT', (err) => {
                        if (err) rej(err);
                        else res();
                    });
                });

                resolve(result);
            } catch (error) {
                console.error('❌ Error en transacción:', error);
                
                try {
                    await new Promise((res) => {
                        db.run('ROLLBACK', () => res());
                    });
                } catch (rollbackError) {
                    console.error('❌ Error en rollback:', rollbackError);
                }
                
                reject(error);
            }
        });
    }

    static async retry(operation, maxAttempts = 3, delay = 1000) {
        let lastError;
        
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;
                console.error(`❌ Intento ${attempt}/${maxAttempts} falló:`, error);
                
                if (attempt < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        
        throw lastError;
    }

    static logError(error, context = {}) {
        const errorLog = {
            timestamp: new Date().toISOString(),
            error: {
                message: error.message,
                stack: error.stack,
                name: error.name
            },
            context
        };

        console.error('❌ Error detallado:', JSON.stringify(errorLog, null, 2));
        return errorLog;
    }
}

module.exports = ErrorHandler;