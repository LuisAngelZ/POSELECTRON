// server/controllers/productController.js - CRUD Completo
const Product = require('../models/Product');
const Category = require('../models/Category');
const fs = require('fs');
const path = require('path');

class ProductController {

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

            let products = await Product.findByCategory(categoryId);
            // Sanitizar rutas de imagen inexistentes para evitar 404 en POS
            products = products.map(p => {
                if (p.image_url) {
                    const filename = path.basename(p.image_url);
                    const physical = path.join(__dirname, '..', 'uploads', 'products', filename);
                    if (!fs.existsSync(physical)) {
                        p.image_url = null;
                    }
                }
                return p;
            });
            
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
            let product = await Product.findById(id);
            
            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Producto no encontrado'
                });
            }

            // Sanitizar imagen inexistente
            if (product && product.image_url) {
                const filename = path.basename(product.image_url);
                const physical = path.join(__dirname, '..', 'uploads', 'products', filename);
                if (!fs.existsSync(physical)) {
                    product.image_url = null;
                }
            }

            res.json({ success: true, product });

        } catch (error) {
            console.error('Error obteniendo producto:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

   static async getAll(req, res) {
        try {
            let products = await Product.findAll();
            // Sanitizar rutas de imagen inexistentes para evitar 404 en POS
            products = products.map(p => {
                if (p.image_url) {
                    const filename = path.basename(p.image_url);
                    const physical = path.join(__dirname, '..', 'uploads', 'products', filename);
                    if (!fs.existsSync(physical)) {
                        p.image_url = null;
                    }
                }
                return p;
            });

            res.json({ success: true, products });

        } catch (error) {
            console.error('Error obteniendo productos:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

  // server/controllers/productController.js
static async create(req, res) {
  try {
    const { name, description, price, category_id, image_url } = req.body;

    if (!name || !price || !category_id) {
      return res.status(400).json({ success:false, message:'Nombre, precio y categoría son requeridos' });
    }
    if (isNaN(price) || price <= 0) {
      return res.status(400).json({ success:false, message:'El precio debe ser un número mayor a 0' });
    }

    // Construir la URL final de imagen
    const finalImageUrl = req.file
      ? `/uploads/products/${req.file.filename}`
      : (image_url ? image_url.trim() : null);

    const newProduct = await Product.create({
      name: name.trim(),
      description: description ? description.trim() : null,
      price: parseFloat(price),
      category_id: parseInt(category_id),
      image_url: finalImageUrl
    });

    return res.status(201).json({ success:true, message:'Producto creado exitosamente', product:newProduct });
  } catch (error) {
    console.error('Error creando producto:', error);
    return res.status(500).json({ success:false, message:'Error interno del servidor' });
  }
}

static async update(req, res) {
  try {
    const { id } = req.params;
    const { name, description, price, category_id, image_url } = req.body;

    if (!name || !price || !category_id) {
      return res.status(400).json({ success:false, message:'Nombre, precio y categoría son requeridos' });
    }
    if (isNaN(price) || price <= 0) {
      return res.status(400).json({ success:false, message:'El precio debe ser un número mayor a 0' });
    }

    const finalImageUrl = req.file
      ? `/uploads/products/${req.file.filename}`
      : (image_url ? image_url.trim() : null);

    const updated = await Product.update(id, {
      name: name.trim(),
      description: description ? description.trim() : null,
      price: parseFloat(price),
      category_id: parseInt(category_id),
      image_url: finalImageUrl
    });

    return res.json({ success:true, message:'Producto actualizado', product: updated });
  } catch (error) {
    console.error('Error actualizando producto:', error);
    return res.status(500).json({ success:false, message:'Error interno del servidor' });
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