// server/controllers/categoryController.js
const Category = require('../models/Category');

class CategoryController {
    // Obtener todas las categorías
    static async getAll(req, res) {
        try {
            const categories = await Category.findAll();
            
            res.json({
                success: true,
                categories
            });

        } catch (error) {
            console.error('Error obteniendo categorías:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    // Obtener categoría por ID
    static async getById(req, res) {
        try {
            const { id } = req.params;
            const category = await Category.findById(id);
            
            if (!category) {
                return res.status(404).json({
                    success: false,
                    message: 'Categoría no encontrada'
                });
            }

            res.json({
                success: true,
                category
            });

        } catch (error) {
            console.error('Error obteniendo categoría:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    // Crear nueva categoría
    static async create(req, res) {
        try {
            const { name, description } = req.body;

            // Validar datos requeridos
            if (!name) {
                return res.status(400).json({
                    success: false,
                    message: 'El nombre de la categoría es requerido'
                });
            }

            // Validar longitud del nombre
            if (name.length > 100) {
                return res.status(400).json({
                    success: false,
                    message: 'El nombre no puede exceder 100 caracteres'
                });
            }

            const newCategory = await Category.create({
                name: name.trim(),
                description: description ? description.trim() : null
            });

            res.status(201).json({
                success: true,
                message: 'Categoría creada exitosamente',
                category: newCategory
            });

        } catch (error) {
            console.error('Error creando categoría:', error);
            
            // Manejar error de nombre duplicado si existe un constraint único
            if (error.message.includes('UNIQUE constraint failed')) {
                return res.status(400).json({
                    success: false,
                    message: 'Ya existe una categoría con ese nombre'
                });
            }

            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    // Actualizar categoría
    static async update(req, res) {
        try {
            const { id } = req.params;
            const { name, description } = req.body;

            // Verificar que la categoría existe
            const existingCategory = await Category.findById(id);
            if (!existingCategory) {
                return res.status(404).json({
                    success: false,
                    message: 'Categoría no encontrada'
                });
            }

            // Validar datos
            if (!name) {
                return res.status(400).json({
                    success: false,
                    message: 'El nombre de la categoría es requerido'
                });
            }

            if (name.length > 100) {
                return res.status(400).json({
                    success: false,
                    message: 'El nombre no puede exceder 100 caracteres'
                });
            }

            const updatedCategory = await Category.update(id, {
                name: name.trim(),
                description: description ? description.trim() : null
            });

            res.json({
                success: true,
                message: 'Categoría actualizada exitosamente',
                category: updatedCategory
            });

        } catch (error) {
            console.error('Error actualizando categoría:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    // Eliminar categoría (soft delete)
    static async delete(req, res) {
        try {
            const { id } = req.params;

            // Verificar que la categoría existe
            const existingCategory = await Category.findById(id);
            if (!existingCategory) {
                return res.status(404).json({
                    success: false,
                    message: 'Categoría no encontrada'
                });
            }

            // TODO: Verificar que no tenga productos asociados
            // const Product = require('../models/Product');
            // const products = await Product.findByCategory(id);
            // if (products.length > 0) {
            //     return res.status(400).json({
            //         success: false,
            //         message: 'No se puede eliminar la categoría porque tiene productos asociados'
            //     });
            // }

            await Category.delete(id);

            res.json({
                success: true,
                message: 'Categoría eliminada exitosamente'
            });

        } catch (error) {
            console.error('Error eliminando categoría:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    // Obtener estadísticas de categorías
    static async getStats(req, res) {
        try {
            const categories = await Category.findAll();
            
            // TODO: Agregar conteo de productos por categoría
            // const Product = require('../models/Product');
            // const categoriesWithStats = await Promise.all(
            //     categories.map(async (category) => {
            //         const products = await Product.findByCategory(category.id);
            //         return {
            //             ...category,
            //             product_count: products.length
            //         };
            //     })
            // );

            res.json({
                success: true,
                stats: {
                    total_categories: categories.length,
                    categories: categories
                }
            });

        } catch (error) {
            console.error('Error obteniendo estadísticas:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }
}

module.exports = CategoryController;