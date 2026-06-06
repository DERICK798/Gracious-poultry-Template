const express = require('express');
const router = express.Router();
const db = require('../config/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const authMiddleware = require('../middleware/auth.middleware');
const adminOnly = require('../middleware/admin.middleware');

// Configure storage for product images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'public/uploads/';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir); 
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// admin routes
// POST /api/products
router.post('/', authMiddleware, adminOnly, upload.fields([{ name: 'image', maxCount: 1 }, { name: 'image2', maxCount: 1 }]), async (req, res) => {
  try {
    // Ensure values are present and not the literal string "null"
    const name = req.body.name === 'null' ? null : req.body.name;
    const category = req.body.category === 'null' ? null : req.body.category;
    const price = req.body.price ? parseFloat(req.body.price) : 0;
    const quantity = req.body.quantity ? parseInt(req.body.quantity) : 0;
    const description = req.body.description || '';
    
    const image = (req.files && req.files['image']) ? req.files['image'][0].filename : null;
    const image2 = (req.files && req.files['image2']) ? req.files['image2'][0].filename : null;

    // Check if product already exists
    const [existing] = await db.promise().query("SELECT id, price FROM product WHERE name = ?", [name]);

    if (existing.length > 0) {
      const product = existing[0];
      const qtyToAdd = parseInt(quantity) || 0;

      let updateQuery = "UPDATE product SET quantity = quantity + ?";
      const updateParams = [qtyToAdd];

      if (price) {
        updateQuery += ", price = ?";
        updateParams.push(price);
      }

      updateQuery += " WHERE id = ?";
      updateParams.push(product.id);

      await db.promise().query(updateQuery, updateParams);
      return res.status(200).json({ message: "Product already exists. Stock and price updated successfully." });
    }

    await db.promise().query(
      "INSERT INTO product (name, category, price, description, image, image2, quantity) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [name, category, price, description, image, image2, quantity]
    );
    res.status(201).json({ message: "Product added successfully" });
  } catch (err) {
    console.error("ADD PRODUCT ERROR:", err);
    res.status(500).json({ message: "Failed to add product" });
  }
});

// PUT /api/products/:id
router.put('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const name = req.body.name === 'null' ? null : req.body.name;
    const category = req.body.category === 'null' ? null : req.body.category;
    const price = req.body.price ? parseFloat(req.body.price) : 0;
    const quantity = req.body.quantity ? parseInt(req.body.quantity) : 0;
    const { description, image, image2 } = req.body;

    await db.promise().query(
      "UPDATE product SET name=?, category=?, price=?, description=?, image=?, image2=?, quantity=? WHERE id=?",
      [name, category, price, description, image, image2, quantity, id]
    );
    res.json({ message: "Product updated successfully" });
  } catch (err) {
    console.error("UPDATE PRODUCT ERROR:", err);
    res.status(500).json({ message: "Failed to update product" });
  }
});

router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    await db.promise().query("DELETE FROM product WHERE id = ?", [id]);
    res.json({ message: "Product deleted successfully" });
  } catch (err) {
    console.error("DELETE PRODUCT ERROR:", err);
    res.status(500).json({ message: "Failed to delete product" });
  }
});

router.get('/', async (req, res) => {
  try {
    // Check if pagination is requested (Admin Dashboard)
    if (req.query.page || req.query.limit) {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;

      const [countRows] = await db.promise().query("SELECT COUNT(*) as total FROM product");
      const total = countRows[0] ? countRows[0].total : 0;
      const totalPages = Math.ceil(total / limit);

      const [products] = await db.promise().query(
        'SELECT * FROM product ORDER BY id DESC LIMIT ? OFFSET ?',
        [limit, offset]
      );

      return res.json({
        data: products,
        page,
        totalPages,
        total
      });
    }

    // No pagination -> Client requesting all products
    const [products] = await db.promise().query("SELECT * FROM product ORDER BY id DESC");
    res.json(products);

  } catch (err) {
    console.error("PRODUCTS LOAD ERROR:", err);
    res.status(500).json({ message: "Failed to load products" });
  }
});

module.exports = router;
