const express = require('express');
const router = express.Router();
const db = require('../config/db'); //  ADD THIS
const productController = require('../controllers/product.controller');
const authMiddleware = require('../middleware/auth.middleware');
const adminOnly = require('../middleware/admin.middleware');

// products (client side)
router.get('/products', productController.getALL);
router.get('/products/:id', productController.getOne);
router.post('/products', authMiddleware, adminOnly, productController.create);
router.put('/products/:id', authMiddleware, adminOnly, productController.updateProduct);
module.exports = router;
