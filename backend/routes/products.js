// server/routes/products.js
const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const ProductController = require('../controllers/productController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

router.use(authenticateToken);

// Configuración de subida
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads', 'products')),
  filename: (req, file, cb) => {
    const safe = file.originalname.toLowerCase().replace(/[^a-z0-9.\-_]/g, '');
    cb(null, Date.now() + '-' + safe);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!/image\/(png|jpe?g|gif|webp)/.test(file.mimetype)) {
      return cb(new Error('Formato no permitido (JPG, PNG, GIF, WebP)'));
    }
    cb(null, true);
  }
});

// ===== Rutas de lectura (igual) =====
router.get('/', ProductController.getAll);
router.get('/search', ProductController.search);
router.get('/category/:categoryId', ProductController.getByCategory);
router.get('/:id', ProductController.getById);

// ===== Rutas de escritura: ahora con upload.single('image') =====
router.post('/', requireAdmin, upload.single('image'), ProductController.create);
router.put('/:id', requireAdmin, upload.single('image'), ProductController.update);
router.delete('/:id', requireAdmin, ProductController.delete);

module.exports = router;