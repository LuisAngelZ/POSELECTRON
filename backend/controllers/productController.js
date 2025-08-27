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

    // Crear nuevo producto
    static async create(req, res) {
        try {
            const { name, description, price, category_id, stock, image_url } = req.body;

            // Validar datos requeridos
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

            // Validar stock
            if (stock !== undefined && (isNaN(stock) || stock < 0)) {
                return res.status(400).json({
                    success: false,
                    message: 'El stock debe ser un número mayor o igual a 0'
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
                stock: stock ? parseInt(stock) : 0,
                image_url: image_url ? image_url.trim() : null
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
            const { name, description, price, category_id, stock, image_url } = req.body;

            // Verificar que el producto existe
            const existingProduct = await Product.findById(id);
            if (!existingProduct) {
                return res.status(404).json({
                    success: false,
                    message: 'Producto no encontrado'
                });
            }

            // Validar datos requeridos
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

            // Validar stock
            if (stock !== undefined && (isNaN(stock) || stock < 0)) {
                return res.status(400).json({
                    success: false,
                    message: 'El stock debe ser un número mayor o igual a 0'
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

            const updatedProduct = await Product.update(id, {
                name: name.trim(),
                description: description ? description.trim() : null,
                price: parseFloat(price),
                category_id: parseInt(category_id),
                stock: stock !== undefined ? parseInt(stock) : existingProduct.stock,
                image_url: image_url ? image_url.trim() : null
            });

            res.json({
                success: true,
                message: 'Producto actualizado exitosamente',
                product: updatedProduct
            });

        } catch (error) {
            console.error('Error actualizando producto:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
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

    // Actualizar stock - MÉTODO ADICIONAL ÚTIL
    static async updateStock(req, res) {
        try {
            const { id } = req.params;
            const { stock, operation } = req.body; // operation: 'set', 'add', 'subtract'

            // Verificar que el producto existe
            const existingProduct = await Product.findById(id);
            if (!existingProduct) {
                return res.status(404).json({
                    success: false,
                    message: 'Producto no encontrado'
                });
            }

            // Validar stock
            if (stock === undefined || isNaN(stock)) {
                return res.status(400).json({
                    success: false,
                    message: 'El valor de stock es requerido y debe ser numérico'
                });
            }

            let newStock;
            switch (operation) {
                case 'add':
                    newStock = existingProduct.stock + parseInt(stock);
                    break;
                case 'subtract':
                    newStock = existingProduct.stock - parseInt(stock);
                    if (newStock < 0) {
                        return res.status(400).json({
                            success: false,
                            message: 'No hay suficiente stock disponible'
                        });
                    }
                    break;
                case 'set':
                default:
                    newStock = parseInt(stock);
                    break;
            }

            if (newStock < 0) {
                return res.status(400).json({
                    success: false,
                    message: 'El stock no puede ser negativo'
                });
            }

            await Product.updateStock(id, newStock);

            res.json({
                success: true,
                message: 'Stock actualizado exitosamente',
                old_stock: existingProduct.stock,
                new_stock: newStock
            });

        } catch (error) {
            console.error('Error actualizando stock:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    // Obtener productos con stock bajo - MÉTODO ADICIONAL ÚTIL
    static async getLowStock(req, res) {
        try {
            const { threshold = 10 } = req.query; // umbral por defecto: 10
            const products = await Product.findLowStock(parseInt(threshold));

            res.json({
                success: true,
                threshold: parseInt(threshold),
                count: products.length,
                products
            });

        } catch (error) {
            console.error('Error obteniendo productos con stock bajo:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }
}

module.exports = ProductController;