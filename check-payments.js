const database = require('./backend/config/database');

async function checkPaymentTypes() {
    try {
        await database.ensureConnected();
        
        database.getDB().all(
            `SELECT payment_type, COUNT(*) as count, 
             MIN(created_at) as first_sale, 
             MAX(created_at) as last_sale
             FROM sales
             GROUP BY payment_type`,
            [],
            (err, rows) => {
                if (err) {
                    console.error('Error:', err);
                    return;
                }
                console.log('\nTipos de pago encontrados:');
                console.log('========================');
                rows.forEach(row => {
                    console.log(`Tipo: ${row.payment_type}`);
                    console.log(`Cantidad: ${row.count}`);
                    console.log(`Primera venta: ${row.first_sale}`);
                    console.log(`Última venta: ${row.last_sale}`);
                    console.log('------------------------');
                });
                process.exit(0);
            }
        );
    } catch (error) {
        console.error('Error conectando:', error);
        process.exit(1);
    }
}

checkPaymentTypes();