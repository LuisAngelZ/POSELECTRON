// Gestor de cola de impresión
class PrinterQueue {
    constructor() {
        this.queue = [];
        this.processing = false;
        this.retryDelay = 1000; // 1 segundo entre reintentos
        this.maxRetries = 3;
    }

    async addToQueue(printJob) {
        return new Promise((resolve, reject) => {
            this.queue.push({
                job: printJob,
                resolve,
                reject,
                attempts: 0
            });
            
            console.log(`📝 Trabajo de impresión añadido a la cola. Total en cola: ${this.queue.length}`);
            this.processQueue();
        });
    }

    async processQueue() {
        if (this.processing || this.queue.length === 0) {
            return;
        }

        this.processing = true;
        console.log(`🖨️ Procesando cola de impresión (${this.queue.length} trabajos pendientes)`);

        while (this.queue.length > 0) {
            const currentJob = this.queue[0];

            try {
                console.log(`⏳ Intento ${currentJob.attempts + 1}/${this.maxRetries}`);
                await currentJob.job();
                
                console.log('✅ Trabajo de impresión completado');
                currentJob.resolve();
                this.queue.shift();
                
            } catch (error) {
                console.error('❌ Error en trabajo de impresión:', error);
                currentJob.attempts++;

                if (currentJob.attempts >= this.maxRetries) {
                    console.error('❌ Máximo de intentos alcanzado, descartando trabajo');
                    currentJob.reject(new Error(`Fallo después de ${this.maxRetries} intentos: ${error.message}`));
                    this.queue.shift();
                } else {
                    console.log(`⏰ Esperando ${this.retryDelay}ms antes del siguiente intento...`);
                    await new Promise(resolve => setTimeout(resolve, this.retryDelay));
                }
            }
        }

        this.processing = false;
    }

    getQueueStatus() {
        return {
            pending: this.queue.length,
            processing: this.processing,
            jobs: this.queue.map(job => ({
                attempts: job.attempts,
                inProgress: job === this.queue[0] && this.processing
            }))
        };
    }

    clearQueue() {
        const pending = this.queue.length;
        this.queue.forEach(job => {
            job.reject(new Error('Cola de impresión limpiada'));
        });
        this.queue = [];
        this.processing = false;
        return {
            cleared: pending,
            message: `${pending} trabajos de impresión cancelados`
        };
    }
}

module.exports = new PrinterQueue();