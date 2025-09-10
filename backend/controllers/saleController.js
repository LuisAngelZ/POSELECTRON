// server/controllers/saleController.js
const Sale = require('../models/Sale');
const SaleDetail = require('../models/SaleDetail');
const Product = require('../models/Product');

class SaleController {
    // Crear nueva venta
static async create(req, res) {
    try {
        const {
            customer_nit,
            customer_name,
            order_type,
            payment_type,
            table_number,
            observations,
            items,
            paid_amount
        } = req.body;

        // Validaciones existentes...
        if (!order_type || !items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Tipo de pedido e items son requeridos'
            });
        }

        if (!paid_amount || paid_amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Monto pagado debe ser mayor a 0'
            });
        }
        
        if (!payment_type || !['efectivo', 'qr'].includes(payment_type)) {
            return res.status(400).json({
                success: false,
                message: 'Tipo de pago debe ser "efectivo" o "qr"'
            });
        }
        
        if (!['takeaway', 'dine_in'].includes(order_type)) {
            return res.status(400).json({
                success: false,
                message: 'Tipo de pedido debe ser "takeaway" o "dine_in"'
            });
        }

        // Calcular totales y validar productos
        let subtotal = 0;
        const validatedItems = [];

        for (const item of items) {
            if (!item.product_id || !item.quantity || item.quantity <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Cada item debe tener product_id y quantity válidos'
                });
            }

            const product = await Product.findById(item.product_id);
            if (!product) {
                return res.status(400).json({
                    success: false,
                    message: `Producto con ID ${item.product_id} no encontrado`
                });
            }

            const itemSubtotal = product.price * item.quantity;
            subtotal += itemSubtotal;

            validatedItems.push({
                product_id: product.id,
                product_name: product.name,
                quantity: item.quantity,
                unit_price: product.price,
                subtotal: itemSubtotal
            });
        }

        const total = subtotal;
        const change_amount = paid_amount - total;

        if (change_amount < 0) {
            return res.status(400).json({
                success: false,
                message: 'Monto pagado insuficiente'
            });
        }

        // Crear la venta SIN número de ticket por ahora
        const newSale = await Sale.create({
            customer_nit: customer_nit || null,
            customer_name: customer_name || null,
            order_type,
            payment_type,
            table_number: table_number || null,
            observations: observations || null,
            subtotal,
            total,
            paid_amount,
            change_amount,
            user_id: req.user.id
        });

               // ===== LOGS DETALLADOS DE VENTA CREADA =====
        console.log(`🎫 ===== DETALLE DE VENTA CREADA =====`);
        console.log(`👤 Usuario: ${req.user.username} (ID: ${req.user.id})`);
        console.log(`🎫 Ticket asignado: #${newSale.ticket_number}`);
        console.log(`💰 Total: Bs ${total}`);
        console.log(`💳 Método: ${payment_type}`);
        console.log(`📅 Fecha: ${new Date().toLocaleString('es-ES')}`);
        console.log(`👥 Cliente: ${customer_name || 'SIN NOMBRE'}`);
        console.log(`🍽️ Tipo: ${order_type === 'dine_in' ? 'En Mesa' : 'Para Llevar'}`);
        console.log(`🛒 Productos: ${validatedItems.length} items`);
        validatedItems.forEach((item, i) => {
            console.log(`   ${i+1}. ${item.product_name} x${item.quantity} = Bs${item.subtotal}`);
        });
        console.log(`💰 Subtotal: Bs ${subtotal}`);
        console.log(`💵 Pagado: Bs ${paid_amount}`);
        console.log(`💸 Cambio: Bs ${change_amount}`);
        console.log(`🎫 =====================================`);


        // Crear los detalles de la venta
        await SaleDetail.createMultiple(newSale.id, validatedItems);

        // Obtener la venta completa con detalles
        const completeSale = await Sale.findById(newSale.id);
        const saleDetails = await SaleDetail.findBySaleId(newSale.id);

        const saleResponse = {
            ...completeSale,
            daily_ticket_number: newSale.ticket_number, // ✅ Usar el número real del ticket
            details: saleDetails
        };

        res.status(201).json({
            success: true,
            message: `Venta creada exitosamente`,
            sale: saleResponse,
            print_ready: true
        });

    } catch (error) {
        console.error('Error creando venta:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
}
    // Obtener todas las ventas
    static async getAll(req, res) {
        try {
            const { limit = 50 } = req.query;
            const sales = await Sale.findAll(parseInt(limit));
            
            res.json({
                success: true,
                sales
            });

        } catch (error) {
            console.error('Error obteniendo ventas:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    // Obtener venta por ID con detalles
    static async getById(req, res) {
        try {
            const { id } = req.params;
            
            const sale = await Sale.findById(id);
            if (!sale) {
                return res.status(404).json({
                    success: false,
                    message: 'Venta no encontrada'
                });
            }

            const details = await SaleDetail.findBySaleId(id);

            res.json({
                success: true,
                sale: {
                    ...sale,
                    details
                }
            });

        } catch (error) {
            console.error('Error obteniendo venta:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    // Obtener ventas de hoy
    static async getTodaySales(req, res) {
        try {
            const sales = await Sale.getTodaySales();
            const totals = await Sale.getTodayTotals();
            
            res.json({
                success: true,
                today_sales: sales,
                totals: {
                    count: totals.total_sales || 0,
                    amount: totals.total_amount || 0,
                    average: totals.average_sale || 0
                }
            });

        } catch (error) {
            console.error('Error obteniendo ventas de hoy:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    // Obtener ventas por rango de fechas
    static async getByDateRange(req, res) {
        try {
            const { start_date, end_date } = req.query;
            
            if (!start_date || !end_date) {
                return res.status(400).json({
                    success: false,
                    message: 'start_date y end_date son requeridos (formato: YYYY-MM-DD)'
                });
            }

            const sales = await Sale.findByDateRange(start_date, end_date);
            
            // Calcular totales para el rango
            const totalAmount = sales.reduce((sum, sale) => sum + sale.total, 0);
            const averageSale = sales.length > 0 ? totalAmount / sales.length : 0;

            res.json({
                success: true,
                date_range: { start_date, end_date },
                sales,
                totals: {
                    count: sales.length,
                    amount: totalAmount,
                    average: averageSale
                }
            });

        } catch (error) {
            console.error('Error obteniendo ventas por fecha:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    // Obtener ventas por usuario
    static async getByUser(req, res) {
        try {
            const { userId } = req.params;
            const { limit = 50 } = req.query;
            
            // Verificar permisos: solo el mismo usuario o admin
            if (req.user.id !== parseInt(userId) && req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'No tiene permisos para ver estas ventas'
                });
            }

            const sales = await Sale.findByUser(userId, parseInt(limit));
            
            res.json({
                success: true,
                user_id: userId,
                sales
            });

        } catch (error) {
            console.error('Error obteniendo ventas por usuario:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    // Obtener resumen de ventas
    static async getSummary(req, res) {
        try {
            const todayTotals = await Sale.getTodayTotals();
            const monthlyTotals = await Sale.getMonthlyTotals();
            const topProducts = await SaleDetail.getTodayTopProducts(5);
            
            res.json({
                success: true,
                summary: {
                    today: {
                        sales: todayTotals.total_sales || 0,
                        amount: todayTotals.total_amount || 0,
                        average: todayTotals.average_sale || 0
                    },
                    this_month: {
                        sales: monthlyTotals.total_sales || 0,
                        amount: monthlyTotals.total_amount || 0,
                        average: monthlyTotals.average_sale || 0
                    },
                    top_products_today: topProducts
                }
            });

        } catch (error) {
            console.error('Error obteniendo resumen:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }
}

module.exports = SaleController;