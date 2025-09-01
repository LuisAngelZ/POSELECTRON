// server/controllers/productController.js - CRUD Completo
const Product = require('../models/Product');
const Category = require('../models/Category');

class ProductController {
    // Obtener todos los productos
    static async getAll(req, res) {
        try {
            const products = await Product.findAll();
            
            res.json({
                success: true,
                products
            });

        } catch (error) {
            console.error('Error obteniendo productos:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    // Obtener productos por categoría
    static async getByCategory(req, res) {
        try {
            const { categoryId } = req.params;
            
            // Verificar que la categoría existe
            const category = await Category.findById(categoryId);
            if (!category) {
                return res.status(404).json({
                    success: false,
                    message: 'Categoría no encontrada'
                });
            }

            const products = await Product.findByCategory(categoryId);
            
            res.json({
                success: true,
                category: category.name,
                products
            });

        } catch (error) {
            console.error('Error obteniendo productos por categoría:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    // Obtener producto por ID
    static async getById(req, res) {
        try {
            const { id } = req.params;
            const product = await Product.findById(id);
            
            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Producto no encontrado'
                });
            }

            res.json({
                success: true,
                product
            });

        } catch (error) {
            console.error('Error obteniendo producto:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

 static async create(req, res) {
    try {
        const { name, description, price, category_id, image_url } = req.body;

        // Validar datos requeridos (SIN STOCK)
        if (!name || !price || !category_id) {
            return res.status(400).json({
                success: false,
                message: 'Nombre, precio y categoría son requeridos'
            });
        }

        // Validar precio
        if (isNaN(price) || price <= 0) {
            return res.status(400).json({
                success: false,
                message: 'El precio debe ser un número mayor a 0'
            });
        }

        // Verificar que la categoría existe
        const category = await Category.findById(category_id);
        if (!category) {
            return res.status(400).json({
                success: false,
                message: 'La categoría especificada no existe'
            });
        }

        const newProduct = await Product.create({
            name: name.trim(),
            description: description ? description.trim() : null,
            price: parseFloat(price),
            category_id: parseInt(category_id),
            image_url: image_url ? image_url.trim() : null
            // SIN stock
        });

        res.status(201).json({
            success: true,
            message: 'Producto creado exitosamente',
            product: newProduct
        });

    } catch (error) {
        console.error('Error creando producto:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
}

    // Actualizar producto - NUEVO MÉTODO
 static async update(req, res) {
    try {
        const { id } = req.params;
        const { name, description, price, category_id, image_url } = req.body;

        // LOGGING PARA DEBUG
        console.log('=== ACTUALIZANDO PRODUCTO (SIN STOCK) ===');
        console.log('ID del producto:', id);
        console.log('Datos recibidos:', { name, description, price, category_id, image_url });

        // Verificar que el producto existe
        const existingProduct = await Product.findById(id);
        if (!existingProduct) {
            console.log('Producto no encontrado con ID:', id);
            return res.status(404).json({
                success: false,
                message: 'Producto no encontrado'
            });
        }

        console.log('Producto existente:', existingProduct);

        // Validaciones básicas
        if (!name || name.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'El nombre del producto es requerido'
            });
        }

        if (!price || isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
            return res.status(400).json({
                success: false,
                message: 'El precio debe ser un número mayor a 0'
            });
        }

        if (!category_id || isNaN(parseInt(category_id))) {
            return res.status(400).json({
                success: false,
                message: 'La categoría es requerida'
            });
        }

        // Verificar que la categoría existe
        const category = await Category.findById(category_id);
        if (!category) {
            return res.status(400).json({
                success: false,
                message: 'La categoría especificada no existe'
            });
        }

        // Preparar datos para actualización (SIN STOCK)
        const updateData = {
            name: name.trim(),
            description: description && description.trim() !== '' ? description.trim() : null,
            price: parseFloat(price),
            category_id: parseInt(category_id),
            image_url: image_url && image_url.trim() !== '' ? image_url.trim() : null
        };

        console.log('Datos para actualización:', updateData);

        const updatedProduct = await Product.update(id, updateData);

        console.log('Producto actualizado exitosamente:', updatedProduct);

        res.json({
            success: true,
            message: 'Producto actualizado exitosamente',
            product: updatedProduct
        });

    } catch (error) {
        console.error('ERROR COMPLETO al actualizar producto:', {
            message: error.message,
            stack: error.stack,
            data: req.body
        });
        
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}

    // Eliminar producto (soft delete)
    static async delete(req, res) {
        try {
            const { id } = req.params;

            // Verificar que el producto existe
            const existingProduct = await Product.findById(id);
            if (!existingProduct) {
                return res.status(404).json({
                    success: false,
                    message: 'Producto no encontrado'
                });
            }

            await Product.delete(id);

            res.json({
                success: true,
                message: 'Producto eliminado exitosamente'
            });

        } catch (error) {
            console.error('Error eliminando producto:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    // Búsqueda de productos
    static async search(req, res) {
        try {
            const { q } = req.query; // término de búsqueda
            
            if (!q || q.trim().length < 2) {
                return res.status(400).json({
                    success: false,
                    message: 'El término de búsqueda debe tener al menos 2 caracteres'
                });
            }

            const searchTerm = q.trim();
            const products = await Product.search(searchTerm);

            res.json({
                success: true,
                search_term: q,
                results_count: products.length,
                products
            });

        } catch (error) {
            console.error('Error en búsqueda de productos:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }
}

module.exports = ProductController;