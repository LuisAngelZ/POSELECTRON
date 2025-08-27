// server/routes/products.js - Rutas completas sin stock
const express = require('express');
const router = express.Router();
const ProductController = require('../controllers/productController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Todas las rutas de productos requieren autenticación
router.use(authenticateToken);

// ============================
// RUTAS DE LECTURA (todos los usuarios autenticados)
// ============================

// Obtener todos los productos
// GET /api/products
router.get('/', ProductController.getAll);

// Buscar productos por término
// GET /api/products/search?q=hamburguesa
router.get('/search', ProductController.search);

// Obtener productos por categoría
// GET /api/products/category/1
router.get('/category/:categoryId', ProductController.getByCategory);

// Obtener producto específico por ID
// GET /api/products/5
router.get('/:id', ProductController.getById);

// ============================
// RUTAS DE ESCRITURA (solo administradores)
// ============================

// Crear nuevo producto
// POST /api/products
// Body: { name, description, price, category_id, image_url }
router.post('/', requireAdmin, ProductController.create);

// Actualizar producto existente
// PUT /api/products/5
// Body: { name, description, price, category_id, image_url }
router.put('/:id', requireAdmin, ProductController.update);

// Eliminar producto (soft delete)
// DELETE /api/products/5
router.delete('/:id', requireAdmin, ProductController.delete);

// ============================
// RUTA DE AYUDA
// ============================

// Obtener información sobre las rutas disponibles
router.get('/help', (req, res) => {
    res.json({
        success: true,
        message: 'Rutas de productos disponibles',
        routes: {
            read: [
                {
                    method: 'GET',
                    path: '/api/products',
                    description: 'Obtener todos los productos',
                    auth: 'Usuario autenticado'
                },
                {
                    method: 'GET',
                    path: '/api/products/search?q=término',
                    description: 'Buscar productos por nombre o descripción',
                    auth: 'Usuario autenticado'
                },
                {
                    method: 'GET',
                    path: '/api/products/category/:categoryId',
                    description: 'Obtener productos de una categoría específica',
                    auth: 'Usuario autenticado'
                },
                {
                    method: 'GET',
                    path: '/api/products/:id',
                    description: 'Obtener producto específico por ID',
                    auth: 'Usuario autenticado'
                }
            ],
            write: [
                {
                    method: 'POST',
                    path: '/api/products',
                    description: 'Crear nuevo producto',
                    auth: 'Solo administradores',
                    body: {
                        name: 'string (requerido)',
                        description: 'string (opcional)',
                        price: 'number (requerido)',
                        category_id: 'number (requerido)',
                        image_url: 'string (opcional)'
                    }
                },
                {
                    method: 'PUT',
                    path: '/api/products/:id',
                    description: 'Actualizar producto existente',
                    auth: 'Solo administradores',
                    body: {
                        name: 'string (requerido)',
                        description: 'string (opcional)',
                        price: 'number (requerido)',
                        category_id: 'number (requerido)',
                        image_url: 'string (opcional)'
                    }
                },
                {
                    method: 'DELETE',
                    path: '/api/products/:id',
                    description: 'Eliminar producto (soft delete)',
                    auth: 'Solo administradores'
                }
            ]
        },
        examples: {
            create_product: {
                url: 'POST /api/products',
                headers: {
                    'Authorization': 'Bearer tu_token_jwt',
                    'Content-Type': 'application/json'
                },
                body: {
                    name: 'Pizza Margherita',
                    description: 'Pizza con tomate, mozzarella y albahaca',
                    price: 35.50,
                    category_id: 1,
                    image_url: 'https://ejemplo.com/pizza.jpg'
                }
            },
            search_products: {
                url: 'GET /api/products/search?q=pizza',
                headers: {
                    'Authorization': 'Bearer tu_token_jwt'
                }
            }
        },
        notes: [
            'Todos los precios deben ser números positivos',
            'Las categorías deben existir antes de crear productos',
            'Las imágenes son opcionales',
            'El stock fue removido del sistema',
            'Los productos eliminados se marcan como inactivos (soft delete)'
        ]
    });
});

module.exports = router;